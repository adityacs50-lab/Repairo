"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export function FinalCta() {
  return (
    <section className="w-full px-6 md:px-12 max-w-7xl mx-auto py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="bg-[#09090b] border border-neutral-800 rounded-3xl p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl flex flex-col items-center justify-center"
      >
        {/* Subtle radial line overlay */}
        <div className="absolute inset-0 radial-pattern-bg opacity-40 pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          <div className="font-mono text-xs uppercase tracking-widest text-neutral-400 mb-4">
            READY TO AUTOMATE YOUR MAINTENANCE?
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold text-white tracking-tight leading-tight mb-8">
            Stop breaking production.<br />
            Start repairing it.
          </h2>

          <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              href="/app"
              className="relative inline-flex items-center gap-2 bg-white text-black font-semibold text-sm px-6 py-3 rounded-full hover:bg-neutral-200 transition-colors mb-4 group overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>Start for free</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </span>
              {/* Glossy Sheen Light Sweep on Hover */}
              <div className="absolute inset-0 z-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)] transition-transform">
                <div className="relative h-full w-[24px] bg-black/10" />
              </div>
            </Link>
          </motion.div>

          <p className="text-xs text-neutral-400">
            No credit card required. Connect GitHub and go.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
