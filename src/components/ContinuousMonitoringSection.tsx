"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, FileCode, CheckCircle2 } from "lucide-react";

export function ContinuousMonitoringSection() {
  return (
    <section className="py-16 md:py-24 px-6 md:px-12 max-w-[1240px] mx-auto border-t border-slate-200/80 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 items-center">
        {/* Left Column: Dark IDE Diff Viewer */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-6 w-full"
        >
          <div className="rounded-2xl bg-[#090d16] border border-slate-800 shadow-2xl p-4 md:p-5 overflow-hidden text-slate-200">
            {/* Window Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700/60">
                    billing.service.ts
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    stripe.config.ts
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                <span>AST PROTECTED</span>
              </div>
            </div>

            {/* Editor Workspace Split */}
            <div className="grid grid-cols-12 gap-3 text-xs font-mono">
              {/* Left Explorer Mini */}
              <div className="hidden sm:block sm:col-span-3 border-r border-slate-800/80 pr-2 space-y-1.5 text-[10px] text-slate-400">
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold mb-1">Explorer</div>
                <div className="text-blue-400 flex items-center gap-1 font-semibold">
                  <FileCode className="w-3 h-3" /> billing.ts
                </div>
                <div className="text-slate-400 flex items-center gap-1">
                  <FileCode className="w-3 h-3 text-slate-500" /> stripe.ts
                </div>
                <div className="text-slate-400 flex items-center gap-1">
                  <FileCode className="w-3 h-3 text-slate-500" /> package.json
                </div>
                <div className="mt-4 pt-2 border-t border-slate-800/60">
                  <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold mb-1">AST Target</div>
                  <div className="text-amber-400 text-[9px]">Stripe.Charges</div>
                  <div className="text-emerald-400 text-[9px] mt-1">PaymentIntents</div>
                </div>
              </div>

              {/* Center Code Diff */}
              <div className="col-span-12 sm:col-span-9 space-y-1 bg-[#0b0f19] p-3 rounded-lg border border-slate-800/80 overflow-x-auto text-[11px] leading-relaxed">
                <div className="text-slate-500">// Upgrading @stripe/stripe-node v14 -&gt; v15</div>
                <div className="text-slate-400">
                  export async function processInvoice(params: InvoiceParams) &#123;
                </div>
                
                {/* Red Deleted Line */}
                <div className="bg-red-950/40 text-red-300 px-2 py-1 rounded border-l-2 border-red-500 flex items-start gap-2 my-1">
                  <span className="text-red-500 select-none">-</span>
                  <span>
                    const charge = await stripe.charges.create(&#123;<br />
                    &nbsp;&nbsp;amount: params.cents,<br />
                    &nbsp;&nbsp;currency: params.currency,<br />
                    &nbsp;&nbsp;source: params.cardToken<br />
                    &#125;);
                  </span>
                </div>

                {/* Green Added Line */}
                <div className="bg-emerald-950/40 text-emerald-300 px-2 py-1 rounded border-l-2 border-emerald-500 flex items-start gap-2 my-1">
                  <span className="text-emerald-400 select-none">+</span>
                  <span>
                    const intent = await stripe.paymentIntents.create(&#123;<br />
                    &nbsp;&nbsp;amount: params.cents,<br />
                    &nbsp;&nbsp;currency: params.currency,<br />
                    &nbsp;&nbsp;payment_method: params.paymentMethodId,<br />
                    &nbsp;&nbsp;confirm: true<br />
                    &#125;);
                  </span>
                </div>

                <div className="text-slate-400 mt-1">
                  &nbsp;&nbsp;return intent.status === &apos;succeeded&apos;;<br />
                  &#125;
                </div>
              </div>
            </div>

            {/* Bottom Panel */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Zero compile errors across 12 call sites</span>
              </div>
              <span className="text-slate-500">ts-morph v28.0</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Copy & Benefits */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-6 flex flex-col items-start"
        >
          <span className="text-[11px] font-mono font-bold tracking-[0.14em] text-blue-600 uppercase block mb-3">
            CONTINUOUS MONITORING &amp; AST ENFORCEMENT
          </span>

          <h2 className="text-3xl sm:text-4xl md:text-[38px] font-bold tracking-tight text-slate-950 leading-[1.12] mb-6">
            Stop finding vendor breakage only after it reaches CI.
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed font-normal mb-8 max-w-lg">
            Repairo turns monthly API updates into proactive audits. Track dependencies without checking out the repo and generate PRs with AST precision before the compiler fails your build.
          </p>

          {/* Key Feature 01 */}
          <div className="flex items-start gap-4 mb-6">
            <div className="text-2xl font-bold font-mono text-emerald-600 shrink-0">
              01
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug mb-1">
                Inspect dependency symbol trees before updating package.json
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                Repairo constructs an AST call-graph of your entire repository, cross-referencing vendor type definitions to pinpoint exactly where signatures diverged.
              </p>
            </div>
          </div>

          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-wider text-slate-900 hover:text-blue-600 transition-colors uppercase group"
          >
            <span>EXPLORE AST MIGRATION ENGINE</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-slate-400 group-hover:text-blue-600" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
