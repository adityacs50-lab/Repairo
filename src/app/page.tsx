"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroDashboardCard } from "@/components/HeroDashboardCard";
import { EcosystemBand } from "@/components/EcosystemBand";
import { FeaturePanel } from "@/components/FeaturePanel";
import { HowItWorks } from "@/components/HowItWorks";
import { CodeInstallSnippet } from "@/components/CodeInstallSnippet";
import { FaqSection } from "@/components/FaqSection";
import { FinalCta } from "@/components/FinalCta";
import { containerVariants, itemVariants, buttonPressVariant } from "@/lib/animationVariants";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-black selection:text-white">
      {/* HEADER */}
      <SiteHeader />

      <main className="w-full">
        {/* HERO SECTION */}
        <section className="py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Hero Text */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-5 flex flex-col items-start gap-6"
            >
              <motion.h1
                variants={itemVariants}
                className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-black leading-[1.05]"
              >
                Self-maintaining<br />
                APIs.
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="text-lg md:text-xl text-neutral-600 font-normal leading-relaxed max-w-md"
              >
                Repairo detects OpenAPI spec changes, maps the impact across your codebase, and opens a safe PR automatically.
              </motion.p>
              <motion.div variants={itemVariants} className="flex items-center gap-4 pt-2">
                <motion.div {...buttonPressVariant}>
                  <Link
                    href="/app"
                    className="inline-block bg-black text-white font-medium px-6 py-3 rounded-full text-sm hover:bg-neutral-800 transition-colors"
                  >
                    Sign up now
                  </Link>
                </motion.div>
                <motion.div {...buttonPressVariant}>
                  <Link
                    href="/docs"
                    className="inline-block bg-white border border-neutral-300 text-neutral-800 font-medium px-6 py-3 rounded-full text-sm hover:bg-neutral-50 transition-colors"
                  >
                    Read announcement
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Column: Embedded Dashboard Mockup */}
            <div className="lg:col-span-7">
              <HeroDashboardCard />
            </div>
          </div>
        </section>

        {/* ECOSYSTEM LOGO BAND */}
        <EcosystemBand />

        {/* FEATURES SECTION */}
        <FeaturePanel />

        {/* PIPELINE / HOW IT WORKS SECTION */}
        <HowItWorks />

        {/* QUICKSTART CODE SNIPPET SECTION */}
        <CodeInstallSnippet />

        {/* FAQ SECTION */}
        <FaqSection />

        {/* FINAL CTA SECTION */}
        <FinalCta />
      </main>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  );
}
