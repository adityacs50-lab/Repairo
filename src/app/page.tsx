"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform, Variants } from "framer-motion";
import { useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DitheringShader } from "@/components/ui/dithering-shader";
import { FeatureCard } from "@/components/FeaturePanel";
import { HowItWorks } from "@/components/HowItWorks";
import { CodeInstallSnippet } from "@/components/CodeInstallSnippet";
import NeuralBackground from "@/components/ui/flow-field-background";
import { EcosystemBand } from "@/components/EcosystemBand";
import { FaqSection } from "@/components/FaqSection";
import { FinalCta } from "@/components/FinalCta";

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

const terminalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: "easeOut", delay: 0.2 } },
};

export default function HomePage() {
  // Mouse tracking for the Sphere interactive tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 25, stiffness: 150 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);
  
  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position from -0.5 to 0.5
      mouseX.set(e.clientX / window.innerWidth - 0.5);
      mouseY.set(e.clientY / window.innerHeight - 0.5);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="relative min-h-screen bg-canvas text-body font-sans selection:bg-ink selection:text-canvas overflow-x-hidden">
      <div className="fixed inset-0 z-0">
        <NeuralBackground color="#ffffff" trailOpacity={0.15} particleCount={400} speed={0.8} />
      </div>

      <div className="relative z-10">
        <SiteHeader active="home" />

        <main className="w-full">
        {/* HERO SECTION */}
        <section className="px-[24px] py-[64px] md:py-[120px] max-w-[1200px] mx-auto min-h-[80vh] flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[64px] lg:gap-[48px] items-center">
            
            {/* Left Column: Copy */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-[32px] max-w-[600px] relative z-10"
            >
              <motion.h1 
                variants={itemVariants}
                className="text-[48px] md:text-[80px] lg:text-[96px] leading-[1] font-normal tracking-[-1.2px] md:tracking-[-2.4px] text-ink"
              >
                Self-maintaining APIs.
              </motion.h1>
              <motion.p 
                variants={itemVariants}
                className="text-[18px] md:text-[24px] text-body-mid font-normal leading-[1.4]"
              >
                Repairo detects OpenAPI spec changes, maps the impact across your codebase, and opens a safe PR automatically.
              </motion.p>
              <motion.div 
                variants={itemVariants}
                className="flex gap-[16px] mt-[16px] flex-wrap"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/app"
                    className="flex items-center justify-center rounded-full bg-primary px-[24px] py-[12px] text-[14px] text-on-primary border border-primary hover:bg-transparent hover:text-ink transition-colors"
                  >
                    Sign up now
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/docs"
                    className="flex items-center justify-center rounded-full bg-transparent px-[24px] py-[12px] text-[14px] text-ink border border-hairline hover:border-body-mid transition-colors"
                  >
                    Read announcement
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Column: Shader Sphere */}
            <div className="w-full flex justify-center lg:justify-end perspective-[1000px]">
              <motion.div 
                variants={terminalVariants}
                initial="hidden"
                animate="show"
                style={{
                  rotateX,
                  rotateY,
                  transformStyle: "preserve-3d"
                }}
                className="w-full relative aspect-square max-w-[360px] xl:max-w-[420px] rounded-sm"
              >
                <DitheringShader 
                  shape="sphere"
                  type="random"
                  colorBack="transparent"
                  colorFront="#ffffff"
                  pxSize={2}
                  speed={1.5}
                  className="w-full h-full rounded-sm overflow-hidden"
                />
              </motion.div>
            </div>

          </div>
        </section>

        <div className="w-full h-[1px] bg-hairline" />

        {/* ECOSYSTEM BAND */}
        <EcosystemBand />

        {/* FEATURES BAND */}
        <motion.section 
          id="features"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="px-[24px] py-[96px] max-w-[1200px] mx-auto"
        >
          <div className="flex flex-col gap-[16px] mb-[64px]">
            <motion.div variants={itemVariants} className="font-mono text-[14px] uppercase tracking-[1.4px] text-ink">
              Platform Features
            </motion.div>
            <motion.h2 variants={itemVariants} className="text-[32px] md:text-[48px] leading-[1] font-normal tracking-[-0.6px] md:tracking-[-1.2px] text-ink">
              Understand the blast radius.
            </motion.h2>
          </div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
            <FeatureCard 
              title="Automatic change detection" 
              description="We continuously poll the OpenAPI specs of your dependencies. When a breaking change is released, Repairo catches the diff instantly." 
            />
            <FeatureCard 
              title="Impact mapping across the codebase" 
              description="Repairo scans your entire codebase to find every affected call site, type definition, and status check. We understand TypeScript at a deep level." 
            />
            <FeatureCard 
              title="Safe, reviewable PRs" 
              description="No blind auto-merging. Repairo generates a clean, deterministic patch and opens a Pull Request on your repository." 
            />
            <FeatureCard 
              title="Zero configuration" 
              description="Connect your GitHub account and point Repairo at an OpenAPI URL. We handle the rest." 
            />
          </motion.div>
        </motion.section>

        <div className="w-full h-[1px] bg-hairline" />

        {/* HOW IT WORKS BAND */}
        <motion.section 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="px-[24px] py-[96px] max-w-[1200px] mx-auto"
        >
          <div className="flex flex-col gap-[16px] mb-[64px]">
            <motion.div variants={itemVariants} className="font-mono text-[14px] uppercase tracking-[1.4px] text-ink">
              Pipeline
            </motion.div>
            <motion.h2 variants={itemVariants} className="text-[32px] md:text-[48px] leading-[1] font-normal tracking-[-0.6px] md:tracking-[-1.2px] text-ink">
              How Repairo works.
            </motion.h2>
          </div>
          <motion.div variants={itemVariants}>
            <HowItWorks />
          </motion.div>
        </motion.section>

        <div className="w-full h-[1px] bg-hairline" />

        {/* INSTALL BAND */}
        <motion.section 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="px-[24px] py-[96px] max-w-[1200px] mx-auto"
        >
          <div className="flex flex-col md:flex-row gap-[48px]">
            <div className="flex-1 flex flex-col gap-[16px]">
              <motion.div variants={itemVariants} className="font-mono text-[14px] uppercase tracking-[1.4px] text-ink">
                Quickstart
              </motion.div>
              <motion.h2 variants={itemVariants} className="text-[32px] md:text-[48px] leading-[1] font-normal tracking-[-0.6px] md:tracking-[-1.2px] text-ink">
                Get started locally.
              </motion.h2>
              <motion.p variants={itemVariants} className="text-[18px] text-body-mid leading-[1.5] max-w-[400px] mt-[16px]">
                Install the CLI to test our static analyzer against your codebase before deploying to GitHub Actions.
              </motion.p>
            </div>
            <motion.div variants={itemVariants} className="flex-1">
              <CodeInstallSnippet />
            </motion.div>
          </div>
        </motion.section>

        <FaqSection />
        
        <FinalCta />

      </main>

      <SiteFooter />
      </div>
    </div>
  );
}

