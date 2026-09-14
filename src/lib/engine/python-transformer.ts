import { groupEnumChanges, type AgentEnumResolution } from "./ast-transformer";
import { structurallyMatches } from "./schema-match";
import type { ApiChange, ImpactMatch, SuggestedFix } from "./types";
import {
  fieldVariants,
  normalizeFieldName,
  pythonDefaultFor,
  skipTrivia,
  tokenizePython,
  type PyToken,
} from "./python-syntax";

export interface PythonTransformResult {
  content: string;
  fixes: SuggestedFix[];
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

interface DictKey {
  name: string;
  quoted: boolean;
  tokenIndex: number;
}

interface DictLiteral {
  openIndex: number;
  closeIndex: number;
  keys: DictKey[];
}

interface Kwarg {
  name: string;
  nameIndex: number;
}

interface CallSite {
  openIndex: number;
  closeIndex: number;
  kwargs: Kwarg[];
}

function namesMatch(a: string, b: string): boolean {
  return normalizeFieldName(a) === normalizeFieldName(b);
}

function setHasField(names: Iterable<string>, field: string): boolean {
  const want = new Set(fieldVariants(field).map(normalizeFieldName));
  for (const name of names) {
    if (want.has(normalizeFieldName(name))) return true;
  }
  return false;
}

function pickInsertName(existing: string[], field: string): string {
  const snakes = existing.filter((n) => n.includes("_")).length;
  const camels = existing.filter((n) => /[a-z][A-Z]/.test(n)).length;
  if (snakes > camels) return normalizeFieldName(field);
  if (camels > snakes) {
    const camel = fieldVariants(field).find((v) => /[a-z][A-Z]/.test(v) || v === field);
    return camel ?? field;
  }
  return existing.some((n) => n === field) ? field : field.includes("_") ? normalizeFieldName(field) : field;
}

function applyEdits(source: string, edits: Edit[]): string {
  const ordered = [...edits].sort((a, b) => b.start - a.start);
  let next = source;
  for (const edit of ordered) {
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  }
  return next;
}

function findMatching(
  tokens: PyToken[],
  openIndex: number,
  open: string,
  close: string,
): number {
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

function parseDicts(tokens: PyToken[]): DictLiteral[] {
  const dicts: DictLiteral[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]?.kind !== "punct" || tokens[i]?.text !== "{") continue;
    const closeIndex = findMatching(tokens, i, "{", "}");
    if (closeIndex < 0) continue;
    const keys: DictKey[] = [];
    for (let j = i + 1; j < closeIndex; j++) {
      const token = tokens[j];
      if (!token) continue;
      if (token.kind === "punct") {
        if (token.text === "{" || token.text === "(" || token.text === "[") {
          const closer = token.text === "{" ? "}" : token.text === "(" ? ")" : "]";
          const match = findMatching(tokens, j, token.text, closer);
          if (match > j) j = match;
          continue;
        }
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
    dicts.push({ openIndex: i, closeIndex, keys });
    i = closeIndex;
  }
  return dicts;
}

function parseCalls(tokens: PyToken[]): CallSite[] {
  const calls: CallSite[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]?.kind !== "punct" || tokens[i]?.text !== "(") continue;
    const prev = skipTrivia(tokens, i - 1, -1);
    if (tokens[prev]?.kind !== "identifier") continue;
    const closeIndex = findMatching(tokens, i, "(", ")");
    if (closeIndex < 0) continue;
    const kwargs: Kwarg[] = [];
    for (let j = i + 1; j < closeIndex; j++) {
      const token = tokens[j];
      if (!token) continue;
      if (token.kind === "punct" && (token.text === "(" || token.text === "{" || token.text === "[")) {
        const closer = token.text === "(" ? ")" : token.text === "{" ? "}" : "]";
        const match = findMatching(tokens, j, token.text, closer);
        if (match > j) j = match;
        continue;
      }
      if (token.kind !== "identifier") continue;
      const eq = skipTrivia(tokens, j + 1);
      if (tokens[eq]?.kind !== "punct" || tokens[eq]?.text !== "=") continue;
      kwargs.push({ name: token.text, nameIndex: j });
    }
    calls.push({ openIndex: i, closeIndex, kwargs });
  }
  return calls;
}

