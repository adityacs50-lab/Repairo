"use client";

import React from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

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
      <SpotlightCard
        className={`flex flex-col p-8 rounded-2xl border transition-all h-full justify-between ${
          highlighted
            ? "border-black bg-neutral-50/80 shadow-md ring-1 ring-black/5"
            : "border-neutral-200 bg-white hover:border-neutral-300"
        }`}
      >
        <div>
          <div className="flex flex-col gap-2 mb-8">
            <div className="flex items-center justify-between">
              <h3
                className={`font-mono text-xs uppercase tracking-widest ${
                  highlighted ? "text-black font-semibold" : "text-neutral-500"
                }`}
              >
                {tier}
              </h3>
              {highlighted && (
                <span className="text-[10px] font-semibold bg-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Popular
                </span>
              )}
            </div>
            <div className="text-3xl md:text-4xl font-semibold tracking-tight text-black leading-none mt-1">
              {price}
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed min-h-[42px] mt-2">
              {description}
            </p>
          </div>

          {/* Button with clear pill border & background */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-3 rounded-full text-xs font-semibold transition-all mb-8 cursor-pointer ${
              highlighted
                ? "bg-black text-white hover:bg-neutral-800 shadow-sm"
                : "bg-white text-black border border-neutral-300 hover:border-black hover:bg-neutral-50"
            }`}
          >
            {buttonText}
          </motion.button>
        </div>

        {/* Feature List */}
        <div className="flex flex-col gap-3 pt-4 border-t border-neutral-100">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
              </div>
              <span className="text-xs text-neutral-700 leading-snug">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function PricingSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <PricingCard
        tier="Free"
        price="$0"
        description="Let solo devs try it, feel the 'oh it actually caught something' moment."
        buttonText="Get started for free"
        features={[
          "1 repo connected",
          "Manual / On-Demand Scans",
          "Impact mapping & diffing",
          "No Auto-PRs (manual fix)",
          "Community support",
        ]}
      />
      <PricingCard
        tier="Pro"
        price="$29/mo"
        description="Bread-and-butter tier for indie devs, startups, and small agencies."
        buttonText="Start free trial"
        features={[
          "Up to 10 repos",
          "Scheduled daily scans",
          "Auto-generated fix PRs",
          "Safety scoring on PRs",
          "Email notifications",
        ]}
      />
      <PricingCard
        tier="Business"
        price="$99/mo"
        description="For established engineering teams managing multiple microservices."
        buttonText="Start free trial"
        highlighted={true}
        features={[
          "Up to 50 repos",
          "Real-time webhook scans",
          "Auto-merge for high safety",
          "Slack / Teams integration",
          "PR history & audit logs",
        ]}
      />
      <PricingCard
        tier="Enterprise"
        price="Custom"
        description="Sold, not self-served. For organizations with deep compliance needs."
        buttonText="Contact us"
        features={[
          "Unlimited repos",
          "SSO / SAML",
          "VPC / Self-hosted runner",
          "Custom SLAs",
          "Dedicated Slack channel",
        ]}
      />
    </div>
  );
}
