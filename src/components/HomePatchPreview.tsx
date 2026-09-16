"use client";

import { useEffect, useState } from "react";
import type { SuggestedFix } from "@/lib/engine/types";
import { PreviewWindow } from "@/components/PreviewWindow";
import { snippetDiff } from "@/lib/simple-line-diff";

const FALLBACK_FIX: SuggestedFix = {
  changeId: "example",
  file: "src/payments/customer.ts",
  description: "Rename deprecated customer.source usage",
  before: `await stripe.customers.create({
  email,
  source: token.id,
});`,
  after: `await stripe.customers.create({
  email,
  payment_method: token.id,
  invoice_settings: { default_payment_method: token.id },
});`,
  safe: true,
  safetyNotes: ["Deterministic AST rewrite"],
};

export function HomePatchPreview() {
  const [fix, setFix] = useState<SuggestedFix>(FALLBACK_FIX);

  useEffect(() => {
    fetch("/api/repair?scenario=payments-ts")
      .then((r) => r.json())
      .then((data) => {
        const fixes = data?.result?.fixes as SuggestedFix[] | undefined;
        const pick = fixes?.find((f) => f.safe && f.before && f.after) ?? fixes?.[0];
        if (pick) setFix(pick);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  const diffLines = snippetDiff(fix.before, fix.after);

  return (
    <section className="home-patch section-rule" id="patch-preview" aria-labelledby="patch-title">
      <div className="section-intro">
        <p className="eyebrow">Patch preview</p>
        <h2 id="patch-title">Before and after on a real call site</h2>
        <p>
          AST-sized edits from the payments fixture — not a whole-file LLM paste. Copy-friendly diff
          below.
        </p>
      </div>
      <PreviewWindow
        figLabel=">_ [ fig. 3 — patch view ]⌗"
        path={fix.file}
        status={{ label: fix.safe ? "SAFE" : "REVIEW", live: false }}
        footer={
          <>
            <span>{fix.description}</span>
            <span>deterministic AST</span>
          </>
        }
      >
        <pre className="preview-diff" aria-label="Code patch diff">
          <code>
            {diffLines.map((line, i) => (
              <span key={i} className={`diff-line diff-line--${line.type}`}>
                {line.type === "del" ? "− " : line.type === "add" ? "+ " : "  "}
                {line.text}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      </PreviewWindow>
    </section>
  );
}
