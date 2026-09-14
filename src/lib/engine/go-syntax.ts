import { defaultValueFor } from "./schema-match";
import { checkBalanceAndCommas } from "./bracket-check";

export const GO_LIKE = /\.go$/i;

export const GO_SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".repairo",
  "vendor",
]);

export type GoTokenKind =
  | "comment"
  | "string"
  | "rune"
  | "identifier"
  | "number"
  | "punct"
  | "newline"
  | "space"
  | "other";

export interface GoToken {
  kind: GoTokenKind;
  text: string;
  start: number;
  end: number;
  /** Unescaped contents when kind === "string" (works for both interpreted "..." and raw
   * `...` literals — raw literals never contain escapes to begin with). Absent for "rune". */
  value?: string;
  /** True for a raw `` `...` `` literal — never rewritten in place with escape-processing
   * logic, and never assumed to be able to represent a value containing its own delimiter. */
  raw?: boolean;
}

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function readInterpretedString(source: string, i: number): { token: GoToken; next: number } | { error: string } {
  const start = i;
  i += 1; // opening "
  let value = "";
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"') {
      return { token: { kind: "string", text: source.slice(start, i + 1), start, end: i + 1, value }, next: i + 1 };
    }
    if (ch === "\n") {
      return { error: `unclosed string literal starting at ${start}` };
    }
    if (ch === "\\" && i + 1 < source.length) {
      value += source[i] + source[i + 1];
      i += 2;
      continue;
    }
    value += ch;
    i += 1;
  }
  return { error: `unclosed string literal starting at ${start}` };
}

function readRawString(source: string, i: number): { token: GoToken; next: number } | { error: string } {
  const start = i;
  i += 1; // opening `
  let value = "";
  while (i < source.length) {
    if (source[i] === "`") {
      return {
        token: { kind: "string", text: source.slice(start, i + 1), start, end: i + 1, value, raw: true },
        next: i + 1,
      };
    }
    value += source[i];
    i += 1;
  }
  return { error: `unclosed raw string literal starting at ${start}` };
}

function readRune(source: string, i: number): { token: GoToken; next: number } | { error: string } {
  const start = i;
  i += 1; // opening '
  let value = "";
  while (i < source.length) {
    const ch = source[i];
    if (ch === "'") {
      return { token: { kind: "rune", text: source.slice(start, i + 1), start, end: i + 1, value }, next: i + 1 };
    }
    if (ch === "\n") {
      return { error: `unclosed rune literal starting at ${start}` };
    }
    if (ch === "\\" && i + 1 < source.length) {
      value += source[i] + source[i + 1];
      i += 2;
      continue;
    }
    value += ch;
    i += 1;
  }
  return { error: `unclosed rune literal starting at ${start}` };
}

const MULTI_CHAR_PUNCT = [
  "<<=", ">>=", "&^=", "...",
  "==", "!=", "<=", ">=", ":=", "&&", "||", "<-", "++", "--",
  "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<", ">>", "&^",
];

export interface GoTokenizeResult {
  tokens: GoToken[];
  error?: string;
}

