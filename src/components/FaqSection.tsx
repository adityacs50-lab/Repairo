"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  hasSpecialContent?: boolean;
}

const FAQ_LIST: FaqItem[] = [
  {
    id: "codeStorage",
    question: "Do you store or train on our company's private code?",
    answer: "Never. We follow a strict Zero-Retention policy. Your code is processed in secure temporary memory only while creating the fix, and is completely wiped immediately after. Your code always remains 100% private.",
    hasSpecialContent: true,
  },
  {
    id: "whatItDoes",
    question: "What does Repairo actually do?",
    answer: "Whenever external services you rely on (like OpenAI, Stripe, or Google Gemini) update their software, your app can break. Repairo automatically detects these changes and creates a ready-to-merge fix for your developers—so your app stays up and running without wasting engineering hours.",
  },
  {
    id: "saveMoneyTime",
    question: "How does this save my team money and time?",
    answer: "Engineers spend up to 20% of their time manually hunting down and fixing broken third-party tools. Repairo does this work automatically in seconds, letting your team focus on building new features that grow your business.",
  },
  {
    id: "modelUpdate",
    question: "What happens when an AI model or payment system updates?",
    answer: "Repairo instantly flags the update, rewrites the affected lines of code, and opens a standard GitHub Pull Request. Your team simply clicks 'Approve' to apply the update safely.",
  },
  {
    id: "securityVuln",
    question: "Does Repairo also protect us from security vulnerabilities?",
    answer: "Yes! Repairo constantly monitors your application for known security risks in third-party software and automatically submits security patches before issues ever hit production.",
  },
  {
    id: "setupDifficulty",
    question: "How hard is it to set up?",
    answer: "It takes less than 2 minutes. Simply connect your GitHub account, choose which projects to protect, and Repairo starts working in the background automatically. No complex configuration required.",
  },
];

export function FaqSection() {
  // Single active state so only ONE question is open at a time
  const [openId, setOpenId] = useState<string | null>("codeStorage");

  const toggleItem = (id: string) => {
    setOpenId((currentId) => (currentId === id ? null : id));
  };

  return (
    <section className="w-full py-16 px-6 md:px-12 max-w-4xl mx-auto border-t border-neutral-200">
      {/* Eyebrow and Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-10 text-left"
      >
        <div className="font-mono text-xs uppercase tracking-wider text-neutral-500 mb-2">
          COMMON QUESTIONS
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold text-black tracking-tight">
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
              className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 md:p-6 transition-all duration-200 hover:border-neutral-300"
            >
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-center justify-between font-semibold text-sm md:text-base text-black text-left focus:outline-none cursor-pointer group"
              >
                <span className="pr-4 leading-snug">{item.question}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xl text-neutral-400 group-hover:text-black font-normal shrink-0 select-none transition-colors"
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
                    <div className="mt-4 pt-4 border-t border-neutral-200/70 text-xs md:text-sm text-neutral-600 leading-relaxed space-y-4">
                      <p>{item.answer}</p>

                      {/* Special Zero-Retention Checklist for codeStorage */}
                      {item.hasSpecialContent && (
                        <div className="bg-white border border-neutral-200 rounded-xl p-4 md:p-5 mt-3 space-y-3 shadow-2xs">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-xs md:text-sm text-black mb-2">
                                No. Repairo follows a strict zero-retention policy.
                              </h4>
                              <ul className="space-y-2 text-xs text-neutral-700">
                                <li className="flex items-center gap-2">
                                  <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Your private code is never stored.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>It is never retained after processing.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>It is never used to train AI models.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>We only analyze the code required to generate deterministic patches.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Your repository remains under your control, at all times.</span>
                                </li>
                              </ul>
                              <p className="text-neutral-400 text-[11px] mt-3 leading-relaxed">
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
