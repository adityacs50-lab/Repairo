"use client";

import { motion } from "framer-motion";
import { Lock, ShieldCheck, FileText, Building2, Check, X } from "lucide-react";
import { containerVariants, itemVariants } from "@/lib/animationVariants";
import { Spotlight } from "@/components/ui/spotlight";

const genericApproach = [
  "Clone the whole repository by default",
  "Keep code indefinitely for “analysis”",
  "No record of what changed",
  "Broad OAuth scopes",
  "Opaque model output with no review path",
];

const repairoApproach = [
  "Fetch only the spec and consumer paths you configure",
  "Process file contents in memory for the job — not a training corpus",
  "Run history and PR links in your workspace",
  "GitHub scopes limited to what the workflow needs",
  "Deterministic patches with compiler checks where configured",
];

const pillars = [
  {
    icon: Lock,
    title: "Data retention",
    description:
      "What happens to your code after a repair? Spec and consumer files are used for that job, then discarded from our processing path. See /security for what we store in the database.",
    badges: [] as string[],
  },
  {
    icon: ShieldCheck,
    title: "GitHub permissions",
    description:
      "We request repo and read:user for workspace OAuth — enough to read paths you choose and open PRs. Revoke access anytime in GitHub settings.",
    badges: [] as string[],
  },
  {
    icon: FileText,
    title: "Audit trail",
    description:
      "Repair runs record status, summaries, errors, and PR URLs so you can see what was detected and submitted.",
    badges: [] as string[],
  },
  {
    icon: Building2,
    title: "Security and compliance",
    description:
      "Formal SOC 2 / ISO programs are on the roadmap, not completed today. Enterprise plans can include VPC runner and SSO — contact us for a questionnaire.",
    badges: [] as string[],
  },
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
            SECURITY
          </motion.span>
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl lg:text-6xl font-medium font-display text-ink tracking-tight mb-6">
            Know what Repairo can access.
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg md:text-xl text-mute max-w-2xl">
            Your code should not leave your control just to fix an API change. Scoped access,
            reviewable diffs, and clear records of what ran.
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
              <h3 className="text-lg font-medium text-charcoal mb-8">Typical “send us your repo” tools</h3>
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
            <motion.div key={i} variants={itemVariants} className="relative flex flex-col items-start p-6 rounded-2xl border border-hairline bg-surface-card hover:border-hairline-strong shadow-inner shadow-canvas/50 transition-all overflow-hidden">
              <Spotlight className="from-zinc-200/40 via-zinc-200/10 to-transparent blur-2xl" size={250} />
              <div className="relative z-10 w-full">
              <div className="p-3 bg-surface-elevated border border-hairline rounded-xl mb-5 inline-block">
                <pillar.icon className="w-6 h-6 text-ink" />
              </div>
              <h4 className="text-lg font-medium text-ink mb-3">{pillar.title}</h4>

              {pillar.description && (
                <p className="text-mute text-sm leading-relaxed">
                  {pillar.description}
                </p>
              )}

              {pillar.badges.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {pillar.badges.map((badge, j) => (
                    <span key={j} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-elevated border border-hairline text-mute">
                      {badge}
                    </span>
                  ))}
                </div>
              )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
