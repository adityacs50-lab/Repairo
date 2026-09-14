/**
 * Bracket balance alone doesn't catch every syntax error a naive text edit can introduce —
 * notably an "empty element between commas" (`{a: 1,, b: 2}`) or a leading comma right after
 * an opening bracket (`{, a: 1}`), both of which stay perfectly balanced but are syntax
 * errors in every language this engine touches (Python, Go, TS/JS). This exists so an
 * insertion bug of that shape (assuming a container never already has a trailing comma
 * before its closing bracket) fails validation instead of shipping silently, on top of
 * whatever fix addressed the specific bug that first surfaced it — see hasTrailingComma in
 * python-transformer.ts and go-transformer.ts.
 */
export function checkBalanceAndCommas(
  tokens: { kind: string; text: string; start: number }[],
): { ok: boolean; error?: string } {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  let lastSignificant: { text: string; start: number } | null = null;

  for (const token of tokens) {
    if (token.kind === "space" || token.kind === "newline" || token.kind === "comment") continue;
    if (token.kind === "punct" && token.text === ",") {
      if (
        lastSignificant?.text === "," ||
        (lastSignificant && ["(", "[", "{"].includes(lastSignificant.text))
      ) {
        return { ok: false, error: `empty element next to "," at ${token.start}` };
      }
    }
    if (token.kind === "punct") {
      if (token.text === "(" || token.text === "[" || token.text === "{") {
        stack.push(token.text);
      } else if (token.text === ")" || token.text === "]" || token.text === "}") {
        const expected = pairs[token.text];
        if (stack.pop() !== expected) {
          return { ok: false, error: `unbalanced ${token.text} at ${token.start}` };
        }
      }
    }
    lastSignificant = token;
  }
  if (stack.length > 0) {
    return { ok: false, error: `unclosed ${stack[stack.length - 1]}` };
  }
  return { ok: true };
}
