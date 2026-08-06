"use client";

import React from "react";
import { motion } from "framer-motion";

export function EcosystemBand() {
  return (
    <section className="w-full bg-white border-t border-b border-neutral-200 py-10 px-6 md:px-12">
      <div className="max-w-7xl mx-auto text-center">
        <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-neutral-400 mb-8">
          AUTOMATED REPAIR ENGINES POWERING THE WORLD'S LEADING APIS
        </p>

        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 text-neutral-800 font-semibold text-lg opacity-90">
          {/* OpenAI */}
          <motion.div whileHover={{ y: -2, opacity: 1 }} transition={{ duration: 0.2 }} className="flex items-center gap-2 cursor-default">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9 6.0651 6.0651 0 0 0-4.981-2.01 6.0094 6.0094 0 0 0-5.724 4.0217 6.0094 6.0094 0 0 0-3.994 2.915 6.0504 6.0504 0 0 0 .7427 7.0466 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.596 24a6.056 6.056 0 0 0 5.7578-4.02 6.0094 6.0094 0 0 0 3.9933-2.915 6.0462 6.0462 0 0 0-.7427-7.0466zM13.596 22.4764a4.466 4.466 0 0 1-2.8774-1.0406l.1423-.0819 4.7738-2.7562a.7797.7797 0 0 0 .3927-.6761v-6.735l2.0232 1.168a.071.071 0 0 1 .038.052v5.5833a4.504 4.504 0 0 1-4.4926 4.4865z"/>
            </svg>
            <span className="font-bold tracking-tight">OpenAI</span>
          </motion.div>

          {/* Gemini */}
          <motion.div whileHover={{ y: -2, opacity: 1 }} transition={{ duration: 0.2 }} className="flex items-center gap-2 cursor-default">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z"/>
            </svg>
            <span className="font-bold tracking-tight">Gemini</span>
          </motion.div>

          {/* Anthropic */}
          <motion.div whileHover={{ y: -2, opacity: 1 }} transition={{ duration: 0.2 }} className="flex items-center gap-2 cursor-default">
            <span className="font-mono font-bold tracking-widest text-base">ANTHROPIC</span>
          </motion.div>

          {/* Stripe */}
          <motion.div whileHover={{ y: -2, opacity: 1 }} transition={{ duration: 0.2 }} className="flex items-center gap-1 cursor-default">
            <span className="font-serif italic font-bold text-xl tracking-tight lowercase">stripe</span>
          </motion.div>

          {/* Razorpay */}
          <motion.div whileHover={{ y: -2, opacity: 1 }} transition={{ duration: 0.2 }} className="flex items-center gap-1.5 cursor-default">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M22.436 0l-11.91 10.141 5.019 13.859 6.891-24zM1.564 24l11.91-10.141-5.019-13.859-6.891 24z"/>
            </svg>
            <span className="font-bold tracking-tight">Razorpay</span>
          </motion.div>

          {/* Supabase */}
          <motion.div whileHover={{ y: -2, opacity: 1 }} transition={{ duration: 0.2 }} className="flex items-center gap-2 cursor-default">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M13.359 1.954a1.086 1.086 0 0 0-1.748.272L6.155 13.89a.543.543 0 0 0 .49.774h6.05l-1.054 7.382a1.086 1.086 0 0 0 1.748-.272l5.456-11.664a.543.543 0 0 0-.49-.774h-6.05l1.054-7.382z"/>
            </svg>
            <span className="font-bold tracking-tight">supabase</span>
          </motion.div>

          {/* GitHub */}
          <motion.div whileHover={{ y: -2, opacity: 1 }} transition={{ duration: 0.2 }} className="flex items-center gap-2 cursor-default">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span className="font-bold tracking-tight">GitHub</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
