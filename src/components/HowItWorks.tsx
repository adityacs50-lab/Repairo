"use client";

import React from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animationVariants";

export function HowItWorks() {
  return (
    <section className="w-full py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto border-t border-neutral-200">
      {/* Eyebrow and Title */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-16"
      >
        <div className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-2">
          PIPELINE
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-black tracking-tight">
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
        <motion.div variants={itemVariants} className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full border border-neutral-300 flex items-center justify-center font-mono font-semibold text-sm text-black bg-white shadow-2xs">
                01
              </div>
              <div className="h-[1px] bg-neutral-200 flex-1 hidden lg:block" />
            </div>
            <h3 className="text-base font-semibold text-black mb-2">Detect drift</h3>
            <p className="text-xs text-neutral-600 leading-relaxed mb-6">
              We diff the OpenAPI specs of your dependencies every time they release. When a breaking change is found, we catch it instantly.
            </p>
          </div>

          {/* Graphic Box */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-center gap-3 hover:border-neutral-300 shadow-md hover:shadow-lg transition-all">
            <div className="w-8 h-8 rounded-lg border border-neutral-200 bg-white flex items-center justify-center text-neutral-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
            <div className="w-6 h-6 rounded-full border border-neutral-300 bg-white" />
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
            <div className="w-8 h-8 rounded-lg border border-neutral-200 bg-black text-white flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 00-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Step 02 */}
        <motion.div variants={itemVariants} className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full border border-neutral-300 flex items-center justify-center font-mono font-semibold text-sm text-black bg-white shadow-2xs">
                02
              </div>
              <div className="h-[1px] bg-neutral-200 flex-1 hidden lg:block" />
            </div>
            <h3 className="text-base font-semibold text-black mb-2">Map impact</h3>
            <p className="text-xs text-neutral-600 leading-relaxed mb-6">
              Repairo scans your codebase. We find exactly where the API was called, what types changed, and trace the full impact.
            </p>
          </div>

          {/* Graphic Box */}
          <div className="bg-white border border-neutral-200 rounded-xl p-3.5 space-y-1.5 text-xs hover:border-neutral-300 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-700 font-mono">
                <span className="w-3 h-3 rounded bg-neutral-200 border border-neutral-300 flex items-center justify-center text-[8px] font-sans">@</span>
                payments.ts
              </span>
              <span className="font-semibold text-black">4</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-700 font-mono">
                <span className="w-3 h-3 rounded bg-neutral-200 border border-neutral-300 flex items-center justify-center text-[8px] font-sans">@</span>
                stripe.d.ts
              </span>
              <span className="font-semibold text-black">3</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-700 font-mono">
                <span className="w-3 h-3 rounded bg-neutral-200 border border-neutral-300 flex items-center justify-center text-[8px] font-sans">@</span>
                customers.ts
              </span>
              <span className="font-semibold text-black">2</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-700 font-mono">
                <span className="w-3 h-3 rounded bg-neutral-200 border border-neutral-300 flex items-center justify-center text-[8px] font-sans">@</span>
                helpers.ts
              </span>
              <span className="font-semibold text-black">2</span>
            </div>
          </div>
        </motion.div>

        {/* Step 03 */}
        <motion.div variants={itemVariants} className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full border border-neutral-300 flex items-center justify-center font-mono font-semibold text-sm text-black bg-white shadow-2xs">
                03
              </div>
              <div className="h-[1px] bg-neutral-200 flex-1 hidden lg:block" />
            </div>
            <h3 className="text-base font-semibold text-black mb-2">Apply patch</h3>
            <p className="text-xs text-neutral-600 leading-relaxed mb-6">
              We generate the necessary code changes and open a clean, reviewable Pull Request.
            </p>
          </div>

          {/* Graphic Box */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 flex gap-3 items-center justify-center hover:border-neutral-300 shadow-md hover:shadow-lg transition-all">
            <div className="bg-white border border-neutral-200 rounded-lg p-2.5 space-y-1.5 flex-1 shadow-2xs">
              <div className="w-full h-1.5 bg-rose-200 rounded" />
              <div className="w-3/4 h-1.5 bg-emerald-200 rounded" />
              <div className="w-5/6 h-1.5 bg-emerald-200 rounded" />
            </div>
            <div className="bg-white border border-neutral-200 rounded-lg p-2.5 space-y-1.5 flex-1 shadow-2xs">
              <div className="w-full h-1.5 bg-rose-200 rounded" />
              <div className="w-2/3 h-1.5 bg-emerald-200 rounded" />
              <div className="w-4/5 h-1.5 bg-emerald-200 rounded" />
            </div>
          </div>
        </motion.div>

        {/* Step 04 */}
        <motion.div variants={itemVariants} className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full border border-neutral-300 flex items-center justify-center font-mono font-semibold text-sm text-black bg-white shadow-2xs">
                04
              </div>
            </div>
            <h3 className="text-base font-semibold text-black mb-2">Pull Request</h3>
            <p className="text-xs text-neutral-600 leading-relaxed mb-6">
              Providers announce, Repairo patches.
            </p>
          </div>

          {/* Graphic Box */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between shadow-md hover:shadow-lg hover:border-neutral-300 transition-all">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <div>
                <div className="text-[10px] text-neutral-400 font-medium">Repairo Bot</div>
                <div className="text-xs font-semibold text-black">Update API changes</div>
                <div className="text-[10px] text-neutral-400">#1562 opened</div>
              </div>
            </div>
            <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
