"use client";

import React from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animationVariants";
import { Spotlight } from "@/components/ui/spotlight";

export function HowItWorks() {
  return (
    <section className="w-full py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto border-t border-hairline">
      {/* Eyebrow and Title */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-16"
      >
        <div className="font-mono text-xs uppercase tracking-wider text-charcoal mb-2">
          PIPELINE
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium font-display text-ink tracking-tight">
          How Repairo works.
        </h2>
      </motion.div>

      {/* 4 Pipeline Steps Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative"
      >
        {/* Step 01 */}
        <motion.div variants={itemVariants} className="flex flex-col justify-between group">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full border border-hairline flex items-center justify-center font-mono font-semibold text-sm text-ink bg-surface-elevated shadow-inner shadow-canvas/50 group-hover:bg-body transition-colors">
                01
              </div>
              <div className="h-[1px] bg-hairline-strong flex-1 hidden lg:block opacity-50" />
            </div>
            <h3 className="text-base font-medium text-ink mb-2">Detect drift</h3>
            <p className="text-xs text-mute leading-relaxed mb-6">
              We diff the OpenAPI specs of your dependencies every time they release. When a breaking change is found, we catch it instantly.
            </p>
          </div>

          {/* Graphic Box */}
          <div className="relative bg-surface-elevated border border-hairline rounded-xl p-4 flex items-center justify-center gap-3 group-hover:border-hairline-strong shadow-inner shadow-canvas/50 transition-all overflow-hidden">
            <Spotlight className="from-zinc-200/40 via-zinc-200/10 to-transparent blur-2xl" size={200} />
            <div className="relative z-10 w-full flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-lg border border-hairline bg-surface-deep flex items-center justify-center text-charcoal">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-charcoal" />
            <div className="w-6 h-6 rounded-full border border-hairline-strong bg-surface-deep" />
            <span className="w-1.5 h-1.5 rounded-full bg-charcoal" />
            <div className="w-8 h-8 rounded-lg border border-hairline bg-ink text-primary-on flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 00-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            </div>
          </div>
        </motion.div>

        {/* Step 02 */}
        <motion.div variants={itemVariants} className="flex flex-col justify-between group">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full border border-hairline flex items-center justify-center font-mono font-semibold text-sm text-ink bg-surface-elevated shadow-inner shadow-canvas/50 group-hover:bg-body transition-colors">
                02
              </div>
              <div className="h-[1px] bg-hairline-strong flex-1 hidden lg:block opacity-50" />
            </div>
            <h3 className="text-base font-medium text-ink mb-2">Map impact</h3>
            <p className="text-xs text-mute leading-relaxed mb-6">
              Repairo scans your codebase. We find exactly where the API was called, what types changed, and trace the full impact.
            </p>
          </div>

          {/* Graphic Box */}
          <div className="relative bg-surface-elevated border border-hairline rounded-xl p-3.5 space-y-1.5 text-xs group-hover:border-hairline-strong shadow-inner shadow-canvas/50 transition-all overflow-hidden">
            <Spotlight className="from-zinc-200/40 via-zinc-200/10 to-transparent blur-2xl" size={200} />
            <div className="relative z-10 space-y-1.5 w-full">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-mute font-mono">
                <span className="w-3 h-3 rounded bg-surface-deep border border-hairline flex items-center justify-center text-[8px] font-sans">@</span>
                payments.ts
              </span>
              <span className="font-medium text-ink">4</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-mute font-mono">
                <span className="w-3 h-3 rounded bg-surface-deep border border-hairline flex items-center justify-center text-[8px] font-sans">@</span>
                stripe.d.ts
              </span>
              <span className="font-medium text-ink">3</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-mute font-mono">
                <span className="w-3 h-3 rounded bg-surface-deep border border-hairline flex items-center justify-center text-[8px] font-sans">@</span>
                customers.ts
              </span>
              <span className="font-medium text-ink">2</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-mute font-mono">
                <span className="w-3 h-3 rounded bg-surface-deep border border-hairline flex items-center justify-center text-[8px] font-sans">@</span>
                helpers.ts
              </span>
              <span className="font-medium text-ink">2</span>
            </div>
            </div>
          </div>
        </motion.div>

        {/* Step 03 */}
        <motion.div variants={itemVariants} className="flex flex-col justify-between group">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full border border-hairline flex items-center justify-center font-mono font-semibold text-sm text-ink bg-surface-elevated shadow-inner shadow-canvas/50 group-hover:bg-body transition-colors">
                03
              </div>
              <div className="h-[1px] bg-hairline-strong flex-1 hidden lg:block opacity-50" />
            </div>
            <h3 className="text-base font-medium text-ink mb-2">Apply patch</h3>
            <p className="text-xs text-mute leading-relaxed mb-6">
              We generate the necessary code changes and open a clean, reviewable Pull Request.
            </p>
          </div>

          {/* Graphic Box */}
          <div className="relative bg-surface-elevated border border-hairline rounded-xl p-4 flex gap-3 items-center justify-center group-hover:border-hairline-strong shadow-inner shadow-canvas/50 transition-all overflow-hidden">
            <Spotlight className="from-zinc-200/40 via-zinc-200/10 to-transparent blur-2xl" size={200} />
            <div className="relative z-10 w-full flex gap-3 items-center justify-center">
            <div className="bg-canvas border border-hairline rounded-lg p-2.5 space-y-1.5 flex-1 shadow-2xs">
              <div className="w-full h-1.5 bg-rose-500/50 rounded" />
              <div className="w-3/4 h-1.5 bg-emerald-500/50 rounded" />
              <div className="w-5/6 h-1.5 bg-emerald-500/50 rounded" />
            </div>
            <div className="bg-canvas border border-hairline rounded-lg p-2.5 space-y-1.5 flex-1 shadow-2xs">
              <div className="w-full h-1.5 bg-rose-500/50 rounded" />
              <div className="w-2/3 h-1.5 bg-emerald-500/50 rounded" />
              <div className="w-4/5 h-1.5 bg-emerald-500/50 rounded" />
            </div>
            </div>
          </div>
        </motion.div>

        {/* Step 04 */}
        <motion.div variants={itemVariants} className="flex flex-col justify-between group">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full border border-hairline flex items-center justify-center font-mono font-semibold text-sm text-ink bg-surface-elevated shadow-inner shadow-canvas/50 group-hover:bg-body transition-colors">
                04
              </div>
            </div>
            <h3 className="text-base font-medium text-ink mb-2">Pull Request</h3>
            <p className="text-xs text-mute leading-relaxed mb-6">
              Providers announce, Repairo patches.
            </p>
          </div>

          {/* Graphic Box */}
          <div className="relative bg-surface-elevated border border-hairline rounded-xl p-4 flex items-center justify-between shadow-inner shadow-canvas/50 group-hover:border-hairline-strong transition-all overflow-hidden">
            <Spotlight className="from-zinc-200/40 via-zinc-200/10 to-transparent blur-2xl" size={200} />
            <div className="relative z-10 flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 fill-current text-ink" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <div>
                  <div className="text-[10px] text-charcoal font-medium">Repairo Bot</div>
                  <div className="text-xs font-medium text-ink">Update API changes</div>
                  <div className="text-[10px] text-charcoal">#1562 opened</div>
                </div>
              </div>
              <svg className="w-5 h-5 fill-current text-ink" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
