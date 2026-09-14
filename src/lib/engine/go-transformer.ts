import { groupEnumChanges, type AgentEnumResolution } from "./ast-transformer";
import { fieldVariants, normalizeFieldName } from "./field-casing";
import { structurallyMatches } from "./schema-match";
import type { ApiChange, ImpactMatch, SuggestedFix } from "./types";
import { goDefaultFor, skipTrivia, tokenizeGo, type GoToken } from "./go-syntax";

export interface GoTransformResult {
  content: string;
  fixes: SuggestedFix[];
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

interface LiteralKey {
  name: string;
  quoted: boolean;
  tokenIndex: number;
}

interface GoLiteral {
  openIndex: number;
  closeIndex: number;
  keys: LiteralKey[];
}

function setHasField(names: Iterable<string>, field: string): boolean {
  const want = new Set(fieldVariants(field).map(normalizeFieldName));
  for (const name of names) {
    if (want.has(normalizeFieldName(name))) return true;
  }
  return false;
}

function applyEdits(source: string, edits: Edit[]): string {
  const ordered = [...edits].sort((a, b) => b.start - a.start);
  let next = source;
  for (const edit of ordered) {
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  }
  return next;
}

function findMatching(tokens: GoToken[], openIndex: number, open: string, close: string): number {
  let depth = 0;
  for (let i = openIndex; i < tokens.length; i++) {
    const token = tokens[i];
    if (token?.kind !== "punct") continue;
    if (token.text === open) depth += 1;
    else if (token.text === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Finds the leftmost token of the statement immediately preceding `beforeIndex`, stopping at
 * a newline or the enclosing block's own opening "{" (at depth 0). Tracks brace depth rather
 * than stopping at every "}" — a type like `map[string]interface{}` carries its own balanced
 * "{"..."}" pair as part of THIS statement (e.g. `interface{}` before a map literal's own
 * data brace), and walking back over it must not be mistaken for crossing into an unrelated
 * enclosing scope. Deliberately does NOT stop at ";" — a for-loop header
 * (`for i := 0; i < n; i++ {`) is one statement for our purposes, and "for" sits before the
 * first semicolon.
 */
function findStatementStart(tokens: GoToken[], beforeIndex: number): number {
  let i = beforeIndex - 1;
  let last = beforeIndex;
  let depth = 0;
  while (i >= 0) {
    const token = tokens[i];
    if (!token) break;
    if (token.kind === "newline" && depth === 0) break;
    if (token.kind === "punct" && token.text === "}") {
      depth += 1;
    } else if (token.kind === "punct" && token.text === "{") {
      if (depth === 0) break;
      depth -= 1;
    }
    if (token.kind !== "space" && token.kind !== "comment") last = i;
    i -= 1;
  }
  return last;
}

const BLOCK_KEYWORDS = new Set(["if", "for", "switch", "select", "else", "func"]);

/**
 * Walks back over a full `map[K]interface{}` / `[]interface{}` / `[N]interface{}` type
 * expression (given the index of its trailing `}`) and returns the index of whatever token
 * precedes the whole expression — the caller decides what that means. Returns null if the
 * expected chain isn't actually there.
 */
function typeExprPrecedingIndex(tokens: GoToken[], closeBraceIndex: number): number | null {
  const openBrace = skipTrivia(tokens, closeBraceIndex - 1, -1);
  if (tokens[openBrace]?.kind !== "punct" || tokens[openBrace]?.text !== "{") return null;
  const kw = skipTrivia(tokens, openBrace - 1, -1);
  if (tokens[kw]?.kind !== "identifier" || tokens[kw]?.text !== "interface") return null;
  let i = skipTrivia(tokens, kw - 1, -1);
  if (tokens[i]?.kind !== "punct" || tokens[i]?.text !== "]") return null;
  i = skipTrivia(tokens, i - 1, -1);
  // Consume an optional map-key-type or array-size token between the brackets — absent
  // entirely for a plain slice ([]interface{}).
  if (tokens[i]?.kind === "identifier" || tokens[i]?.kind === "number") {
    i = skipTrivia(tokens, i - 1, -1);
  }
  if (tokens[i]?.kind !== "punct" || tokens[i]?.text !== "[") return null;
  i = skipTrivia(tokens, i - 1, -1);
  if (tokens[i]?.kind === "identifier" && tokens[i]?.text === "map") {
    i = skipTrivia(tokens, i - 1, -1);
  }
  return i;
}

/**
 * A `}` immediately before "{" is only ever a composite literal when it closes an
 * `interface{}` type used as a map value, slice element, or array element type
 * (`map[string]interface{}{`, `[]interface{}{`, `[N]interface{}{`) in VALUE position —
 * never when the exact same token chain is a function's declared return type
 * (`func Foo() map[string]interface{} {`), which reads identically right up until what
 * precedes the whole type expression: a function signature's is preceded by the parameter
 * list's closing ")", while a real literal's is preceded by "=", ":=", ",", "(", "return",
 * or another literal's opening "{".
 */
function closesTypedInterfaceLiteral(tokens: GoToken[], closeBraceIndex: number): boolean {
  const precedingIdx = typeExprPrecedingIndex(tokens, closeBraceIndex);
  if (precedingIdx == null) return false;
  const precedingTok = tokens[precedingIdx];
  return !(precedingTok?.kind === "punct" && precedingTok.text === ")");
}

/**
 * Distinguishes a composite literal's opening brace from a block statement's. Go's grammar
 * makes these genuinely ambiguous at the token level in one specific shape — a bare
 * identifier directly before "{" could be `SomeType{` (literal) or `for done {` / `switch x {`
 * (block) — resolved there by checking whether the enclosing statement itself opens with a
 * block keyword. Every other shape is unambiguous. Defaults to "block" (i.e. skip trying to
 * read this as data) whenever the pattern isn't one we can positively identify — a missed
 * literal is a missed opportunity, but misreading a block's statements as literal fields
 * risks a false rewrite, which is the direction we bias away from.
 */
function classifyBrace(tokens: GoToken[], openIndex: number): "literal" | "block" {
  const before = skipTrivia(tokens, openIndex - 1, -1);
  const beforeTok = tokens[before];
  if (!beforeTok) return "block";

  if (beforeTok.kind === "punct" && ["=", ":=", ",", "(", ":", "{"].includes(beforeTok.text)) {
    return "literal";
  }
  if (beforeTok.kind === "punct" && beforeTok.text === ")") {
    return "block";
  }
  if (beforeTok.kind === "punct" && beforeTok.text === "}") {
    return closesTypedInterfaceLiteral(tokens, before) ? "literal" : "block";
  }
  if (beforeTok.kind === "identifier") {
    if (BLOCK_KEYWORDS.has(beforeTok.text)) return "block";
    const stmtStart = findStatementStart(tokens, openIndex);
    const first = tokens[stmtStart];
    if (first?.kind === "identifier" && BLOCK_KEYWORDS.has(first.text)) return "block";
    return "literal";
  }
  return "block";
}

function parseGoLiterals(tokens: GoToken[]): GoLiteral[] {
  const literals: GoLiteral[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]?.kind !== "punct" || tokens[i]?.text !== "{") continue;
    if (classifyBrace(tokens, i) !== "literal") continue;
    const closeIndex = findMatching(tokens, i, "{", "}");
    if (closeIndex < 0) continue;
    const keys: LiteralKey[] = [];
    for (let j = i + 1; j < closeIndex; j++) {
      const token = tokens[j];
      if (!token) continue;
      if (token.kind === "punct" && (token.text === "{" || token.text === "(" || token.text === "[")) {
        const closer = token.text === "{" ? "}" : token.text === "(" ? ")" : "]";
        const match = findMatching(tokens, j, token.text, closer);
        if (match > j) j = match;
        continue;
      }
      if (token.kind !== "string" && token.kind !== "identifier") continue;
      const colon = skipTrivia(tokens, j + 1);
      if (tokens[colon]?.kind !== "punct" || tokens[colon]?.text !== ":") continue;
      keys.push({
        name: token.kind === "string" ? (token.value ?? token.text) : token.text,
        quoted: token.kind === "string",
        tokenIndex: j,
      });
    }
    literals.push({ openIndex: i, closeIndex, keys });
    i = closeIndex;
  }
  return literals;
}

/**
 * Only `map[string]interface{}{...}` / `map[string]any{...}` literals are eligible for a
 * brand-new key to be inserted into — the value type accepts any Go value, so a plain
 * literal default is always well-typed there. A struct literal's fields are fixed by its
 * type declaration elsewhere; inserting a field Go doesn't know about would fail to compile,
 * so struct literals are never insertion targets (see findGoImpacts, which still flags them
 * for manual review instead of silently skipping the change).
 */
/**
 * True when the token immediately before `closeIndex` (skipping trivia) is already a ",".
 * gofmt enforces a trailing comma whenever a composite literal's closing brace sits on its
 * own line, so inserting another leading comma in front of a new key would produce two
 * commas with nothing between them — a syntax error, not merely unconventional style. This
 * must be checked before building any insertion snippet.
 */
function hasTrailingComma(tokens: GoToken[], closeIndex: number): boolean {
  const before = skipTrivia(tokens, closeIndex - 1, -1);
  const tok = tokens[before];
  return tok?.kind === "punct" && tok.text === ",";
}

function isInsertableMapLiteral(tokens: GoToken[], openIndex: number): boolean {
  let i = skipTrivia(tokens, openIndex - 1, -1);
  if (tokens[i]?.kind === "identifier" && tokens[i]?.text === "any") {
    i = skipTrivia(tokens, i - 1, -1);
  } else if (tokens[i]?.kind === "punct" && tokens[i]?.text === "}") {
    const openBrace = skipTrivia(tokens, i - 1, -1);
    if (tokens[openBrace]?.kind !== "punct" || tokens[openBrace]?.text !== "{") return false;
    const kw = skipTrivia(tokens, openBrace - 1, -1);
    if (tokens[kw]?.kind !== "identifier" || tokens[kw]?.text !== "interface") return false;
    i = skipTrivia(tokens, kw - 1, -1);
  } else {
    return false;
  }
  if (tokens[i]?.kind !== "punct" || tokens[i]?.text !== "]") return false;
  i = skipTrivia(tokens, i - 1, -1);
  if (tokens[i]?.kind !== "identifier" || tokens[i]?.text !== "string") return false;
  i = skipTrivia(tokens, i - 1, -1);
  if (tokens[i]?.kind !== "punct" || tokens[i]?.text !== "[") return false;
  i = skipTrivia(tokens, i - 1, -1);
  return tokens[i]?.kind === "identifier" && tokens[i]?.text === "map";
}

/**
 * Same anchoring principle as the Python engine's dictFlowsToCall: a literal's field names
 * matching the API schema isn't enough to trust it's actually that API's payload — require
 * it to actually be used as call data, either inline as an argument or via a variable that's
 * later passed to some call. A `return`ed literal is trusted without further tracing (its
 * caller is, by definition, going to do something with it).
 */
function literalFlowsToCall(tokens: GoToken[], lit: GoLiteral): boolean {
  const stmtStart = findStatementStart(tokens, lit.openIndex);
  const beforeStmt = skipTrivia(tokens, stmtStart - 1, -1);
  const beforeTok = tokens[beforeStmt];
  if (beforeTok?.kind === "punct" && (beforeTok.text === "(" || beforeTok.text === ",")) return true;

  const first = tokens[stmtStart];
  if (first?.kind === "identifier" && first.text === "return") return true;
  if (first?.kind === "identifier") {
    const afterVar = skipTrivia(tokens, stmtStart + 1);
    if (tokens[afterVar]?.kind === "punct" && (tokens[afterVar]?.text === ":=" || tokens[afterVar]?.text === "=")) {
      const varName = first.text;
      for (let i = lit.closeIndex + 1; i < tokens.length; i++) {
        const token = tokens[i];
        if (token?.kind !== "identifier" || token.text !== varName) continue;
        const before = skipTrivia(tokens, i - 1, -1);
        if (tokens[before]?.kind === "punct" && (tokens[before]?.text === "(" || tokens[before]?.text === ",")) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Mirrors the Python engine's bareIdentifierTracesToField: a bare local variable comparison
 * (`status == "queued"`) is the weakest possible evidence the value represents the API's
 * enum field. Trace it back to its nearest `:=`/`=` assignment in the same statement and
 * require the RHS to actually pull the value off a map-index or attribute access keyed by
 * this field; anything else (a literal, a call result, ...) is left unmatched.
 */
function bareIdentifierTracesToField(tokens: GoToken[], identIndex: number, variants: Set<string>): boolean {
  const name = tokens[identIndex]?.text;
  if (!name) return false;
  const WINDOW = 400;
  for (let i = identIndex - 1; i >= 0 && i >= identIndex - WINDOW; i--) {
    const token = tokens[i];
    if (!token) continue;
    if (token.kind === "identifier" && token.text === name) {
      const eq = skipTrivia(tokens, i + 1);
      const eqTok = tokens[eq];
      if (!eqTok || eqTok.kind !== "punct" || (eqTok.text !== "=" && eqTok.text !== ":=")) continue;
      for (let j = eq + 1; j < tokens.length && tokens[j]?.kind !== "newline"; j++) {
        const rhs = tokens[j];
        if (!rhs) continue;
        if (rhs.kind === "string" && variants.has(normalizeFieldName(rhs.value ?? ""))) {
          const before = skipTrivia(tokens, j - 1, -1);
          if (tokens[before]?.kind === "punct" && tokens[before]?.text === "[") return true;
        }
        if (rhs.kind === "identifier" && variants.has(normalizeFieldName(rhs.text))) {
          const before = skipTrivia(tokens, j - 1, -1);
          if (tokens[before]?.kind === "punct" && tokens[before]?.text === ".") return true;
        }
      }
      return false;
    }
  }
  return false;
}

function isWithinAnyLiteral(literals: GoLiteral[], index: number): boolean {
  return literals.some((l) => index > l.openIndex && index < l.closeIndex);
}

function enumFieldContext(
  tokens: GoToken[],
  stringIndex: number,
  field: string | undefined,
  literals: GoLiteral[],
): boolean {
  if (!field) return true;
  const variants = new Set(fieldVariants(field).map(normalizeFieldName));

  const prev = skipTrivia(tokens, stringIndex - 1, -1);
  const prevTok = tokens[prev];
  if (prevTok?.kind === "punct" && (prevTok.text === "==" || prevTok.text === "!=")) {
    const left = skipTrivia(tokens, prev - 1, -1);
    const leftTok = tokens[left];
    if (leftTok?.kind === "identifier" && variants.has(normalizeFieldName(leftTok.text))) {
      const dot = skipTrivia(tokens, left - 1, -1);
      if (tokens[dot]?.kind === "punct" && tokens[dot]?.text === ".") return true;
      return bareIdentifierTracesToField(tokens, left, variants);
    }
    if (leftTok?.kind === "punct" && leftTok.text === "]") {
      const open = skipTrivia(tokens, left - 1, -1);
      const key = tokens[open];
      if (key?.kind === "string" && variants.has(normalizeFieldName(key.value ?? ""))) return true;
    }
  }

  const next = skipTrivia(tokens, stringIndex + 1);
  const nextTok = tokens[next];
  if (nextTok?.kind === "punct" && (nextTok.text === "==" || nextTok.text === "!=")) {
    const right = skipTrivia(tokens, next + 1);
    const rightTok = tokens[right];
    if (rightTok?.kind === "identifier" && variants.has(normalizeFieldName(rightTok.text))) {
      const dot = skipTrivia(tokens, right - 1, -1);
      if (tokens[dot]?.kind === "punct" && tokens[dot]?.text === ".") return true;
      return bareIdentifierTracesToField(tokens, right, variants);
    }
  }

  // Struct/map literal field value: `Status: "queued"` or `"status": "queued"` — only
  // within an actual composite literal, never a labeled statement or switch case that
  // happens to share the same "IDENT :" token shape.
  if (prevTok?.kind === "punct" && prevTok.text === ":" && isWithinAnyLiteral(literals, stringIndex)) {
    const key = skipTrivia(tokens, prev - 1, -1);
    const keyTok = tokens[key];
    const keyName = keyTok?.kind === "string" ? keyTok.value ?? "" : keyTok?.kind === "identifier" ? keyTok.text : "";
    if (variants.has(normalizeFieldName(keyName))) return true;
  }

  return false;
}

/** Rewrites the JSON key inside a struct tag's `json:"..."` segment in place, leaving every
 * other tag key (`xml:"..."`) and option (`,omitempty`) untouched. */
function renameJsonTag(tagValue: string, oldNames: Set<string>, newName: string): string | null {
  const match = /json:"([^",]*)((?:,[^"]*)?)"/.exec(tagValue);
  if (!match) return null;
  const [full, key, options] = match;
  if (!oldNames.has(key) && !oldNames.has(normalizeFieldName(key))) return null;
  const replacement = `json:"${newName}${options}"`;
  return tagValue.slice(0, match.index) + replacement + tagValue.slice(match.index + full.length);
}

export function applyGoTransforms(
  content: string,
  changes: ApiChange[],
  filePath: string = "temp.go",
  _impacts: ImpactMatch[] = [],
  agentResolutions: Map<string, AgentEnumResolution> = new Map(),
): GoTransformResult {
  const lexed = tokenizeGo(content);
  if (lexed.error) {
    return { content, fixes: [] };
  }
  const tokens = lexed.tokens;
  const edits: Edit[] = [];
  const fixes: SuggestedFix[] = [];
  const literals = parseGoLiterals(tokens);
  const { key: enumGroupKey, removedByGroup, addedByGroup } = groupEnumChanges(changes);

  const replaceStringValue = (
    token: GoToken,
    nextValue: string,
    changeId: string,
    description: string,
    notes: string[],
    agent?: AgentEnumResolution,
  ) => {
    const quote = token.raw ? "`" : '"';
    edits.push({ start: token.start, end: token.end, text: `${quote}${nextValue}${quote}` });
    fixes.push({
      changeId,
      file: filePath,
      description,
      before: token.value ?? token.text,
      after: nextValue,
      safe: true,
      safetyNotes: agent
        ? [...notes, `AI-proposed pairing (confidence ${agent.confidence.toFixed(2)}) — spec diff alone was ambiguous; verify against the vendor changelog before merging`]
        : notes,
      ...(agent ? { origin: "agent-proposed" as const, agentConfidence: agent.confidence, agentReasoning: agent.reasoning } : {}),
    });
  };

  for (const change of changes) {
    // Rename an existing map-literal string key, or the JSON name inside a struct tag.
    // Never renames a struct composite literal's bare Go field identifier (e.g. `Status:`)
    // — that identifier's validity is fixed by the struct's type declaration elsewhere,
    // which this engine doesn't have visibility into or authority to change.
    if ((change.kind === "field-removed" || change.kind === "field-added") && change.before && change.after && change.before !== change.after) {
      const oldNames = new Set(fieldVariants(change.before));

      for (const lit of literals) {
        for (const key of lit.keys) {
          if (!key.quoted) continue; // bare identifier => struct field name, out of scope
          if (!oldNames.has(key.name) && !oldNames.has(normalizeFieldName(key.name))) continue;
          const token = tokens[key.tokenIndex];
          if (!token) continue;
          const next = normalizeFieldName(key.name) === key.name ? normalizeFieldName(change.after) : change.after;
          replaceStringValue(token, next, change.id, `Renamed map key "${token.value}" → "${next}"`, [
            "Go map-literal string-key rename",
          ]);
        }
      }

      for (const token of tokens) {
        if (token.kind !== "string" || !token.raw) continue;
        const renamed = renameJsonTag(token.value ?? "", oldNames, change.after);
        if (renamed == null || renamed === token.value) continue;
        edits.push({ start: token.start, end: token.end, text: `\`${renamed}\`` });
        fixes.push({
          changeId: change.id,
          file: filePath,
          description: `Renamed struct tag JSON key "${change.before}" → "${change.after}"`,
          before: token.value ?? token.text,
          after: renamed,
          safe: true,
          safetyNotes: ["Go struct-tag JSON key rewrite — only the json: segment changes, other tag keys/options untouched"],
        });
      }
    }

    if (change.kind === "field-required" && change.field && change.side !== "response") {
      const related = new Set((change.relatedFields ?? []).filter((f) => f !== change.field).map(normalizeFieldName));
      const goValue = goDefaultFor(change.field, change.fieldType);

      for (const lit of literals) {
        const candidate = new Set(lit.keys.map((k) => normalizeFieldName(k.name)));
        if (setHasField(lit.keys.map((k) => k.name), change.field)) continue;
        if (!structurallyMatches(candidate, related)) continue;
        if (!literalFlowsToCall(tokens, lit)) continue;

        if (!isInsertableMapLiteral(tokens, lit.openIndex)) {
          fixes.push({
            changeId: change.id,
            file: filePath,
            description: `Struct literal needs a new "${change.field}" field, but its Go type isn't safely editable by this engine`,
            before: `Missing ${change.field}`,
            after: "(skipped — requires a type declaration change)",
            safe: false,
            safetyNotes: ["Adding a struct field requires editing its type declaration elsewhere — flagged for manual review, not guessed"],
          });
          continue;
        }
        if (goValue == null) {
          fixes.push({
            changeId: change.id,
            file: filePath,
            description: `Required field "${change.field}" has no safe Go default`,
            before: `Missing ${change.field}`,
            after: "(skipped)",
            safe: false,
            safetyNotes: ["No deterministic Go default for this JSON type"],
          });
          continue;
        }
        const insertName = lit.keys.some((k) => k.name.includes("_")) ? normalizeFieldName(change.field) : change.field;
        const sampleQuote = '"';
        // gofmt enforces a trailing comma whenever a composite literal's closing brace is on
        // its own line — the overwhelmingly common shape for a multi-field literal — so a
        // second, unconditional leading comma here would produce a syntax error, not just
        // unconventional style.
        const keyValue = `${sampleQuote}${insertName}${sampleQuote}: ${goValue}`;
        const snippet = hasTrailingComma(tokens, lit.closeIndex) ? keyValue : `, ${keyValue}`;
        const close = tokens[lit.closeIndex];
        if (close) edits.push({ start: close.start, end: close.start, text: snippet });
        fixes.push({
          changeId: change.id,
          file: filePath,
          description: `Add required field "${insertName}" to map literal`,
          before: `Missing ${insertName}`,
          after: `${sampleQuote}${insertName}${sampleQuote}: ${goValue}`,
          safe: true,
          safetyNotes: ["Deterministic Go map-literal key insertion (map[string]interface{}/any only)"],
        });
      }
    }

    if (change.kind === "enum-value-removed" && change.before && change.field) {
      const key = enumGroupKey(change);
      const removedGroup = removedByGroup.get(key) ?? [];
      const addedGroup = addedByGroup.get(key) ?? [];
      const oldVal = change.before;
      const unambiguousTarget =
        change.after ??
        (removedGroup.length === 1 && addedGroup.length === 1 ? addedGroup[0].after : undefined);
      const agentProposal = !unambiguousTarget ? agentResolutions.get(change.id) : undefined;
      const isAgentResolution =
        Boolean(agentProposal) && addedGroup.some((c) => c.after === agentProposal!.target);
      const resolvedTarget = unambiguousTarget ?? (isAgentResolution ? agentProposal!.target : undefined);

      const referenced = tokens.some(
        (token, index) => token.kind === "string" && token.value === oldVal && enumFieldContext(tokens, index, change.field, literals),
      );

      if (resolvedTarget && referenced) {
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (token?.kind !== "string" || token.value !== oldVal) continue;
          if (!enumFieldContext(tokens, i, change.field, literals)) continue;
          replaceStringValue(
            token,
            resolvedTarget,
            change.id,
            `Rename enum value "${oldVal}" → "${resolvedTarget}"`,
            isAgentResolution
              ? ["Go string literal enum update"]
              : ["Go string literal enum update", "Unambiguous 1:1 pairing with the added value"],
            isAgentResolution ? agentProposal : undefined,
          );
        }
      } else if (addedGroup.length > 0 && referenced) {
        fixes.push({
          changeId: change.id,
          file: filePath,
          description: `Enum value "${oldVal}" was removed but ${addedGroup.length} replacement candidates exist (${addedGroup.map((c) => c.after).join(", ")}) — ambiguous, needs manual review`,
          before: `"${oldVal}"`,
          after: "(ambiguous — not auto-applied)",
          safe: false,
          safetyNotes: ["Spec diff alone cannot determine which added value replaces this one"],
        });
      }
    }

    if (change.kind === "server-url-changed" && change.before && change.after) {
      for (const token of tokens) {
        if (token.kind === "string" && token.value?.includes(change.before)) {
          const updated = token.value.split(change.before).join(change.after);
          replaceStringValue(
            token,
            updated,
            change.id,
            `Update API base URL "${change.before}" → "${change.after}"`,
            ["Deterministic URL string update in Go string literal"],
          );
        }
      }
    }
  }

  const next = applyEdits(content, edits);
  return { content: next, fixes };
}

export function findGoImpacts(changes: ApiChange[], filePath: string, content: string): ImpactMatch[] {
  const { tokens, error } = tokenizeGo(content);
  if (error) return [];
  const impacts: ImpactMatch[] = [];
  const lines = content.split(/\r?\n/);
  const posOf = (offset: number) => {
    let line = 1;
    let last = 0;
    for (let i = 0; i < offset; i++) {
      if (content[i] === "\n") {
        line += 1;
        last = i + 1;
      }
    }
    return { line, column: offset - last + 1, snippet: (lines[line - 1] ?? "").trim() };
  };

  const literals = parseGoLiterals(tokens);

  for (const change of changes) {
    if (change.kind === "server-url-changed" && change.before) {
      for (const token of tokens) {
        if (token.kind === "string" && token.value?.includes(change.before)) {
          const pos = posOf(token.start);
          impacts.push({
            file: filePath,
            line: pos.line,
            column: pos.column,
            snippet: pos.snippet,
            symbol: change.before,
            changeId: change.id,
            confidence: "high",
            reason: "Consumer still points at the previous API base URL",
          });
        }
      }
    }

    if ((change.kind === "enum-value-removed" || change.kind === "enum-value-added") && (change.before || change.after)) {
      const value = change.kind === "enum-value-removed" ? change.before : change.after;
      if (!value) continue;
      tokens.forEach((token, index) => {
        if (token.kind !== "string" || token.value !== value) return;
        if (!enumFieldContext(tokens, index, change.field, literals)) return;
        const pos = posOf(token.start);
        impacts.push({
          file: filePath,
          line: pos.line,
          column: pos.column,
          snippet: pos.snippet,
          symbol: value,
          changeId: change.id,
          confidence: change.kind === "enum-value-removed" ? "high" : "low",
          reason:
            change.kind === "enum-value-removed"
              ? `Code references removed enum value "${value}"`
              : `New enum value "${value}" may need handling`,
        });
      });
    }

    if (change.kind === "field-required" && change.field && change.side !== "response") {
      const related = new Set((change.relatedFields ?? []).filter((f) => f !== change.field).map(normalizeFieldName));
      for (const lit of literals) {
        if (setHasField(lit.keys.map((k) => k.name), change.field)) continue;
        const candidate = new Set(lit.keys.map((k) => normalizeFieldName(k.name)));
        if (!structurallyMatches(candidate, related)) continue;
        if (!literalFlowsToCall(tokens, lit)) continue;
        const open = tokens[lit.openIndex];
        const pos = posOf(open?.start ?? 0);
        impacts.push({
          file: filePath,
          line: pos.line,
          column: pos.column,
          snippet: pos.snippet,
          symbol: change.field,
          changeId: change.id,
          confidence: "medium",
          reason: `Call sites must supply newly required field "${change.field}"`,
        });
      }
    }

    if ((change.kind === "field-removed" || change.kind === "type-changed") && change.field) {
      const variants = new Set(fieldVariants(change.field).map(normalizeFieldName));
      for (const token of tokens) {
        if (token.kind === "identifier" && variants.has(normalizeFieldName(token.text))) {
          const pos = posOf(token.start);
          impacts.push({
            file: filePath,
            line: pos.line,
            column: pos.column,
            snippet: pos.snippet,
            symbol: change.field,
            changeId: change.id,
            confidence: "high",
            reason: `References field "${change.field}"`,
          });
        }
        if (token.kind === "string" && variants.has(normalizeFieldName(token.value ?? ""))) {
          const pos = posOf(token.start);
          impacts.push({
            file: filePath,
            line: pos.line,
            column: pos.column,
            snippet: pos.snippet,
            symbol: change.field,
            changeId: change.id,
            confidence: "medium",
            reason: `References field "${change.field}"`,
          });
        }
      }
    }
  }

  return impacts;
}
