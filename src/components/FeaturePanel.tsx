"use client";

import React from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, cardHoverVariant } from "@/lib/animationVariants";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

export function FeaturePanel() {
  return (
    <section id="features" className="w-full py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto border-t border-hairline">
      {/* Eyebrow and Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-14"
      >
        <div className="font-mono text-xs uppercase tracking-wider text-charcoal mb-2">
          PLATFORM FEATURES
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium font-display text-ink tracking-tight">
          Understand the blast radius.
        </h2>
      </motion.div>

      {/* 4 Feature Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Card 1: Automatic change detection */}
        <motion.div variants={itemVariants} {...cardHoverVariant}>
          <SpotlightCard className="bg-surface-card border border-hairline rounded-2xl p-6 flex flex-col justify-between hover:border-hairline-strong transition-all h-full group">
            <div>
              <div className="w-8 h-8 rounded-lg border border-hairline bg-surface-elevated flex items-center justify-center mb-6 text-ink group-hover:bg-body transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-ink mb-2">
                Automatic change detection
              </h3>
              <p className="text-xs text-mute leading-relaxed mb-6">
                We continuously poll the OpenAPI specs of your dependencies. When a breaking change is released, Repairo catches the diff instantly.
              </p>
            </div>

            {/* Mini Visual Preview Box */}
            <div className="bg-surface-elevated border border-hairline rounded-xl p-3.5 shadow-inner shadow-canvas/50">
              <div className="text-[10px] font-medium text-charcoal mb-2">Detected changes</div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-surface-deep border border-hairline flex items-center justify-center text-[9px] text-mute font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="font-medium text-ink text-[11px]">stripe / openapi</div>
                    <div className="text-[10px] text-charcoal">2 breaking changes</div>
                  </div>
                </div>
                <div className="text-[10px] text-charcoal font-mono">2m ago</div>
              </div>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Card 2: Impact mapping across the codebase */}
        <motion.div variants={itemVariants} {...cardHoverVariant}>
          <SpotlightCard className="bg-surface-card border border-hairline rounded-2xl p-6 flex flex-col justify-between hover:border-hairline-strong transition-all h-full group">
            <div>
              <div className="w-8 h-8 rounded-lg border border-hairline bg-surface-elevated flex items-center justify-center mb-6 text-ink group-hover:bg-body transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-ink mb-2">
                Impact mapping across the codebase
              </h3>
              <p className="text-xs text-mute leading-relaxed mb-6">
                Repairo scans your entire codebase to find every affected call site, type definition, and status check. We understand TypeScript at a deep level.
              </p>
            </div>

            {/* Mini Visual Preview Box */}
            <div className="bg-surface-elevated border border-hairline rounded-xl p-3.5 shadow-inner shadow-canvas/50 text-xs">
              <div className="flex items-center justify-between text-[10px] text-charcoal mb-2">
                <span>Affected files</span>
                <span className="font-medium text-ink">Total 19</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-mute font-mono">
                    <span className="w-3 h-3 rounded bg-surface-deep border border-hairline flex items-center justify-center text-[8px] text-charcoal font-sans">@</span>
                    payments.ts
                  </span>
                  <span className="font-medium text-ink">4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-mute font-mono">
                    <span className="w-3 h-3 rounded bg-surface-deep border border-hairline flex items-center justify-center text-[8px] text-charcoal font-sans">@</span>
                    stripe.d.ts
                  </span>
                  <span className="font-medium text-ink">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-mute font-mono">
                    <span className="w-3 h-3 rounded bg-surface-deep border border-hairline flex items-center justify-center text-[8px] text-charcoal font-sans">@</span>
                    customers.ts
                  </span>
                  <span className="font-medium text-ink">2</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-mute font-mono">
                    <span className="w-3 h-3 rounded bg-surface-deep border border-hairline flex items-center justify-center text-[8px] text-charcoal font-sans">@</span>
                    helpers.ts
                  </span>
                  <span className="font-medium text-ink">2</span>
                </div>
                <div className="text-[10px] text-charcoal pt-1">
                  + 7 more files
                </div>
              </div>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Card 3: Safe, reviewable PRs */}
        <motion.div variants={itemVariants} {...cardHoverVariant}>
          <SpotlightCard className="bg-surface-card border border-hairline rounded-2xl p-6 flex flex-col justify-between hover:border-hairline-strong transition-all h-full group">
            <div>
              <div className="w-8 h-8 rounded-lg border border-hairline bg-surface-elevated flex items-center justify-center mb-6 text-ink group-hover:bg-body transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-ink mb-2">
                Safe, reviewable PRs
              </h3>
              <p className="text-xs text-mute leading-relaxed mb-6">
                <span className="font-medium text-ink bg-surface-deep px-1.5 py-0.5 rounded">Zero AI hallucinations.</span> Repairo generates a clean, deterministic patch based on OpenAPI specification changes and opens a review-ready Pull Request.
              </p>
            </div>

            {/* Mini Visual Preview Box */}
            <div className="bg-surface-elevated border border-hairline rounded-xl p-3.5 shadow-inner shadow-canvas/50">
              <div className="flex items-center justify-between text-[10px] mb-2">
                <span className="font-medium text-ink">Update: OpenAPI API response type</span>
                <span className="font-mono text-charcoal"><span className="text-emerald-400">+102</span> <span className="text-rose-400">-12</span></span>
              </div>
              <div className="bg-canvas border border-hairline rounded-lg p-2 font-mono text-[10px] space-y-1 mb-3 text-mute">
                <div className="text-charcoal">@@ -128,7 +128,7 @@</div>
                <div className="text-rose-400 flex gap-1"><span>-</span> <span>end: DateTime;</span></div>
                <div className="text-emerald-400 flex gap-1"><span>+</span> <span>end: string;</span></div>
              </div>
              <button className="w-full bg-ink text-primary-on text-[10px] font-medium py-1.5 rounded-lg hover:bg-body transition-colors">
                View PR
              </button>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Card 4: Zero configuration */}
        <motion.div variants={itemVariants} {...cardHoverVariant}>
          <SpotlightCard className="bg-surface-card border border-hairline rounded-2xl p-6 flex flex-col justify-between hover:border-hairline-strong transition-all h-full group">
            <div>
              <div className="w-8 h-8 rounded-lg border border-hairline bg-surface-elevated flex items-center justify-center mb-6 text-ink group-hover:bg-body transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-ink mb-2">
                Zero configuration
              </h3>
              <p className="text-xs text-mute leading-relaxed mb-6">
                Connect your GitHub account and point Repairo at an OpenAPI URL. We handle the rest.
              </p>
            </div>

            {/* Mini Form Preview Box */}
            <div className="bg-surface-elevated border border-hairline rounded-xl p-3.5 shadow-inner shadow-canvas/50 space-y-2.5">
              <div>
                <label className="block text-[10px] font-medium text-charcoal mb-1">OpenAPI URL</label>
                <div className="bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-mute truncate">
                  https://api.example.com/openapi.json
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-charcoal mb-1">Repository</label>
                <div className="bg-canvas border border-hairline rounded-lg px-2.5 py-1.5 text-[10px] text-ink flex items-center justify-between">
                  <span>acme/app</span>
                  <svg className="w-3 h-3 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <button className="w-full bg-ink text-primary-on text-[10px] font-medium py-1.5 rounded-lg hover:bg-body transition-colors mt-1">
                Connect & Monitor
              </button>
            </div>
          </SpotlightCard>
        </motion.div>
      </motion.div>
    </section>
  );
}
