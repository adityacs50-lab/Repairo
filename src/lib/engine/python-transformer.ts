import { groupEnumChanges } from "./ast-transformer";
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

function enumFieldContext(tokens: PyToken[], stringIndex: number, field: string | undefined): boolean {
  if (!field) return true;
  const variants = new Set(fieldVariants(field).map(normalizeFieldName));

  const prev = skipTrivia(tokens, stringIndex - 1, -1);
  const prevTok = tokens[prev];
  if (prevTok?.kind === "punct" && (prevTok.text === "==" || prevTok.text === "!=")) {
    const left = skipTrivia(tokens, prev - 1, -1);
    const leftTok = tokens[left];
    if (leftTok?.kind === "identifier" && variants.has(normalizeFieldName(leftTok.text))) return true;
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
    if (rightTok?.kind === "identifier" && variants.has(normalizeFieldName(rightTok.text))) return true;
  }

  // dict value: "status": "queued"
  if (prevTok?.kind === "punct" && prevTok.text === ":") {
    const key = skipTrivia(tokens, prev - 1, -1);
    const keyTok = tokens[key];
    const keyName = keyTok?.kind === "string" ? keyTok.value ?? "" : keyTok?.kind === "identifier" ? keyTok.text : "";
    if (variants.has(normalizeFieldName(keyName))) return true;
  }

  // kwarg: status="queued"
  if (prevTok?.kind === "punct" && prevTok.text === "=") {
    const key = skipTrivia(tokens, prev - 1, -1);
    const keyTok = tokens[key];
    if (keyTok?.kind === "identifier" && variants.has(normalizeFieldName(keyTok.text))) return true;
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

function dictLooksEmpty(tokens: PyToken[], dict: DictLiteral): boolean {
  for (let i = dict.openIndex + 1; i < dict.closeIndex; i++) {
    const kind = tokens[i]?.kind;
    if (kind && kind !== "space" && kind !== "newline" && kind !== "comment") return false;
  }
  return true;
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
  const { key: enumGroupKey, removedByGroup, addedByGroup } = groupEnumChanges(changes);

  const replaceStringValue = (token: PyToken, nextValue: string, changeId: string, description: string, notes: string[]) => {
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
      safetyNotes: notes,
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
          const insertName = pickInsertName(dict.keys.map((k) => k.name), change.field);
          const quoted = dict.keys.some((k) => k.quoted);
          const sample = tokens[dict.keys[0]?.tokenIndex ?? -1];
          const quoteChar = sample?.kind === "string" && sample.text.includes("'") && !sample.text.includes('"') ? "'" : '"';
          const keyText = quoteKey(insertName, quoted || dict.keys.length === 0, quoteChar);
          const empty = dictLooksEmpty(tokens, dict);
          const snippet = empty ? `${keyText}: ${pyValue}` : `, ${keyText}: ${pyValue}`;
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
          if (close) edits.push(insertBeforeClose(content, close, `, ${insertName}=${pyValue}`));
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

      const referenced = tokens.some(
        (token, index) => token.kind === "string" && token.value === oldVal && enumFieldContext(tokens, index, change.field),
      );

      if (unambiguousTarget && referenced) {
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (token?.kind !== "string" || token.value !== oldVal) continue;
          if (!enumFieldContext(tokens, i, change.field)) continue;
          replaceStringValue(
            token,
            unambiguousTarget,
            change.id,
            `Rename enum value "${oldVal}" → "${unambiguousTarget}"`,
            ["Python string literal enum update", "Unambiguous 1:1 pairing with the added value"],
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
        if (!enumFieldContext(tokens, index, change.field)) return;
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
