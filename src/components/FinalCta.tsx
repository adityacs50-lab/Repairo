"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TextEffect } from "@/components/ui/text-effect";
import { Spotlight } from "@/components/ui/spotlight";
import { BorderTrail } from "@/components/ui/border-trail";

export function FinalCta() {
  return (
    <section className="w-full px-6 md:px-12 max-w-7xl mx-auto py-24 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="bg-surface-elevated border border-hairline rounded-3xl p-12 md:p-24 text-center text-ink relative overflow-hidden shadow-inner shadow-canvas/50 flex flex-col items-center justify-center group"
      >
        <Spotlight className="from-zinc-200/40 via-zinc-200/10 to-transparent blur-3xl" size={400} />
        <BorderTrail className="bg-gradient-to-l from-emerald-500/30 via-emerald-500/10 to-transparent" size={300} />
        
        {/* Glow Orbs */}
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-accent-blue/10 blur-[120px] pointer-events-none" />

        {/* Subtle radial line overlay */}
        <div className="absolute inset-0 radial-pattern-bg opacity-30 pointer-events-none mix-blend-overlay" />
        
        {/* Top edge glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          <div className="font-mono text-xs uppercase tracking-widest text-charcoal mb-4">
            READY TO AUTOMATE YOUR MAINTENANCE?
          </div>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-medium font-display text-ink tracking-tight leading-tight mb-8">
            <TextEffect per="word" preset="blur">Stop breaking production.</TextEffect><br />
            <TextEffect per="word" preset="fade">Start repairing it.</TextEffect>
          </h2>

          <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              href="/app"
              className="relative inline-flex items-center gap-2 bg-ink text-primary-on font-medium text-sm px-6 py-3 rounded-full hover:bg-body transition-colors mb-4 group overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>Start for free</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </span>
              {/* Glossy Sheen Light Sweep on Hover */}
              <div className="absolute inset-0 z-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)] transition-transform">
                <div className="relative h-full w-[24px] bg-primary-on/10" />
              </div>
            </Link>
          </motion.div>

          <p className="text-xs text-mute">
            No credit card required. Connect GitHub and go.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
