"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PixelCluster } from "@/components/Motion";

export function HeroVisual() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="grad-border relative mt-16 w-full max-w-3xl border border-line bg-bg-panel/85 backdrop-blur-sm"
      initial={reduce ? false : { opacity: 0, y: 36 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <motion.span
          className="h-2.5 w-2.5 bg-line-strong"
          animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="h-2.5 w-2.5 bg-line-strong" />
        <span className="h-2.5 w-2.5 bg-line-strong" />
        <span className="ml-3 font-mono text-[11px] text-muted-dim">
          repair pipeline · payments v1 → v2
        </span>
      </div>
      <div className="grid gap-0 md:grid-cols-3">
        {[
          { title: "Detect", meta: "11 breaking", tone: "text-warn" },
          { title: "Impact", meta: "2 files mapped", tone: "text-fg" },
          { title: "Safe PR", meta: "score 87", tone: "text-safe" },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            className="border-t border-line px-4 py-5 md:border-t-0 md:border-r md:last:border-r-0"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
          >
            <p className="text-xs uppercase tracking-[0.16em] text-muted-dim">
              {card.title}
            </p>
            <p className={`mt-3 font-mono text-sm ${card.tone}`}>{card.meta}</p>
          </motion.div>
        ))}
      </div>
      <div className="overflow-hidden border-t border-line px-4 py-4 font-mono text-xs leading-relaxed text-muted">
        {[
          "+ idempotencyKey required",
          "~ pending → processing",
          "~ base URL /v1 → /v2",
          "✓ draft PR opened · auto-merge eligible",
        ].map((line, i) => (
          <motion.p
            key={line}
            className={i === 3 ? "mt-2 text-safe" : undefined}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.45 + i * 0.12, duration: 0.4 }}
          >
            {line}
          </motion.p>
        ))}
      </div>
      <PixelCluster className="-right-3 -top-3" />
    </motion.div>
  );
}
