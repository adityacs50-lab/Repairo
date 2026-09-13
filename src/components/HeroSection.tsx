"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="pt-12 md:pt-20 pb-16 md:pb-24 px-6 md:px-12 max-w-[1240px] mx-auto font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        {/* Left Column: Hero Copy & Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="lg:col-span-5 flex flex-col items-start text-left"
        >
          {/* Eyebrow */}
          <div className="mb-4">
            <span className="text-[11px] font-mono font-bold tracking-[0.14em] text-blue-600 uppercase">
              OBJECTIVE REFACTORING
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-[54px] font-bold tracking-tight text-slate-950 leading-[1.06] mb-6">
            When the API<br />
            changes,<br />
            know exactly<br />
            what to repair.
          </h1>

          {/* Subtext with highlight accents */}
          <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed font-normal mb-8 max-w-md">
            Repairo detects{" "}
            <span className="text-blue-600 font-medium underline decoration-blue-200 underline-offset-2">
              breaking third-party API changes
            </span>
            , tracks{" "}
            <span className="text-blue-600 font-medium underline decoration-blue-200 underline-offset-2">
              downstream impact
            </span>{" "}
            on your codebase, and prepares{" "}
            <span className="text-blue-600 font-medium underline decoration-blue-200 underline-offset-2">
              reviewable verified repairs
            </span>
            .
          </p>

          {/* CTA Primary Button */}
          <div className="mb-6">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-[#090d16] hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-full transition-all duration-150 shadow-sm active:scale-[0.98]"
            >
              <span>Book a demo</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            </Link>
          </div>

          {/* Secondary Action Link */}
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-wider text-slate-800 hover:text-blue-600 transition-colors uppercase group"
          >
            <span>SEE THE REPAIR FOR SDK 3.0</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-slate-400 group-hover:text-blue-600" />
          </Link>
        </motion.div>

        {/* Right Column: High-Tech Dark Dashboard Visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
          className="lg:col-span-7 w-full"
        >
          <div className="relative rounded-2xl bg-[#090d16] border border-slate-800/90 shadow-2xl p-5 md:p-6 overflow-hidden text-slate-200">
            {/* Top Bar with window controls & status */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-[11px] text-slate-400 ml-2">AST Node Map // @stripe/stripe-node</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
                  LIVE AST ENGINE
                </span>
              </div>
            </div>

            {/* Central Node Visualizer Canvas */}
            <div className="relative bg-[#0d121f] rounded-xl p-4 border border-slate-800 mb-4 overflow-hidden min-h-[220px]">
              {/* SVG Connecting Flow Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="heroGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="heroGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                {/* Node curves */}
                <path d="M 100 65 C 150 65, 160 38, 220 38" fill="none" stroke="url(#heroGrad1)" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M 100 65 C 150 65, 160 105, 220 105" fill="none" stroke="url(#heroGrad1)" strokeWidth="1.75" />
                <path d="M 100 65 C 150 65, 160 165, 220 165" fill="none" stroke="url(#heroGrad1)" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M 310 105 C 360 105, 370 65, 430 65" fill="none" stroke="url(#heroGrad2)" strokeWidth="1.75" />
                <path d="M 310 105 C 360 105, 370 145, 430 145" fill="none" stroke="url(#heroGrad2)" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>

              {/* 3 Node Columns */}
              <div className="grid grid-cols-3 gap-3 relative z-10">
                {/* Col 1: Upstream Change */}
                <div className="flex flex-col justify-center space-y-2">
                  <div className="p-2.5 rounded-lg bg-blue-950/70 border border-blue-500/40 text-xs">
                    <div className="text-[9px] font-mono text-blue-400 uppercase tracking-wider">Upstream Spec</div>
                    <div className="font-semibold text-white">Stripe v15.0</div>
                    <div className="text-[10px] text-amber-300 mt-1 font-mono">charges.create ⚠️</div>
                  </div>
                </div>

                {/* Col 2: AST Transformer */}
                <div className="flex flex-col justify-between space-y-2">
                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/60 text-[10px]">
                    <div className="text-[8px] font-mono text-slate-400 uppercase">Type Target</div>
                    <div className="font-mono text-amber-300">Stripe.Charges</div>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-950/70 border border-purple-500/50 text-[10px]">
                    <div className="text-[8px] font-mono text-purple-300 uppercase">AST Rewrite</div>
                    <div className="font-mono text-white font-semibold">paymentIntents.create</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/60 text-[10px]">
                    <div className="text-[8px] font-mono text-slate-400 uppercase">Param Remap</div>
                    <div className="font-mono text-slate-300">{`{ confirm: true }`}</div>
                  </div>
                </div>

                {/* Col 3: Downstream Call Sites */}
                <div className="flex flex-col justify-between space-y-2">
                  <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-[10px]">
                    <div className="text-[8px] font-mono text-emerald-400">billing.service.ts</div>
                    <div className="font-mono text-white">L42: paymentIntents</div>
                    <span className="text-[9px] text-emerald-400 font-semibold block mt-0.5">✓ Verified</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-[10px]">
                    <div className="text-[8px] font-mono text-emerald-400">checkout.route.ts</div>
                    <div className="font-mono text-white">L88: paymentIntents</div>
                    <span className="text-[9px] text-emerald-400 font-semibold block mt-0.5">✓ Verified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar Metrics Chart */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[9px] font-mono text-slate-400 uppercase">Impacted AST Nodes</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">14 nodes</div>
                <div className="w-full bg-slate-800 rounded-full h-1 mt-2">
                  <div className="bg-blue-500 h-1 rounded-full w-3/4" />
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[9px] font-mono text-slate-400 uppercase">Type Coverage</div>
                <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">100%</div>
                <div className="w-full bg-slate-800 rounded-full h-1 mt-2">
                  <div className="bg-emerald-400 h-1 rounded-full w-full" />
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[9px] font-mono text-slate-400 uppercase">Compiler Verification</div>
                <div className="text-base font-bold text-blue-400 font-mono mt-0.5">0 errors</div>
                <div className="w-full bg-slate-800 rounded-full h-1 mt-2">
                  <div className="bg-purple-500 h-1 rounded-full w-full" />
                </div>
              </div>
            </div>

            {/* Footer Telemetry Strip */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>24 AST NODES CHECKED</span>
              </div>
              <span>0 RUNTIME DRIFT</span>
              <span className="text-emerald-400 font-semibold">VERIFIED</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
