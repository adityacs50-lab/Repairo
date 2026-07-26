"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Living silver/graphite atmosphere for the landing hero. */
export function MotionGradients() {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[110vh] overflow-hidden" aria-hidden>
        <div className="grad-mesh absolute inset-0 opacity-70" />
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[110vh] overflow-hidden"
      aria-hidden
    >
      <div className="grad-mesh absolute inset-0" />

      <motion.div
        className="grad-orb grad-orb--a"
        animate={{
          x: ["-8%", "12%", "-4%", "-8%"],
          y: ["0%", "14%", "-6%", "0%"],
          scale: [1, 1.18, 0.92, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="grad-orb grad-orb--b"
        animate={{
          x: ["10%", "-14%", "6%", "10%"],
          y: ["-6%", "10%", "4%", "-6%"],
          scale: [1.05, 0.88, 1.2, 1.05],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="grad-orb grad-orb--c"
        animate={{
          x: ["0%", "8%", "-10%", "0%"],
          y: ["8%", "-12%", "2%", "8%"],
          scale: [0.95, 1.15, 1, 0.95],
          opacity: [0.45, 0.7, 0.5, 0.45],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="aurora-band" />
      <div className="grain-veil" />
    </div>
  );
}
