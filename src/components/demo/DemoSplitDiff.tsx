"use client";

import { snippetDiff } from "@/lib/simple-line-diff";

type DemoSplitDiffProps = {
  file: string;
  before: string;
  after: string;
  description?: string;
};

/** GitHub-style before (red) / after (green) for marketing demo — not raw .patch output. */
export function DemoSplitDiff({ file, before, after, description }: DemoSplitDiffProps) {
  const lines = snippetDiff(before, after);
  const delLines = lines.filter((l) => l.type === "del");
  const addLines = lines.filter((l) => l.type === "add");

  return (
    <div className="demo-split-diff">
      <div className="demo-split-diff__header">
        <p className="font-mono text-xs text-zinc-400">{file}</p>
        {description ? <p className="text-sm text-zinc-300">{description}</p> : null}
      </div>
      <div className="demo-split-diff__panes">
        <div className="demo-split-diff__pane demo-split-diff__pane--before">
          <p className="demo-split-diff__label">Before</p>
          <pre className="demo-split-diff__code">
            <code>
              {delLines.length > 0
                ? delLines.map((line, i) => (
                    <span key={i} className="block text-red-300/95">
                      − {line.text}
                    </span>
                  ))
                : <span className="text-zinc-500">—</span>}
            </code>
          </pre>
        </div>
        <div className="demo-split-diff__pane demo-split-diff__pane--after">
          <p className="demo-split-diff__label">After</p>
          <pre className="demo-split-diff__code">
            <code>
              {addLines.length > 0
                ? addLines.map((line, i) => (
                    <span key={i} className="block text-emerald-300/95">
                      + {line.text}
                    </span>
                  ))
                : <span className="text-zinc-500">—</span>}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
