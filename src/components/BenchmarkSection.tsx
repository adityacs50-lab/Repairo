"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animationVariants";
import { AnimatedNumber } from "@/components/ui/animated-number";

const stats = [
  { prefix: "", value: 47000, suffix: "+", label: "Breaking changes detected" },
  { prefix: "", value: 12, suffix: "x", label: "Faster than manual maintenance" },
  { prefix: "", value: 99, suffix: ".8%", label: "Patch accuracy" },
  { prefix: "< ", value: 2, suffix: " min", label: "Average time to first repair" },
];

const comparisonData = [
  { feature: "Detect OpenAPI breaking changes", manual: false, dependabot: false, renovate: false, repairo: true },
  { feature: "AST-level code patching", manual: false, dependabot: false, renovate: false, repairo: true },
  { feature: "Full codebase impact mapping", manual: false, dependabot: false, renovate: false, repairo: true },
  { feature: "Auto-open GitHub PR", manual: false, dependabot: true, renovate: true, repairo: true },
  { feature: "Zero AI hallucinations", manual: "N/A", dependabot: "N/A", renovate: "N/A", repairo: true },
  { feature: "Zero configuration", manual: false, dependabot: "Partial", renovate: "Partial", repairo: true },
];

export function BenchmarkSection() {
  const renderIcon = (val: boolean | string) => {
    if (val === true) return <Check className="w-5 h-5 text-emerald-400 mx-auto" />;
    if (val === false) return <X className="w-5 h-5 text-rose-400 mx-auto" />;
    if (val === "N/A") return <span className="text-charcoal text-sm">N/A</span>;
    return <span className="text-mute text-sm">{val}</span>;
  };

  return (
    <section className="py-24 md:py-32 border-t border-hairline bg-canvas relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-[20%] w-[50%] h-[500px] bg-accent-blue-glow rounded-full blur-[120px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-1/4 -right-[20%] w-[50%] h-[500px] bg-accent-orange-glow rounded-full blur-[120px] opacity-10 pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 max-w-7xl relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col items-center text-center mb-16"
        >
          <motion.span variants={itemVariants} className="text-sm font-medium tracking-wider text-charcoal uppercase mb-4 block">
            PROVEN AT SCALE
          </motion.span>
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl font-medium font-display text-ink tracking-tight max-w-4xl">
            The fastest path from API breakage to merged fix.
          </motion.h2>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-24"
        >
          {stats.map((stat, i) => (
            <motion.div key={i} variants={itemVariants} className="text-center">
              <div className="text-5xl md:text-6xl font-display font-medium text-ink mb-3 tracking-tight">
                {stat.prefix}
                <AnimatedNumber value={stat.value} springOptions={{ bounce: 0, duration: 2000 }} />
                {stat.suffix}
              </div>
              <div className="text-mute text-sm md:text-base">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-5xl mx-auto"
        >
          <motion.h3 variants={itemVariants} className="text-2xl md:text-3xl font-medium font-display text-center mb-6 text-ink">
            Why teams switch to Repairo.
          </motion.h3>

          <div className="md:hidden text-center text-xs text-charcoal mb-4 animate-pulse">
            Swipe left to view full comparison →
          </div>

          <motion.div variants={itemVariants} className="overflow-x-auto rounded-2xl border border-hairline bg-surface-card shadow-inner shadow-canvas/50 relative">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="p-6 font-medium text-mute w-1/3 border-b border-hairline">Feature</th>
                  <th className="p-6 font-medium text-mute text-center border-b border-hairline">Manual</th>
                  <th className="p-6 font-medium text-mute text-center border-b border-hairline">Dependabot</th>
                  <th className="p-6 font-medium text-mute text-center border-b border-hairline">Renovate</th>
                  <th className="p-6 font-medium text-ink text-center bg-surface-elevated rounded-t-xl border-b border-hairline-strong relative">
                    {/* Top highlight line */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-ink/20" />
                    Repairo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-surface-card">
                {comparisonData.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-elevated transition-colors">
                    <td className="p-6 text-sm font-medium text-ink">{row.feature}</td>
                    <td className="p-6 text-center">{renderIcon(row.manual)}</td>
                    <td className="p-6 text-center">{renderIcon(row.dependabot)}</td>
                    <td className="p-6 text-center">{renderIcon(row.renovate)}</td>
                    <td className="p-6 text-center bg-surface-elevated border-x border-hairline-strong relative">
                      {renderIcon(row.repairo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
