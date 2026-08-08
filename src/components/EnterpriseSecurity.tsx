"use client";

import { motion } from "framer-motion";
import { Lock, ShieldCheck, FileText, Building2, Check, X } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animationVariants";

const genericApproach = [
  "Full repository clone",
  "Code stored indefinitely",
  "No audit trail",
  "Broad OAuth scopes",
  "Black-box AI decisions"
];

const repairoApproach = [
  "Read-only, scoped to affected files",
  "Zero data retention",
  "Full audit log on every action",
  "Minimal GitHub permissions",
  "Deterministic, reviewable patches"
];

const pillars = [
  {
    icon: Lock,
    title: "Zero Data Retention",
    description: "Your code is processed in temporary memory and wiped immediately.",
    badges: []
  },
  {
    icon: ShieldCheck,
    title: "Minimal Permissions",
    description: "We request only the GitHub scopes needed. Nothing more.",
    badges: []
  },
  {
    icon: FileText,
    title: "Full Audit Trail",
    description: "Every detection, patch, and PR is logged and traceable.",
    badges: []
  },
  {
    icon: Building2,
    title: "Compliance Ready",
    description: "",
    badges: ["SOC 2 Type II", "ISO 27001", "GDPR", "HIPAA"]
  }
];

export function EnterpriseSecurity() {
  return (
    <section className="py-24 md:py-32 border-t border-hairline bg-canvas">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col items-center text-center mb-16"
        >
          <motion.span variants={itemVariants} className="text-sm font-medium tracking-wider text-charcoal uppercase mb-4 block">
            ENTERPRISE SECURITY
          </motion.span>
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl font-medium font-display text-ink tracking-tight mb-6">
            Enterprise-level safety, on your terms.
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg md:text-xl text-mute max-w-2xl">
            Guardrails on every action. Your code stays private, always.
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-5xl mx-auto mb-24"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-hairline rounded-2xl overflow-hidden bg-surface-card shadow-inner shadow-canvas/50">
            <div className="p-8 md:p-10 bg-surface-deep border-b md:border-b-0 md:border-r border-hairline">
              <h3 className="text-lg font-medium text-charcoal mb-8">Generic Approach</h3>
              <ul className="space-y-6">
                {genericApproach.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 p-1 bg-rose-500/10 rounded-full flex-shrink-0">
                      <X className="w-3 h-3 text-rose-400" strokeWidth={3} />
                    </div>
                    <span className="text-mute">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-8 md:p-10 bg-surface-card relative">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-ink/20"></div>
              <h3 className="text-lg font-medium font-display text-ink mb-8">Repairo</h3>
              <ul className="space-y-6">
                {repairoApproach.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 p-1 bg-emerald-500/10 rounded-full flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />
                    </div>
                    <span className="text-ink font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto"
        >
          {pillars.map((pillar, i) => (
            <motion.div key={i} variants={itemVariants} className="flex flex-col items-start p-6 rounded-2xl border border-hairline bg-surface-card hover:border-hairline-strong shadow-inner shadow-canvas/50 transition-all">
              <div className="p-3 bg-surface-elevated border border-hairline rounded-xl mb-5">
                <pillar.icon className="w-6 h-6 text-ink" />
              </div>
              <h4 className="text-lg font-medium text-ink mb-3">{pillar.title}</h4>
              
              {pillar.description && (
                <p className="text-mute text-sm leading-relaxed">
                  {pillar.description}
                </p>
              )}
              
              {pillar.badges && pillar.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {pillar.badges.map((badge, j) => (
                    <span key={j} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-elevated border border-hairline text-mute">
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
