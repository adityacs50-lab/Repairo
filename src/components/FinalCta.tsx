"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import NeuralBackground from "@/components/ui/flow-field-background";

export function FinalCta() {
  return (
    <section className="relative w-full py-[120px] md:py-[180px] overflow-hidden border-t border-hairline bg-canvas group">
      {/* Background Effect */}
      <div className="absolute inset-0 z-0 opacity-30 group-hover:opacity-50 transition-opacity duration-700">
        <NeuralBackground
          particleCount={200}
          color="#ffffff"
          speed={0.5}
        />
      </div>
      
      {/* Gradient Mask for smooth blending */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(10,10,10,0)_0%,rgba(10,10,10,0.8)_100%)] z-10 pointer-events-none" />

      <div className="relative z-20 mx-auto max-w-[800px] px-[24px] flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="font-mono text-[12px] uppercase tracking-[1.5px] text-body-mid mb-[24px]">
            Ready to automate your maintenance?
          </div>
          
          <h2 className="text-[48px] md:text-[72px] font-normal tracking-[-1.5px] md:tracking-[-2px] text-ink leading-[1.05] mb-[32px]">
            Stop breaking production.<br className="hidden md:block" /> Start repairing it.
          </h2>

          <Link href="/app" className="group/btn relative inline-flex h-[56px] items-center justify-center overflow-hidden rounded-full bg-ink px-[32px] font-medium text-canvas transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)]">
            <span className="relative z-10 flex items-center gap-[8px] text-[16px]">
              Start for free
              <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </span>
            <div className="absolute inset-0 z-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover/btn:duration-1000 group-hover/btn:[transform:skew(-12deg)_translateX(150%)]">
              <div className="relative h-full w-[16px] bg-white/20" />
            </div>
          </Link>
          
          <p className="text-[14px] text-body-mid mt-[24px]">
            No credit card required. Connect GitHub and go.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
