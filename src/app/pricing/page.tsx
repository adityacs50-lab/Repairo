"use client";

import { motion, Variants } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PricingSection } from "@/components/Pricing";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-canvas text-body font-sans selection:bg-ink selection:text-canvas overflow-x-hidden flex flex-col">
      <SiteHeader active="pricing" />

      <main className="w-full flex-grow flex flex-col justify-center items-center py-[64px] md:py-[120px]">
        <motion.section 
          initial="hidden"
          animate="show"
          variants={containerVariants}
          className="px-[24px] w-full max-w-[1200px] mx-auto"
        >
          <div className="flex flex-col gap-[16px] mb-[64px] text-center items-center">
            <motion.div variants={itemVariants} className="font-mono text-[14px] uppercase tracking-[1.4px] text-ink">
              Pricing
            </motion.div>
            <motion.h1 variants={itemVariants} className="text-[48px] md:text-[64px] leading-[1] font-normal tracking-[-1.2px] md:tracking-[-2px] text-ink max-w-[800px]">
              Simple, transparent pricing.
            </motion.h1>
            <motion.p variants={itemVariants} className="text-[18px] md:text-[24px] text-body-mid leading-[1.5] max-w-[600px] mt-[16px]">
              Start free, upgrade when you need automated PRs and team features.
            </motion.p>
          </div>
          
          <motion.div variants={itemVariants}>
            <PricingSection />
          </motion.div>
        </motion.section>
      </main>

      <SiteFooter />
    </div>
  );
}
