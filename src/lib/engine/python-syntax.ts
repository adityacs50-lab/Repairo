import { defaultValueFor } from "./schema-match";

export const PY_LIKE = /\.py$/i;

export const PYTHON_SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".repairo",
  "__pycache__",
  ".venv",
  "venv",
  "site-packages",
]);

export type PyTokenKind =
  | "comment"
  | "string"
  | "identifier"
  | "number"
  | "punct"
  | "newline"
  | "space"
  | "other";

export interface PyToken {
  kind: PyTokenKind;
  text: string;
  start: number;
  end: number;
  /** Unquoted string contents when kind === "string". */
  value?: string;
}

export function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}

export function toCamelCase(name: string): string {
  return name.replace(/_([a-zA-Z])/g, (_, c: string) => c.toUpperCase());
}

export function fieldVariants(name: string): string[] {
  return [...new Set([name, toSnakeCase(name), toCamelCase(name)].filter(Boolean))];
}

export function normalizeFieldName(name: string): string {
  return toSnakeCase(name);
}

export function pythonDefaultFor(
  fieldName: string,
  jsonType: string | undefined,
  source: string,
): string | null {
  const ts = defaultValueFor(fieldName, jsonType);
  if (ts === "undefined") return null;
  if (ts === "crypto.randomUUID()") {
    if (/\b(?:import\s+uuid|from\s+uuid\s+import)\b/.test(source)) {
      return "str(uuid.uuid4())";
    }
    return '""';
  }
  if (ts === "false") return "False";
  if (ts === "true") return "True";
  return ts;
}

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function readString(source: string, i: number): { token: PyToken; next: number } | { error: string } {
  let start = i;
  let prefix = "";
  const two = source.slice(i, i + 2).toLowerCase();
  const one = source[i];
  if (two === "fr" || two === "rf" || two === "br" || two === "rb") {
    prefix = source.slice(i, i + 2);
    i += 2;
  } else if (one && /[rRuUfFbB]/.test(one) && (source[i + 1] === '"' || source[i + 1] === "'")) {
    prefix = one;
    i += 1;
  }

  const quote = source[i];
  if (quote !== '"' && quote !== "'") {
    return { error: `expected string quote at ${start}` };
  }
  const triple = source.slice(i, i + 3) === quote.repeat(3);
  const closer = triple ? quote.repeat(3) : quote;
  i += closer.length;
  let value = "";
  const raw = prefix.toLowerCase().includes("r");

  while (i < source.length) {
    if (source.slice(i, i + closer.length) === closer) {
      const text = source.slice(start, i + closer.length);
      return {
        token: { kind: "string", text, start, end: i + closer.length, value },
        next: i + closer.length,
      };
    }
    const ch = source[i];
    if (!triple && ch === "\n") {
      return { error: `unclosed string starting at ${start}` };
    }
    if (!raw && ch === "\\" && i + 1 < source.length) {
      value += source[i] + source[i + 1];
      i += 2;
      continue;
    }
    value += ch;
    i += 1;
  }
  return { error: `unclosed string starting at ${start}` };
}

export interface TokenizeResult {
  tokens: PyToken[];
  error?: string;
}

function startsStringAt(source: string, i: number): boolean {
  const ch = source[i];
  if (ch === '"' || ch === "'") return true;
  const two = source.slice(i, i + 2).toLowerCase();
  if (["fr", "rf", "br", "rb"].includes(two) && (source[i + 2] === '"' || source[i + 2] === "'")) {
    return true;
  }
  return Boolean(ch && /[rRuUfFbB]/.test(ch) && (source[i + 1] === '"' || source[i + 1] === "'"));
}

export function tokenizePython(source: string): TokenizeResult {
  const tokens: PyToken[] = [];
  let i = 0;

  while (i < source.length) {
    const start = i;
    const ch = source[i];

    if (ch === "#") {
      let j = i + 1;
      while (j < source.length && source[j] !== "\n") j += 1;
      tokens.push({ kind: "comment", text: source.slice(i, j), start: i, end: j });
      i = j;
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

    if (startsStringAt(source, i)) {
      const result = readString(source, i);
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

    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < source.length && /[0-9_.]/.test(source[j])) j += 1;
      tokens.push({ kind: "number", text: source.slice(i, j), start: i, end: j });
      i = j;
      continue;
    }

    const two = source.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "**", "//", ":="].includes(two)) {
      tokens.push({ kind: "punct", text: two, start: i, end: i + 2 });
      i += 2;
      continue;
    }

    tokens.push({ kind: "punct", text: ch, start, end: start + 1 });
    i += 1;
  }

  return { tokens };
}

export function validatePythonSyntax(source: string): { ok: boolean; error?: string } {
  const { tokens, error } = tokenizePython(source);
  if (error) return { ok: false, error };

  const stack: string[] = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  for (const token of tokens) {
    if (token.kind !== "punct") continue;
    if (token.text === "(" || token.text === "[" || token.text === "{") {
      stack.push(token.text);
    } else if (token.text === ")" || token.text === "]" || token.text === "}") {
      const expected = pairs[token.text];
      if (stack.pop() !== expected) {
        return { ok: false, error: `unbalanced ${token.text} at ${token.start}` };
      }
    }
  }
  if (stack.length > 0) {
    return { ok: false, error: `unclosed ${stack[stack.length - 1]}` };
  }
  return { ok: true };
}

export function skipTrivia(tokens: PyToken[], index: number, dir: 1 | -1 = 1): number {
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
