"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroDashboardCard } from "@/components/HeroDashboardCard";
import { FeaturePanel } from "@/components/FeaturePanel";
import { HowItWorks } from "@/components/HowItWorks";
import { CodeInstallSnippet } from "@/components/CodeInstallSnippet";
import { FaqSection } from "@/components/FaqSection";
import { FinalCta } from "@/components/FinalCta";
import { containerVariants, itemVariants, buttonPressVariant } from "@/lib/animationVariants";
import { BenchmarkSection } from "@/components/BenchmarkSection";
import { EnterpriseSecurity } from "@/components/EnterpriseSecurity";
import { TeamSection } from "@/components/TeamSection";
import { BookDemoSection } from "@/components/BookDemoSection";

const logos = [
  { name: "OpenAI", icon: <svg className="w-4 h-4 fill-current text-ink" viewBox="0 0 24 24"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9 6.0651 6.0651 0 0 0-4.981-2.01 6.0094 6.0094 0 0 0-5.724 4.0217 6.0094 6.0094 0 0 0-3.994 2.915 6.0504 6.0504 0 0 0 .7427 7.0466 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.596 24a6.056 6.056 0 0 0 5.7578-4.02 6.0094 6.0094 0 0 0 3.9933-2.915 6.0462 6.0462 0 0 0-.7427-7.0466z"/></svg>, className: "text-ink" },
  { name: "Gemini", icon: <svg className="w-4 h-4 fill-current text-accent-blue" viewBox="0 0 24 24"><path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z"/></svg>, className: "text-accent-blue" },
  { name: "ANTHROPIC", className: "font-mono tracking-widest text-sm text-accent-orange" },
  { name: "stripe", className: "font-serif italic text-lg tracking-tight lowercase text-accent-blue" },
  { name: "supabase", icon: <svg className="w-3.5 h-3.5 fill-current text-accent-green" viewBox="0 0 24 24"><path d="M13.359 1.954a1.086 1.086 0 0 0-1.748.272L6.155 13.89a.543.543 0 0 0 .49.774h6.05l-1.054 7.382a1.086 1.086 0 0 0 1.748-.272l5.456-11.664a.543.543 0 0 0-.49-.774h-6.05l-1.054 7.382z"/></svg>, className: "text-accent-green" },
  { name: "GitHub", icon: <svg className="w-4 h-4 fill-current text-ink" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>, className: "text-ink" }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas text-ink font-sans selection:bg-surface-light selection:text-primary-on">
      {/* HEADER */}
      <SiteHeader />

      <main className="w-full">
        {/* HERO SECTION */}
        <section className="pt-20 md:pt-32 pb-16 px-6 md:px-12 max-w-5xl mx-auto text-center overflow-hidden">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center gap-6"
          >
            <motion.h1
              variants={itemVariants}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-medium tracking-tight text-ink leading-[1.05]"
            >
              Stop breaking production.<br />
              <span className="bg-ink text-primary-on px-4 py-1.5 rounded-xl inline-block mt-2">
                Start repairing it.
              </span>
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-mute font-normal leading-relaxed max-w-2xl mx-auto"
            >
              Repairo detects OpenAPI spec changes, maps the impact across your codebase, and opens a safe PR automatically.
            </motion.p>
            <motion.div variants={itemVariants} className="flex items-center gap-4 pt-2">
              <motion.div {...buttonPressVariant}>
                <Link
                  href="/app"
                  className="inline-block bg-ink text-primary-on font-medium px-7 py-3.5 rounded-full text-sm hover:bg-body transition-colors"
                >
                  Start for free
                </Link>
              </motion.div>
              <motion.div {...buttonPressVariant}>
                <Link
                  href="/docs"
                  className="inline-block bg-surface-card border border-hairline-strong text-ink font-medium px-7 py-3.5 rounded-full text-sm hover:bg-surface-elevated transition-colors"
                >
                  Read the docs
                </Link>
              </motion.div>
            </motion.div>

            {/* Trust Line */}
            <motion.div variants={itemVariants} className="mt-8">
              <p className="text-sm text-mute font-medium">
                Built for TypeScript & OpenAPI. Backed by top DevTools advisors.
              </p>
            </motion.div>

            {/* Social Proof - Endless Scrolling Marquee */}
            <motion.div variants={itemVariants} className="pt-8 w-full relative">
              <p className="font-mono text-[11px] uppercase tracking-widest text-charcoal mb-6">
                POWERING THE WORLD&apos;S LEADING APIS
              </p>
              
              <div className="absolute left-0 top-10 bottom-0 w-24 bg-gradient-to-r from-canvas to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-10 bottom-0 w-24 bg-gradient-to-l from-canvas to-transparent z-10 pointer-events-none" />

              <div className="flex overflow-hidden w-full select-none">
                <motion.div
                  className="flex gap-20 text-charcoal font-semibold text-base shrink-0 items-center justify-around min-w-full"
                  animate={{ x: ["-50%", "0%"] }}
                  transition={{
                    ease: "linear",
                    duration: 25,
                    repeat: Infinity,
                  }}
                >
                  {/* Set 1 */}
                  {logos.map((logo, index) => (
                    <span key={`l1-${index}`} className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity shrink-0 duration-200 cursor-pointer">
                      {logo.icon}
                      <span className={logo.className}>{logo.name}</span>
                    </span>
                  ))}
                  {/* Set 2 */}
                  {logos.map((logo, index) => (
                    <span key={`l2-${index}`} className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity shrink-0 duration-200 cursor-pointer">
                      {logo.icon}
                      <span className={logo.className}>{logo.name}</span>
                    </span>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Dashboard Mockup - Full width below hero */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98], delay: 0.3 }}
            className="mt-16"
          >
            <HeroDashboardCard />
          </motion.div>
        </section>

        {/* BENCHMARK / AUTHORITY SECTION */}
        <BenchmarkSection />

        {/* FEATURES SECTION */}
        <FeaturePanel />

        {/* PIPELINE / HOW IT WORKS SECTION */}
        <HowItWorks />

        {/* QUICKSTART CODE SNIPPET SECTION */}
        <CodeInstallSnippet />

        {/* ENTERPRISE SECURITY SECTION */}
        <EnterpriseSecurity />

        {/* FAQ SECTION */}
        <FaqSection />

        {/* TEAM SECTION */}
        <TeamSection />

        {/* BOOK DEMO SECTION */}
        <BookDemoSection />

        {/* FINAL CTA SECTION */}
        <FinalCta />
      </main>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  );
}
