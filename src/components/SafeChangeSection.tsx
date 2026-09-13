"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function SafeChangeSection() {
  return (
    <section className="py-16 md:py-24 px-6 md:px-12 max-w-[1240px] mx-auto border-t border-slate-200/80 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 items-center">
        {/* Left Column: Developer Monitor / Workstation Visual */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-6 w-full"
        >
          <div className="relative rounded-2xl bg-[#090d16] border border-slate-800 shadow-2xl p-5 md:p-6 overflow-hidden text-slate-200">
            {/* Monitor Graphic Canvas */}
            <div className="relative bg-[#0d121f] rounded-xl p-5 border border-slate-800/80 mb-4 overflow-hidden min-h-[240px] flex flex-col justify-between">
              {/* Top AST Tree graphic */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                  <span className="text-slate-300">TERMINAL: repairo-verify</span>
                  <span className="text-emerald-400 font-semibold">● RUNTIME READY</span>
                </div>

                <div className="text-blue-400 text-xs font-semibold">
                  $ repairo verify --suite=all --ast-strict
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>[AST] 24 node mutations checked against TypeScript compiler</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>[TYPES] Zero any-casts introduced, strict mode preserved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>[SUITE] 64/64 integration unit tests passing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>[BENCH] Latency overhead: 0.00ms (deterministic rewrite)</span>
                  </div>
                </div>
              </div>

              {/* Progress bar visual */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>Migration Confidence Score</span>
                  <span className="text-emerald-400 font-bold">100 / 100</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full w-full" />
                </div>
              </div>
            </div>

            {/* Bottom Caption Bar */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
              <span className="text-blue-400">repairo engine --verify</span>
              <span className="text-emerald-400 font-semibold">AST validation: passed</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Copy & Verification Pills */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-6 flex flex-col items-start"
        >
          <span className="text-[11px] font-mono font-bold tracking-[0.14em] text-blue-600 uppercase block mb-3">
            VERIFIED EXECUTION &amp; RUNTIME INTEGRITY
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-[38px] font-bold tracking-tight text-slate-950 leading-[1.12] mb-6">
            Make the next safe change, not just the next change.
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed font-normal mb-8 max-w-lg">
            Autonomous code changes without verification create technical debt. Repairo checks every AST mutation against your test suite, validates type signatures, and benchmarks runtime performance before creating a PR.
          </p>

          {/* Verification Badges / Pills matching design */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-mono font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              Type Safe
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Zero Hallucination
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-mono font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
              AST Verified
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-xs font-mono font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
              Tests Pass
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
