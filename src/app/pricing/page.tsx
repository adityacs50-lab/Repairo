"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroEnter, Reveal, Stagger, StaggerItem } from "@/components/Motion";
import { MotionGradients } from "@/components/MotionGradients";
import { PLANS } from "@/lib/billing/plans";

export default function PricingPage() {
  const plans = [PLANS.free, PLANS.pro];

  return (
    <div className="unkey-canvas min-h-screen">
      <MotionGradients />
      <SiteHeader active="pricing" />

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <HeroEnter>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-dim">
            pricing
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Start free. Upgrade when you watch more repos.
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            OpenAPI drift → TypeScript impact → real GitHub PRs. No seats tax on
            Free for solo builders.
          </p>
        </HeroEnter>

        <Stagger className="mt-14 grid gap-px bg-line sm:grid-cols-2">
          {plans.map((plan) => (
            <StaggerItem key={plan.id}>
              <article
                className={`flex h-full flex-col bg-bg px-6 py-8 sm:px-8 ${
                  plan.id === "pro" ? "bg-bg-panel" : ""
                }`}
              >
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-dim">
                  {plan.name}
                </p>
                <p className="mt-4 text-4xl font-semibold tracking-tight">
                  {plan.priceLabel}
                  {plan.id === "pro" && (
                    <span className="text-base font-normal text-muted">
                      /mo
                    </span>
                  )}
                </p>
                <ul className="mt-8 flex-1 space-y-3 text-sm text-muted">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-fg">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <motion.div
                  className="mt-10"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href="/app"
                    className={plan.id === "pro" ? "btn-primary" : "btn-ghost"}
                  >
                    {plan.id === "pro" ? "Upgrade in app" : "Start free"}
                  </Link>
                </motion.div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mt-16 border border-line bg-bg-panel/80 p-6">
          <h2 className="text-lg font-medium">What counts as a run?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            A run is one repair execution — Quick Repair on a repo, manual “Run
            now” on a watched integration, or an automatic webhook repair.
            Opening the PR after a repair does not consume an extra run.
          </p>
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}