export function tokenizeGo(source: string): GoTokenizeResult {
  const tokens: GoToken[] = [];
  let i = 0;

  while (i < source.length) {
    const start = i;
    const ch = source[i];

    if (ch === "/" && source[i + 1] === "/") {
      let j = i + 2;
      while (j < source.length && source[j] !== "\n") j += 1;
      tokens.push({ kind: "comment", text: source.slice(i, j), start: i, end: j });
      i = j;
      continue;
    }

    if (ch === "/" && source[i + 1] === "*") {
      const close = source.indexOf("*/", i + 2);
      if (close === -1) return { tokens, error: `unclosed block comment starting at ${i}` };
      const end = close + 2;
      tokens.push({ kind: "comment", text: source.slice(i, end), start: i, end });
      i = end;
      continue;
    }

    if (ch === "\n") {
      tokens.push({ kind: "newline", text: "\n", start: i, end: i + 1 });
      i += 1;
      continue;
    }

    if (ch === " " || ch === "\t" || ch === "\r") {
      let j = i + 1;
      while (j < source.length && (source[j] === " " || source[j] === "\t" || source[j] === "\r")) j += 1;
      tokens.push({ kind: "space", text: source.slice(i, j), start: i, end: j });
      i = j;
      continue;
    }

    if (ch === '"') {
      const result = readInterpretedString(source, i);
      if ("error" in result) return { tokens, error: result.error };
      tokens.push(result.token);
      i = result.next;
      continue;
    }

    if (ch === "`") {
      const result = readRawString(source, i);
      if ("error" in result) return { tokens, error: result.error };
      tokens.push(result.token);
      i = result.next;
      continue;
    }

    if (ch === "'") {
      const result = readRune(source, i);
      if ("error" in result) return { tokens, error: result.error };
      tokens.push(result.token);
      i = result.next;
      continue;
    }

    if (isIdentStart(ch)) {
      let j = i + 1;
      while (j < source.length && isIdentPart(source[j])) j += 1;
      tokens.push({ kind: "identifier", text: source.slice(i, j), start: i, end: j });
      i = j;
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(source[i + 1] ?? ""))) {
      let j = i + 1;
      while (j < source.length && /[0-9a-fA-FxXoObB_.]/.test(source[j])) j += 1;
      // Exponent sign, e.g. 1e-10 / 1e+10 — only consume the sign if it directly follows
      // the exponent marker, so we don't swallow an unrelated following operator.
      if ((source[j - 1] === "e" || source[j - 1] === "E") && (source[j] === "+" || source[j] === "-")) {
        j += 1;
        while (j < source.length && /[0-9_]/.test(source[j])) j += 1;
      }
      if (source[j] === "i") j += 1; // imaginary suffix
      tokens.push({ kind: "number", text: source.slice(i, j), start: i, end: j });
      i = j;
      continue;
    }

    const three = source.slice(i, i + 3);
    const two = source.slice(i, i + 2);
    if (MULTI_CHAR_PUNCT.includes(three)) {
      tokens.push({ kind: "punct", text: three, start: i, end: i + 3 });
      i += 3;
      continue;
    }
    if (MULTI_CHAR_PUNCT.includes(two)) {
      tokens.push({ kind: "punct", text: two, start: i, end: i + 2 });
      i += 2;
      continue;
    }

    tokens.push({ kind: "punct", text: ch, start, end: start + 1 });
    i += 1;
  }

  return { tokens };
}

export function validateGoSyntax(source: string): { ok: boolean; error?: string } {
  const { tokens, error } = tokenizeGo(source);
  if (error) return { ok: false, error };
  return checkBalanceAndCommas(tokens);
}

export function skipTrivia(tokens: GoToken[], index: number, dir: 1 | -1 = 1): number {
  let i = index;
  while (i >= 0 && i < tokens.length) {
    const token = tokens[i];
    if (token && (token.kind === "space" || token.kind === "comment" || token.kind === "newline")) {
      i += dir;
      continue;
    }
    return i;
  }
  return i;
}

/**
 * Go has no dynamically-typed literal default the way Python's `""`/`0`/`False` can be
 * inserted anywhere — a value only type-checks if it matches the map's value type (or
 * `interface{}`/`any`, which accepts anything). We only ever insert into
 * `map[string]interface{}` / `map[string]any` literals (see go-transformer.ts), so a
 * plain Go literal is always valid there regardless of the field's JSON type.
 */
export function goDefaultFor(fieldName: string, jsonType: string | undefined): string | null {
  const ts = defaultValueFor(fieldName, jsonType);
  switch (ts) {
    case "undefined":
      return null;
    case "crypto.randomUUID()":
      return '""';
    case "false":
      return "false";
    case "true":
      return "true";
    case "[]":
      return "[]interface{}{}";
    case "{}":
      return "map[string]interface{}{}";
    default:
      return ts;
  }
}
