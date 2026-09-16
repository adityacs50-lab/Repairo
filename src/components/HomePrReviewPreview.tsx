import { PreviewWindow } from "@/components/PreviewWindow";

const DIFF_LINES = [
  { t: "ctx" as const, s: "@@ src/payments/customer.ts @@ " },
  { t: "del" as const, s: "  source: token.id," },
  { t: "add" as const, s: "  payment_method: token.id," },
  {
    t: "add" as const,
    s: "  invoice_settings: { default_payment_method: token.id },",
  },
];

export function HomePrReviewPreview() {
  return (
    <PreviewWindow
      figLabel=">_ [ fig. 5 — github review ]⌗"
      path="PR #184 · fix(stripe): migrate consumer call sites"
      status={{ label: "READY", live: false }}
      footer={
        <>
          <span>+12 −4 · 2 files</span>
          <span>labels: repair · api-drift</span>
        </>
      }
    >
      <div className="preview-pr-summary">
        <p>
          <span className="preview-pr-badge">Detected</span>
          <span className="preview-pr-badge">Generated</span>
          <span className="preview-pr-badge preview-pr-badge--ok">Verified</span>
        </p>
        <p className="preview-pr-hint">You review in GitHub — Repairo does not auto-merge.</p>
      </div>
      <pre className="preview-diff" aria-label="Pull request diff excerpt">
        <code>
          {DIFF_LINES.map((line, i) => (
            <span key={i} className={`diff-line diff-line--${line.t}`}>
              {line.t === "del" ? "− " : line.t === "add" ? "+ " : "  "}
              {line.s}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </PreviewWindow>
  );
}
