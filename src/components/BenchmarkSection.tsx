"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animationVariants";

const stats = [
  { value: "47,000+", label: "Breaking changes detected" },
  { value: "12x", label: "Faster than manual maintenance" },
  { value: "99.8%", label: "Patch accuracy" },
  { value: "< 2 min", label: "Average time to first repair" },
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
    if (val === true) return <Check className="w-5 h-5 text-emerald-500 mx-auto" />;
    if (val === false) return <X className="w-5 h-5 text-red-400 mx-auto" />;
    if (val === "N/A") return <span className="text-neutral-400 text-sm">N/A</span>;
    return <span className="text-neutral-600 text-sm">{val}</span>;
  };

  return (
    <section className="py-24 md:py-32 border-t border-neutral-200 bg-white">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col items-center text-center mb-16"
        >
          <motion.span variants={itemVariants} className="text-sm font-semibold tracking-wider text-neutral-500 uppercase mb-4 block">
            PROVEN AT SCALE
          </motion.span>
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl font-semibold text-black tracking-tight max-w-4xl">
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
              <div className="text-5xl md:text-6xl font-bold text-black mb-3">{stat.value}</div>
              <div className="text-neutral-500 text-sm md:text-base">{stat.label}</div>
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
          <motion.h3 variants={itemVariants} className="text-2xl md:text-3xl font-semibold text-center mb-6 text-black">
            Why teams switch to Repairo.
          </motion.h3>

          <div className="md:hidden text-center text-xs text-neutral-400 mb-4 animate-pulse">
            Swipe left to view full comparison →
          </div>

          <motion.div variants={itemVariants} className="overflow-x-auto rounded-2xl border border-neutral-200 bg-neutral-50/50 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="p-6 font-medium text-neutral-500 w-1/3">Feature</th>
                  <th className="p-6 font-medium text-neutral-500 text-center">Manual</th>
                  <th className="p-6 font-medium text-neutral-500 text-center">Dependabot</th>
                  <th className="p-6 font-medium text-neutral-500 text-center">Renovate</th>
                  <th className="p-6 font-semibold text-black text-center bg-black/5 rounded-t-xl border-b-2 border-black">Repairo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {comparisonData.map((row, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-6 text-sm font-medium text-neutral-800">{row.feature}</td>
                    <td className="p-6 text-center">{renderIcon(row.manual)}</td>
                    <td className="p-6 text-center">{renderIcon(row.dependabot)}</td>
                    <td className="p-6 text-center">{renderIcon(row.renovate)}</td>
                    <td className="p-6 text-center bg-black/5">{renderIcon(row.repairo)}</td>
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