/**
 * A bare local-variable comparison (`status == "queued"`) is the weakest possible evidence
 * that a string literal represents the API's enum field — plenty of unrelated code binds a
 * local named "status" to something that has nothing to do with this API. Before trusting a
 * bare identifier, trace it back to its most recent assignment in the same statement and
 * require the RHS to actually pull the value off a container keyed/attributed by this field
 * (`x["status"]`, `x.status`, ...) — the same kind of evidence a subscript/attribute
 * comparison already carries on its own. An identifier assigned from a literal, a call
 * result, or anything else is left unmatched rather than guessed.
 */
function bareIdentifierTracesToField(tokens: PyToken[], identIndex: number, variants: Set<string>): boolean {
  const name = tokens[identIndex]?.text;
  if (!name) return false;
  const WINDOW = 400;
  for (let i = identIndex - 1; i >= 0 && i >= identIndex - WINDOW; i--) {
    const token = tokens[i];
    if (!token) continue;
    if (token.kind === "identifier" && token.text === name) {
      const eq = skipTrivia(tokens, i + 1);
      if (tokens[eq]?.kind !== "punct" || tokens[eq]?.text !== "=") continue;
      // Found the nearest preceding assignment to this name — scan its RHS (until the
      // next newline, i.e. the same logical statement) for a subscript or attribute access
      // keyed by this field.
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

function isWithinAnyDict(dicts: DictLiteral[], index: number): boolean {
  return dicts.some((d) => index > d.openIndex && index < d.closeIndex);
}

function kwargNameIndexSet(calls: CallSite[]): Set<number> {
  return new Set(calls.flatMap((c) => c.kwargs.map((k) => k.nameIndex)));
}

function enumFieldContext(
  tokens: PyToken[],
  stringIndex: number,
  field: string | undefined,
  dicts: DictLiteral[],
  kwargNameIndices: Set<number>,
): boolean {
  if (!field) return true;
  const variants = new Set(fieldVariants(field).map(normalizeFieldName));

  const prev = skipTrivia(tokens, stringIndex - 1, -1);
  const prevTok = tokens[prev];
  if (prevTok?.kind === "punct" && (prevTok.text === "==" || prevTok.text === "!=")) {
    const left = skipTrivia(tokens, prev - 1, -1);
    const leftTok = tokens[left];
    if (leftTok?.kind === "identifier" && variants.has(normalizeFieldName(leftTok.text))) {
      // `record.status == "queued"` — an attribute access is anchored to its receiver
      // object exactly like a subscript access is, no tracing needed. Only a truly bare
      // name (nothing but the identifier itself) needs its origin traced.
      const dot = skipTrivia(tokens, left - 1, -1);
      if (tokens[dot]?.kind === "punct" && tokens[dot]?.text === ".") return true;
      return bareIdentifierTracesToField(tokens, left, variants);
    }
    if (leftTok?.kind === "punct" && leftTok.text === "]") {
      const open = skipTrivia(tokens, left - 1, -1);
      const key = tokens[open];
      if (key?.kind === "string" && variants.has(normalizeFieldName(key.value ?? ""))) return true;
      if (key?.kind === "identifier" && variants.has(normalizeFieldName(key.text))) return true;
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

  // dict value: "status": "queued" — only within an actual dict literal, never a type
  // annotation, slice, or lambda parameter that happens to look the same at the token level.
  if (prevTok?.kind === "punct" && prevTok.text === ":" && isWithinAnyDict(dicts, stringIndex)) {
    const key = skipTrivia(tokens, prev - 1, -1);
    const keyTok = tokens[key];
    const keyName = keyTok?.kind === "string" ? keyTok.value ?? "" : keyTok?.kind === "identifier" ? keyTok.text : "";
    if (variants.has(normalizeFieldName(keyName))) return true;
  }

  // kwarg: status="queued" — only a name the call parser actually recognized as a keyword
  // argument, never a plain top-level assignment that happens to match "IDENT = STRING".
  if (prevTok?.kind === "punct" && prevTok.text === "=") {
    const key = skipTrivia(tokens, prev - 1, -1);
    const keyTok = tokens[key];
    if (keyTok?.kind === "identifier" && kwargNameIndices.has(key) && variants.has(normalizeFieldName(keyTok.text))) {
      return true;
    }
  }

  // attribute: record.status == already handled; also .status on the left of nothing
  return false;
}

function quoteKey(name: string, quoted: boolean, sampleQuote: string): string {
  if (!quoted) return name;
  const q = sampleQuote || '"';
  return `${q}${name}${q}`;
}

function insertBeforeClose(source: string, closeToken: PyToken, snippet: string): Edit {
  return { start: closeToken.start, end: closeToken.start, text: snippet };
}

/**
 * A dict's field names matching the API schema's shape is necessary but not sufficient
 * evidence it's actually that API's request payload — plenty of unrelated records (an
 * inventory row, a config block) can coincidentally share several field names. Require the
 * dict to actually be used as call data somewhere: either passed inline as a call argument
 * (`create_shipment({...})`) or assigned to a variable that is later passed to some call
 * (`request = {...}; submit_shipment(request)`). A dict that's just constructed and never
 * flows anywhere is left alone rather than guessed at.
 */
function dictFlowsToCall(tokens: PyToken[], dict: DictLiteral): boolean {
  const beforeOpen = skipTrivia(tokens, dict.openIndex - 1, -1);
  const beforeOpenTok = tokens[beforeOpen];
  if (beforeOpenTok?.kind === "punct" && (beforeOpenTok.text === "(" || beforeOpenTok.text === ",")) {
    return true;
  }

  const eq = beforeOpen;
  if (tokens[eq]?.kind !== "punct" || tokens[eq]?.text !== "=") return false;
  const varIndex = skipTrivia(tokens, eq - 1, -1);
  const varTok = tokens[varIndex];
  if (varTok?.kind !== "identifier") return false;

  for (let i = dict.closeIndex + 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token?.kind !== "identifier" || token.text !== varTok.text) continue;
    const before = skipTrivia(tokens, i - 1, -1);
    const beforeTok = tokens[before];
    if (beforeTok?.kind === "punct" && (beforeTok.text === "(" || beforeTok.text === ",")) return true;
  }
  return false;
}

function dictLooksEmpty(tokens: PyToken[], dict: DictLiteral): boolean {
  for (let i = dict.openIndex + 1; i < dict.closeIndex; i++) {
    const kind = tokens[i]?.kind;
    if (kind && kind !== "space" && kind !== "newline" && kind !== "comment") return false;
  }
  return true;
}

/**
 * True when the token immediately before `closeIndex` (skipping trivia) is already a ",".
 * A trailing comma before a container's closing bracket is common, idiomatic Python style —
 * inserting another leading comma in front of a new key would produce two commas in a row
 * with nothing between them, which is a syntax error, not merely unconventional style. This
 * must be checked before building any insertion snippet.
 */
function hasTrailingComma(tokens: PyToken[], closeIndex: number): boolean {
  const before = skipTrivia(tokens, closeIndex - 1, -1);
  const tok = tokens[before];
  return tok?.kind === "punct" && tok.text === ",";
}

function callHasNonKwargs(tokens: PyToken[], call: CallSite): boolean {
  for (let i = call.openIndex + 1; i < call.closeIndex; i++) {
    const token = tokens[i];
    if (!token) continue;
    if (token.kind === "punct" && (token.text === "(" || token.text === "{" || token.text === "[")) {
      const closer = token.text === "(" ? ")" : token.text === "{" ? "}" : "]";
      const match = findMatching(tokens, i, token.text, closer);
      if (match > i) i = match;
      continue;
    }
    if (token.kind === "space" || token.kind === "newline" || token.kind === "comment" || token.kind === "punct") {
      continue;
    }
    if (token.kind === "identifier") {
      const eq = skipTrivia(tokens, i + 1);
      if (tokens[eq]?.kind === "punct" && tokens[eq]?.text === "=") continue;
    }
    return true;
  }
  return false;
}

export function applyPythonTransforms(
  content: string,
  changes: ApiChange[],
  filePath: string = "temp.py",
  _impacts: ImpactMatch[] = [],
  agentResolutions: Map<string, AgentEnumResolution> = new Map(),
): PythonTransformResult {
  const lexed = tokenizePython(content);
  if (lexed.error) {
    return { content, fixes: [] };
  }
  const tokens = lexed.tokens;
  const edits: Edit[] = [];
  const fixes: SuggestedFix[] = [];
  const dicts = parseDicts(tokens);
  const calls = parseCalls(tokens);
  const kwargNameIndices = kwargNameIndexSet(calls);
  const { key: enumGroupKey, removedByGroup, addedByGroup } = groupEnumChanges(changes);

  const replaceStringValue = (
    token: PyToken,
    nextValue: string,
    changeId: string,
    description: string,
    notes: string[],
    agent?: AgentEnumResolution,
  ) => {
    const q = token.text.includes("'''") || token.text.startsWith("'") || token.text.includes("f'")
      ? token.text.match(/'''|"""|'|"/)?.[0] ?? '"'
      : '"';
    // Preserve original quoting by swapping only the inner value when possible.
    const prefixMatch = token.text.match(/^[rRuUfFbB]{0,2}/);
    const prefix = prefixMatch?.[0] ?? "";
    const body = token.text.slice(prefix.length);
    const triple = body.startsWith('"""') || body.startsWith("'''");
    const quote = triple ? body.slice(0, 3) : body[0] ?? q;
    edits.push({ start: token.start, end: token.end, text: `${prefix}${quote}${nextValue}${quote}` });
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
    if ((change.kind === "field-removed" || change.kind === "field-added") && change.before && change.after && change.before !== change.after) {
      const oldNames = new Set(fieldVariants(change.before));
      const renameTo = (current: string) =>
        current.includes("_") || current === normalizeFieldName(change.before!)
          ? normalizeFieldName(change.after!)
          : change.after!;

      const renameToken = (token: PyToken, next: string, kind: string) => {
        if (token.kind === "string") {
          replaceStringValue(token, next, change.id, `Renamed ${kind} "${token.value}" → "${next}"`, [
            "Python string-key rename",
          ]);
        } else {
          edits.push({ start: token.start, end: token.end, text: next });
          fixes.push({
            changeId: change.id,
            file: filePath,
            description: `Renamed ${kind} "${token.text}" → "${next}"`,
            before: token.text,
            after: next,
            safe: true,
            safetyNotes: ["Python identifier rename preserving surrounding syntax"],
          });
        }
      };

      for (const dict of dicts) {
        for (const key of dict.keys) {
          if (!oldNames.has(key.name) && !oldNames.has(normalizeFieldName(key.name))) continue;
          const token = tokens[key.tokenIndex];
          if (token) renameToken(token, renameTo(key.name), "dict key");
        }
      }
      for (const call of calls) {
        for (const kw of call.kwargs) {
          if (!oldNames.has(kw.name) && !fieldVariants(change.before).includes(kw.name)) continue;
          const token = tokens[kw.nameIndex];
          if (token) renameToken(token, renameTo(kw.name), "keyword");
        }
      }
      tokens.forEach((token, index) => {
        if (token.kind !== "identifier" || !oldNames.has(token.text)) return;
        const prev = skipTrivia(tokens, index - 1, -1);
        if (tokens[prev]?.kind === "punct" && tokens[prev]?.text === ".") {
          renameToken(token, renameTo(token.text), "attribute");
        }
      });
    }

    if (change.kind === "field-required" && change.field && change.side !== "response") {
      const related = new Set((change.relatedFields ?? []).filter((f) => f !== change.field).map(normalizeFieldName));
      const pyValue = pythonDefaultFor(change.field, change.fieldType, content);
      if (pyValue == null) {
        fixes.push({
          changeId: change.id,
          file: filePath,
          description: `Required field "${change.field}" has no safe Python default`,
          before: `Missing ${change.field}`,
          after: "(skipped)",
          safe: false,
          safetyNotes: ["No deterministic Python default for this JSON type"],
        });
      } else {
        for (const dict of dicts) {
          const candidate = new Set(dict.keys.map((k) => normalizeFieldName(k.name)));
          if (setHasField(dict.keys.map((k) => k.name), change.field)) continue;
          if (!structurallyMatches(candidate, related)) continue;
          if (!dictFlowsToCall(tokens, dict)) continue;
          const insertName = pickInsertName(dict.keys.map((k) => k.name), change.field);
          const quoted = dict.keys.some((k) => k.quoted);
          const sample = tokens[dict.keys[0]?.tokenIndex ?? -1];
          const quoteChar = sample?.kind === "string" && sample.text.includes("'") && !sample.text.includes('"') ? "'" : '"';
          const keyText = quoteKey(insertName, quoted || dict.keys.length === 0, quoteChar);
          const empty = dictLooksEmpty(tokens, dict);
          const snippet =
            empty || hasTrailingComma(tokens, dict.closeIndex)
              ? `${keyText}: ${pyValue}`
              : `, ${keyText}: ${pyValue}`;
          const close = tokens[dict.closeIndex];
          if (close) edits.push(insertBeforeClose(content, close, snippet));
          fixes.push({
            changeId: change.id,
            file: filePath,
            description: `Add required field "${insertName}" to dict`,
            before: `Missing ${insertName}`,
            after: `${keyText}: ${pyValue}`,
            safe: true,
            safetyNotes: ["Deterministic Python dict key insertion"],
          });
        }

        for (const call of calls) {
          if (callHasNonKwargs(tokens, call) && call.kwargs.length === 0) continue;
          if (call.kwargs.length === 0) continue;
          const candidate = new Set(call.kwargs.map((k) => normalizeFieldName(k.name)));
          if (setHasField(call.kwargs.map((k) => k.name), change.field)) continue;
          if (!structurallyMatches(candidate, related)) continue;
          const insertName = pickInsertName(call.kwargs.map((k) => k.name), change.field);
          const close = tokens[call.closeIndex];
          const kwSnippet = hasTrailingComma(tokens, call.closeIndex)
            ? `${insertName}=${pyValue}`
            : `, ${insertName}=${pyValue}`;
          if (close) edits.push(insertBeforeClose(content, close, kwSnippet));
          fixes.push({
            changeId: change.id,
            file: filePath,
            description: `Add required keyword "${insertName}"`,
            before: `Missing ${insertName}`,
            after: `${insertName}=${pyValue}`,
            safe: true,
            safetyNotes: ["Deterministic Python keyword argument insertion"],
          });
        }
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
      // Only consult an agent proposal when the spec diff itself couldn't resolve the case,
      // and only trust it if the proposed target is actually one of this group's real
      // candidates — mirrors the same defense-in-depth check in ast-transformer.ts.
      const agentProposal = !unambiguousTarget ? agentResolutions.get(change.id) : undefined;
      const isAgentResolution =
        Boolean(agentProposal) && addedGroup.some((c) => c.after === agentProposal!.target);
      const resolvedTarget = unambiguousTarget ?? (isAgentResolution ? agentProposal!.target : undefined);

      const referenced = tokens.some(
        (token, index) => token.kind === "string" && token.value === oldVal && enumFieldContext(tokens, index, change.field, dicts, kwargNameIndices),
      );

      if (resolvedTarget && referenced) {
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (token?.kind !== "string" || token.value !== oldVal) continue;
          if (!enumFieldContext(tokens, i, change.field, dicts, kwargNameIndices)) continue;
          replaceStringValue(
            token,
            resolvedTarget,
            change.id,
            `Rename enum value "${oldVal}" → "${resolvedTarget}"`,
            isAgentResolution
              ? ["Python string literal enum update"]
              : ["Python string literal enum update", "Unambiguous 1:1 pairing with the added value"],
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
            ["Deterministic URL string update in Python string literal"],
          );
        }
      }
    }
  }

  const next = applyEdits(content, edits);
  return { content: next, fixes };
}

export function findPythonImpacts(changes: ApiChange[], filePath: string, content: string): ImpactMatch[] {
  const { tokens, error } = tokenizePython(content);
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

  const dicts = parseDicts(tokens);
  const calls = parseCalls(tokens);
  const kwargNameIndices = kwargNameIndexSet(calls);

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
        if (!enumFieldContext(tokens, index, change.field, dicts, kwargNameIndices)) return;
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
      for (const dict of dicts) {
        if (setHasField(dict.keys.map((k) => k.name), change.field)) continue;
        const candidate = new Set(dict.keys.map((k) => normalizeFieldName(k.name)));
        if (!structurallyMatches(candidate, related)) continue;
        if (!dictFlowsToCall(tokens, dict)) continue;
        const open = tokens[dict.openIndex];
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
      for (const call of calls) {
        if (call.kwargs.length === 0) continue;
        if (setHasField(call.kwargs.map((k) => k.name), change.field)) continue;
        const candidate = new Set(call.kwargs.map((k) => normalizeFieldName(k.name)));
        if (!structurallyMatches(candidate, related)) continue;
        const open = tokens[call.openIndex];
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
      for (const token of tokens) {
        if (token.kind === "identifier" && namesMatch(token.text, change.field)) {
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
        if (token.kind === "string" && namesMatch(token.value ?? "", change.field)) {
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
