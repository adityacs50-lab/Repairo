export type DiffLine = { type: "del" | "add" | "ctx"; text: string };

/** Small-snippet diff for marketing (not a full Myers diff). */
export function snippetDiff(before: string, after: string): DiffLine[] {
  const bLines = before.trimEnd().split("\n");
  const aLines = after.trimEnd().split("\n");
  const out: DiffLine[] = [{ type: "ctx", text: "@@ call site @@ " }];

  for (const line of bLines) {
    out.push({ type: "del", text: line });
  }
  for (const line of aLines) {
    out.push({ type: "add", text: line });
  }
  return out;
}
