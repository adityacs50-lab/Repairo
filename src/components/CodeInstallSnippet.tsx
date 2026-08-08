"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { BorderTrail } from "@/components/ui/border-trail";

const CLI_SNIPPET = `# 1. Quick scan via npx (no installation required)
npx @repairo/cli scan ./src --vendors stripe,openai,supabase

# 2. Or install globally for automated CI/CD workflows
npm install -g @repairo/cli
repairo init --repo owner/your-app

# 3. Preview AST refactoring diff for breaking OpenAPI spec changes
repairo diff --spec https://api.stripe.com/v1/openapi.json

# 4. Apply AST patches & open reviewable GitHub PR
repairo repair --create-pr`;

export function CodeInstallSnippet() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CLI_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="w-full py-24 md:py-32 px-6 md:px-12 max-w-7xl mx-auto border-t border-hairline bg-canvas">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left column */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="lg:col-span-5 flex flex-col justify-center"
        >
          <div className="font-mono text-xs uppercase tracking-wider text-charcoal mb-2">
            QUICKSTART
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium font-display text-ink tracking-tight mb-4">
            Get started locally.
          </h2>
          <p className="text-sm text-mute leading-relaxed">
            Install the CLI to test our static analyzer against your codebase before deploying to GitHub Actions.
          </p>
        </motion.div>

        {/* Right column (Dark Code Window) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="lg:col-span-7"
        >
          <div className="bg-surface-elevated text-ink rounded-2xl p-6 font-mono text-xs border border-hairline shadow-inner shadow-canvas/50 relative overflow-hidden">
            <BorderTrail className="bg-gradient-to-l from-accent-blue/40 via-accent-blue/10 to-transparent" size={150} />
            
            {/* Top Right Copy Button */}
            <div className="absolute top-4 right-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCopy}
                type="button"
                className="flex items-center gap-1.5 bg-surface-deep hover:bg-body text-ink border border-hairline px-3 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Code Content with Line Numbers */}
            <div className="space-y-2 leading-relaxed overflow-x-auto pt-2">
              <div className="flex gap-4">
                <span className="text-charcoal select-none w-4 text-right">1</span>
                <span className="text-charcoal"># 1. Quick scan via npx (no installation required)</span>
              </div>
              <div className="flex gap-4">
                <span className="text-charcoal select-none w-4 text-right">2</span>
                <span className="text-ink font-medium">npx <span className="text-emerald-400">@repairo/cli</span> scan ./src <span className="text-accent-blue">--vendors</span> <span className="text-accent-orange">stripe,openai,supabase</span></span>
              </div>
              <div className="flex gap-4">
                <span className="text-charcoal select-none w-4 text-right">3</span>
                <span></span>
              </div>
              <div className="flex gap-4">
                <span className="text-charcoal select-none w-4 text-right">4</span>
                <span className="text-charcoal"># 2. Or install globally for automated CI/CD workflows</span>
              </div>
              <div className="flex gap-4">
                <span className="text-charcoal select-none w-4 text-right">5</span>
                <span className="text-ink font-medium">npm install <span className="text-accent-blue">-g</span> <span className="text-emerald-400">@repairo/cli</span></span>
              </div>
              <div className="flex gap-4">
                <span className="text-charcoal select-none w-4 text-right">6</span>
                <span className="text-ink font-medium">repairo init <span className="text-accent-blue">--repo</span> <span className="text-accent-orange">owner/your-app</span></span>
              </div>
              <div className="flex gap-4">
                <span className="text-charcoal select-none w-4 text-right">7</span>
                <span></span>
              </div>
              <div className="flex gap-4">
                <span className="text-charcoal select-none w-4 text-right">8</span>
                <span className="text-charcoal"># 3. Preview AST refactoring diff for breaking OpenAPI spec changes</span>
              </div>
              <div className="flex gap-4">
                <span className="text-charcoal select-none w-4 text-right">9</span>
                <span className="text-ink font-medium">repairo diff <span className="text-accent-blue">--spec</span> <span className="text-accent-orange">https://api.stripe.com/v1/openapi.json</span></span>
              </div>
              <div className="flex gap-4">
                <span className="text-charcoal select-none w-4 text-right">10</span>
                <span></span>
              </div>
              <div className="flex gap-4">
                <span className="text-charcoal select-none w-4 text-right">11</span>
                <span className="text-charcoal"># 4. Apply AST patches & open reviewable GitHub PR</span>
              </div>
              <div className="flex gap-4">
                <span className="text-charcoal select-none w-4 text-right">12</span>
                <span className="text-ink font-medium">repairo repair <span className="text-accent-blue">--create-pr</span></span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
