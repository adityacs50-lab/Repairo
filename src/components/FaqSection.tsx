"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { FAQ_LIST } from "@/lib/faq";

export function FaqSection() {
  // Single active state so only ONE question is open at a time
  const [openId, setOpenId] = useState<string | null>(null);

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
          Straight answers.
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
