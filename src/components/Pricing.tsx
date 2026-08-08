"use client";

import React from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { Spotlight } from "@/components/ui/spotlight";
import { BorderTrail } from "@/components/ui/border-trail";

export function PricingCard({
  tier,
  price,
  description,
  features,
  buttonText,
  highlighted = false,
}: {
  tier: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  highlighted?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <div
        className={`flex flex-col p-8 rounded-2xl border transition-all h-full justify-between relative overflow-hidden ${
          highlighted
            ? "border-hairline-strong bg-surface-elevated shadow-inner shadow-canvas/50"
            : "border-hairline bg-surface-card hover:border-hairline-strong shadow-inner shadow-canvas/50"
        }`}
      >
        <Spotlight className="from-zinc-200/40 via-zinc-200/10 to-transparent blur-2xl" size={300} />
        {highlighted && (
          <BorderTrail className="bg-gradient-to-l from-accent-blue/50 via-accent-blue/20 to-transparent" size={150} />
        )}
        <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="flex flex-col gap-2 mb-8">
            <div className="flex items-center justify-between">
              <h3
                className={`font-mono text-xs uppercase tracking-widest ${
                  highlighted ? "text-ink font-medium" : "text-charcoal"
                }`}
              >
                {tier}
              </h3>
              {highlighted && (
                <span className="text-[10px] font-medium bg-ink text-primary-on px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Popular
                </span>
              )}
            </div>
            <div className="font-medium font-display tracking-tight text-ink leading-none mt-1 flex flex-col gap-1">
              <span className="text-3xl md:text-4xl">
                {(() => {
                  const p = price.split(" or ")[0];
                  if (p.startsWith("$")) {
                    const hasMo = p.endsWith("/mo");
                    const num = p.replace("$", "").replace("/mo", "");
                    return (
                      <span className="flex items-start">
                        <span className="text-lg md:text-xl font-sans mt-1 mr-0.5 text-mute">$</span>
                        <span>{num}</span>
                        {hasMo && <span className="text-base md:text-lg font-sans mt-auto mb-1 ml-1 text-mute font-normal">/mo</span>}
                      </span>
                    );
                  }
                  return p;
                })()}
              </span>
              {price.includes(" or ") && (
                <span className="text-xs font-normal text-mute">
                  or {price.split(" or ")[1]}
                </span>
              )}
            </div>
            <p className="text-xs text-mute leading-relaxed min-h-[42px] mt-2">
              {description}
            </p>
          </div>

          {/* Button with clear pill border & background */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-3 rounded-full text-xs font-medium transition-all mb-8 cursor-pointer ${
              highlighted
                ? "bg-ink text-primary-on hover:bg-body shadow-sm"
                : "bg-surface-elevated text-ink border border-hairline hover:border-hairline-strong hover:bg-surface-deep"
            }`}
          >
            {buttonText}
          </motion.button>
        </div>

        {/* Feature List */}
        <div className="flex flex-col gap-3 pt-4 border-t border-hairline">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
              </div>
              <span className="text-xs text-ink leading-snug">
                {feature}
              </span>
            </div>
          ))}
        </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PricingSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <PricingCard
        tier="Free"
        price="$0"
        description="Evaluate Repairo's deterministic AST engine on a single repository."
        buttonText="Get started for free"
        features={[
          "1 connected repository",
          "Manual / On-Demand API scans (CLI or Web UI)",
          "Visual impact mapping & diffing",
          "View OpenAPI drift alerts (No automated PRs)",
          "Standard community support (Discord)",
        ]}
      />
      <PricingCard
        tier="Pro"
        price="$20/mo"
        description="Automated API maintenance and PR generation for growing engineering teams."
        buttonText="Start free trial"
        features={[
          "Up to 10 connected repositories",
          "Auto-generated fix PRs (The core feature)",
          "Scheduled daily scans",
          "AST safety scoring on PRs",
          "Basic CI/CD pipeline integration (GitHub Actions)",
          "Email notifications",
        ]}
      />
      <PricingCard
        tier="Business"
        price="$249/mo"
        description="Real-time CI/CD automation, detailed audit logs, and priority support for scaling teams."
        buttonText="Start free trial"
        highlighted={true}
        features={[
          "Up to 50 connected repositories",
          "Real-time webhook scans (Instantly catches updates on release)",
          "Auto-merge enabled for 100% safe patches",
          "Detailed PR history & audit logs",
          "Slack / Microsoft Teams webhook integrations",
          "Priority email support",
        ]}
      />
      <PricingCard
        tier="Enterprise"
        price="Custom Pricing"
        description="Custom deployment, VPC hosting, and dedicated support for strict InfoSec compliance."
        buttonText="Contact us"
        features={[
          "Unlimited repositories",
          "Volatile RAM Vault (Strict zero-data retention)",
          "VPC / Self-hosted runner options",
          "SSO / SAML integration (Okta, Entra ID, etc.)",
          "SOC 2 Type II & HIPAA compliance coverage",
          "Custom SLAs & Dedicated shared Slack channel",
        ]}
      />
    </div>
  );
}
