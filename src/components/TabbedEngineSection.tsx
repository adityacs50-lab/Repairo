"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type TabKey = "DETECT" | "MAP" | "REPAIR";

export function TabbedEngineSection() {
  const [activeTab, setActiveTab] = useState<TabKey>("DETECT");

  return (
    <section id="use-cases" className="py-16 md:py-24 px-6 md:px-12 max-w-[1240px] mx-auto border-t border-slate-200/80 font-sans">
      {/* Top Split Header */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-end mb-10">
        <div className="md:col-span-6">
          <span className="text-[11px] font-mono font-bold tracking-[0.14em] text-blue-600 uppercase block mb-3">
            POWERED BY TYPE-AWARE AST REASONING
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-[38px] font-bold tracking-tight text-slate-950 leading-[1.12]">
            AI where it helps.<br />
            Judgment where it<br />
            matters.
          </h2>
        </div>
        <div className="md:col-span-6">
          <p className="text-sm text-slate-600 leading-relaxed max-w-md font-normal">
            We combine deterministic AST static analysis with targeted LLM reasoning where context, intent, and semantics are required.
          </p>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 mb-4">
        {(["DETECT", "MAP", "REPAIR"] as TabKey[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-[#090d16] text-white shadow-sm"
                  : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Main Card Container */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
        <AnimatePresence mode="wait">
          {activeTab === "DETECT" && (
            <motion.div
              key="detect"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Card Title & Subtitle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="text-[10px] font-mono tracking-wider font-semibold text-blue-600 uppercase block mb-1">
                    DETECTION ENGINE &amp; SPEC DIFF
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Know what changed before you touch the code.
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                    Repairo follows changes upstream through the dependency graph and identifies the exact AST context that needs attention.
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-mono font-semibold border border-blue-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    LIVE SPEC WATCH
                  </span>
                </div>
              </div>

              {/* Spec Diff Rows */}
              <div className="space-y-3">
                {/* Row 1 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-colors gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      S
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>stripe-node</span>
                        <span className="text-[11px] font-mono text-slate-500 font-normal">v14.0 → v15.0</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        <span className="text-amber-600 font-medium">charges.create</span> deprecated in favor of <span className="text-blue-600 font-medium">paymentIntents</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <span className="text-xs font-mono text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200">
                      12 Call Sites
                    </span>
                    <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
                      <span>View Impact</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-colors gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      O
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>openai-node</span>
                        <span className="text-[11px] font-mono text-slate-500 font-normal">v4.0 → v4.28</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        <span className="text-blue-600 font-medium">chat.completions</span> migration &amp; streaming response format update
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <span className="text-xs font-mono text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200">
                      8 Call Sites
                    </span>
                    <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      AST Valid
                    </span>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-colors gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      G
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>octokit/rest</span>
                        <span className="text-[11px] font-mono text-slate-500 font-normal">v19.0 → v20.0</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        <span className="text-purple-600 font-medium">paginate</span> interface signature changed to async iterators
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <span className="text-xs font-mono text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200">
                      5 Call Sites
                    </span>
                    <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                      Repaired
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Summary Tags / Stats */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <strong>14 AST nodes</strong> modified
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <strong>3 breaking changes</strong> addressed
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <strong>0 compiler errors</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <strong>100% type coverage</strong>
                </span>
              </div>
            </motion.div>
          )}

          {activeTab === "MAP" && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-5">
                <span className="text-[10px] font-mono tracking-wider font-semibold text-blue-600 uppercase block mb-1">
                  IMPACT GRAPH &amp; AST TRACING
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Trace downstream references from root imports to leaf functions.
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Every reference is mapped deterministically with ts-morph to guarantee all affected call sites are captured.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-mono font-bold text-blue-600 mb-1">ROOT DEFINITION</div>
                  <div className="text-sm font-semibold text-slate-900">node_modules/@stripe/stripe-node</div>
                  <p className="text-xs text-slate-500 mt-2">Exports deprecated ChargesAPI interface</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-mono font-bold text-purple-600 mb-1">MIDDLEWARE &amp; SERVICES</div>
                  <div className="text-sm font-semibold text-slate-900">src/services/billing.service.ts</div>
                  <p className="text-xs text-slate-500 mt-2">7 downstream call sites mapped</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-mono font-bold text-emerald-600 mb-1">API CONTROLLERS</div>
                  <div className="text-sm font-semibold text-slate-900">src/app/api/checkout/route.ts</div>
                  <p className="text-xs text-slate-500 mt-2">5 consumer endpoints updated</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "REPAIR" && (
            <motion.div
              key="repair"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-5">
                <span className="text-[10px] font-mono tracking-wider font-semibold text-blue-600 uppercase block mb-1">
                  AST TRANSFORMATION &amp; PR GENERATION
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Automated pull requests with verified compiler passes.
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Transforms code with syntax tree accuracy and runs local test suites before submitting the PR.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2">
                <div className="text-emerald-400">✓ git checkout -b repairo/upgrade-stripe-15</div>
                <div className="text-slate-300">✓ Applied 14 AST transformations</div>
                <div className="text-slate-300">✓ Ran tsc --noEmit (0 errors)</div>
                <div className="text-slate-300">✓ Ran vitest run (48/48 tests passed)</div>
                <div className="text-blue-400">✓ Opened PR #142: &quot;fix(deps): migrate stripe charges to paymentIntents&quot;</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
