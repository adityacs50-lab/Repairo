"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { RepairRunResult } from "@/lib/engine/types";
import { PreviewWindow } from "@/components/PreviewWindow";

type Phase = "idle" | "running" | "done" | "error";

function linesFromResult(result: RepairRunResult): string[] {
  const out: string[] = [
    `$ npx repairo-cli scan ./src --vendors stripe`,
    `watching 1 vendor · OpenAPI diff · fixtures/payments-ts`,
    "",
    `from ${result.fromVersion} → ${result.toVersion}`,
    `breaking ${result.summary.breaking} · additive ${result.summary.additive} · impacted files ${result.summary.impactedFiles}`,
    "",
  ];
  for (const c of result.changes.filter((x) => x.severity === "breaking").slice(0, 4)) {
    out.push(`${c.severity.padEnd(9)} ${c.path}${c.field ? ` · ${c.field}` : ""}`);
    if (c.before || c.after) {
      out.push(`  ${c.before ?? "—"} → ${c.after ?? "—"}`);
    }
  }
  out.push("");
  out.push(
    result.typecheck.passed
      ? "tsc --noEmit · passed · repair bundle ready"
      : "tsc --noEmit · needs review",
  );
  out.push("$ npx repairo-cli repair --dry-run");
  out.push(`fixes ${result.summary.safeFixes} safe · ${result.fixes.length} total`);
  return out;
}

export function HomeCliSandbox() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const runId = useRef(0);

  const runScan = useCallback(async () => {
    const id = ++runId.current;
    setPhase("running");
    setVisibleLines(["$ npx repairo-cli scan ./src --vendors stripe", "…"]);
    try {
      const res = await fetch("/api/repair?scenario=payments-ts");
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Demo failed");
      }
      const lines = linesFromResult(data.result as RepairRunResult);
      setVisibleLines([]);
      for (let i = 0; i < lines.length; i++) {
        if (runId.current !== id) return;
        await new Promise((r) => setTimeout(r, lines[i] === "" ? 40 : 55));
        setVisibleLines((prev) => [...prev, lines[i]]);
      }
      if (runId.current === id) setPhase("done");
    } catch {
      if (runId.current === id) {
        setPhase("error");
        setVisibleLines([
          "$ npx repairo-cli scan ./src --vendors stripe",
          "Could not load fixture — try the full demo.",
        ]);
      }
    }
  }, []);

  const terminalText =
    visibleLines.length === 0 && phase === "idle"
      ? "$ npx repairo-cli scan ./src --vendors stripe\n# click Run scan"
      : visibleLines.join("\n");

  return (
    <section className="home-sandbox section-rule" id="sandbox" aria-labelledby="sandbox-title">
      <div className="home-sandbox-head">
        <h2 className="home-sandbox-title" id="sandbox-title">Run a scan in the browser</h2>
        <p className="home-sandbox-lede">
          Same engine as <code>/demo</code> — bundled Stripe-style fixture, no install. Output is
          real repair JSON from the server.
        </p>
        <div className="home-sandbox-actions">
          <button
            type="button"
            className="button button-dark button-small"
            onClick={runScan}
            disabled={phase === "running"}
          >
            {phase === "running" ? "Running…" : phase === "done" ? "Run again" : "Run scan"}
          </button>
          <Link className="text-link" href="/demo">
            Open full workspace <span className="arrow-mark" aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
      <PreviewWindow
        figLabel=">_ [ fig. 2 — live fixture scan ]⌗"
        path="fixtures/payments-ts · scan"
        status={{ label: "LIVE", live: true }}
        footer={
          <>
            <span>no repo access · read-only fixture</span>
            <span>{phase === "done" ? "engine output" : "click Run scan"}</span>
          </>
        }
      >
        <pre className="preview-terminal" aria-live="polite">
          <code>{terminalText}</code>
        </pre>
      </PreviewWindow>
    </section>
  );
}
