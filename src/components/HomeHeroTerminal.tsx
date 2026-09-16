"use client";

import { motion } from "framer-motion";
import { PreviewWindow } from "@/components/PreviewWindow";

const HERO_CLI = `$ npx repairo-cli scan ./src --vendors stripe,openai
watching 2 vendors · OpenAPI diff · TS + Python impact

stripe   breaking  high   src/payments/customer.ts:42
  customer.source → removed in 2024-06-20
stripe   breaking  high   src/shipments_client.py:9
  status "queued" → "pending"

2 call sites · verified repair ready
$ npx repairo-cli repair --open-pr
opened PR #184  fix(stripe): migrate consumer call sites`;

export function HomeHeroTerminal() {
  return (
    <div className="hero-art-wrap warp-figure">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <PreviewWindow
          figLabel=">_ [ fig. 1 — scan + repair ]⌗"
          path="repairo-cli · scan + repair"
          status={{ label: "FIXTURE", live: true }}
          footer={
            <>
              <span>cli · example output</span>
              <span>ts + python · pass</span>
            </>
          }
        >
          <pre className="preview-terminal" aria-label="Example Repairo CLI output">
            <code>{HERO_CLI}</code>
          </pre>
        </PreviewWindow>
      </motion.div>
    </div>
  );
}
