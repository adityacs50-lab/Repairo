"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { FAQ_LIST } from "@/lib/faq";

export function FaqSection() {
  // Single active state so only ONE question is open at a time
  const [openId, setOpenId] = useState<string | null>("codeStorage");

  const toggleItem = (id: string) => {
    setOpenId((currentId) => (currentId === id ? null : id));
  };

  return (
    <section className="w-full py-24 md:py-32 px-6 md:px-12 max-w-4xl mx-auto border-t border-hairline bg-canvas">
      {/* Eyebrow and Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-14 text-left"
      >
        <div className="font-mono text-xs uppercase tracking-wider text-charcoal mb-2">
          COMMON QUESTIONS
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium font-display text-ink tracking-tight">
          Everything you need to know.
        </h2>
      </motion.div>

      {/* Stacked Vertical List (One after the other) */}
      <div className="space-y-4">
        {FAQ_LIST.map((item) => {
          const isOpen = openId === item.id;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              className="bg-surface-elevated border border-hairline rounded-2xl p-5 md:p-6 transition-all duration-200 hover:border-hairline-strong shadow-inner shadow-canvas/50"
            >
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-center justify-between font-medium text-sm md:text-base text-ink text-left focus:outline-none cursor-pointer group"
              >
                <span className="pr-4 leading-snug">{item.question}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xl text-charcoal group-hover:text-ink font-normal shrink-0 select-none transition-colors"
                >
                  {isOpen ? "−" : "+"}
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-hairline-strong text-xs md:text-sm text-mute leading-relaxed space-y-4">
                      <p>{item.answer}</p>

                      {/* Special Zero-Retention Checklist for codeStorage */}
                      {item.hasSpecialContent && (
                        <div className="bg-surface-deep border border-hairline rounded-xl p-4 md:p-5 mt-3 space-y-3 shadow-inner shadow-canvas/50">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-medium text-xs md:text-sm text-ink mb-2">
                                No. Repairo follows a strict zero-retention policy.
                              </h4>
                              <ul className="space-y-2 text-xs text-mute">
                                <li className="flex items-center gap-2">
                                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Your private code is never stored.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>It is never retained after processing.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>It is never used to train AI models.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>We only analyze the code required to generate deterministic patches.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Your repository remains under your control, at all times.</span>
                                </li>
                              </ul>
                              <p className="text-charcoal text-[11px] mt-3 leading-relaxed">
                                This end-to-end zero-retention approach gives security teams complete peace of mind and meets the highest standards of enterprise security and compliance.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
