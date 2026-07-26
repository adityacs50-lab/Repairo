"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroVisual } from "@/components/HeroVisual";
import { MotionGradients } from "@/components/MotionGradients";
import {
  HeroEnter,
  PixelCluster,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/Motion";

const trySteps = [
  {
    n: "01",
    title: "Connect GitHub",
    copy: "Teams already trust tools with codebase access. Sign in once — we only read specs and open PRs you approve.",
  },
  {
    n: "02",
    title: "Track the API contract",
    copy: "Point at before/after OpenAPI paths or two refs. When the producer changes, Repairo sees the diff.",
  },
  {
    n: "03",
    title: "Apply the fix as a PR",
    copy: "Scan consumer TypeScript, map impact, open a deterministic repair PR — Dependabot-style, for APIs.",
  },
];

const pillars = [
  {
    title: "Detect drift",
    copy: "Breaking changes ship with little warning. Changelogs don’t get read. Diff OpenAPI the moment a producer releases.",
  },
  {
    title: "Map impact",
    copy: "Scan customer codebases for affected usages — call sites, types, status checks — before downtime shows up.",
  },
  {
    title: "Apply the change",
    copy: "Providers shouldn’t just announce updates. Repairo opens a safe PR with the fix — review, then merge.",
  },
];

export default function HomePage() {
  return (
    <div className="unkey-canvas min-h-screen">
      <MotionGradients />

      <SiteHeader active="home" />

      <main className="relative z-10">
        <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:px-8 sm:pt-28">
          <PixelCluster className="left-4 top-10 sm:left-8 sm:top-16" />
          <PixelCluster className="right-8 top-40 hidden sm:grid" />

          <HeroEnter>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-dim">
              self-maintaining apis · early access
            </p>
            <h1 className="grad-text mt-5 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              repairo
            </h1>
          </HeroEnter>
          <HeroEnter delay={0.1}>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
              Dependabot for APIs. When an OpenAPI contract breaks, scan your
              codebase, identify impacted TypeScript, and open a PR with the
              fix — so vendors don’t just announce changes, they apply them.
            </p>
          </HeroEnter>
          <HeroEnter delay={0.2}>
            <div className="mt-9 flex flex-wrap gap-3">
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link href="/app" className="btn-primary">
                  Try on your GitHub repo
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link href="/demo" className="btn-ghost">
                  Watch 60s demo
                </Link>
              </motion.div>
            </div>
            <p className="mt-4 text-xs text-muted-dim">
              Free to try · Real PR on your repo · Review before merge
            </p>
          </HeroEnter>

          <HeroVisual />
        </section>

        <section className="border-t border-line px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                API communication is broken.
              </h2>
              <p className="mt-4 max-w-2xl text-muted">
                Breaking changes ship quietly. Useful features go unnoticed.
                External API and package changes still cause real outages —
                including a large share of downtime at hyperscale platforms.
                Agentic coding made codebase access normal. What’s missing is
                the application layer that connects API contracts to customer
                repos.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="border-t border-line px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                From sign-in to a live PR on your repo.
              </h2>
              <p className="mt-4 max-w-xl text-muted">
                No sales call required. Connect GitHub, run one repair, see the
                pull request.
              </p>
            </Reveal>
            <Stagger className="mt-12 grid gap-8 sm:grid-cols-3">
              {trySteps.map((step) => (
                <StaggerItem key={step.n}>
                  <article>
                    <p className="font-mono text-xs text-muted-dim">{step.n}</p>
                    <h3 className="mt-3 text-lg font-medium">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {step.copy}
                    </p>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        <section
          id="how"
          className="border-t border-line bg-bg/80 px-5 py-20 sm:px-8"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Detect. Impact. Apply. Like Dependabot — for APIs.
              </h2>
            </Reveal>
            <Stagger className="mt-14 grid gap-px bg-line sm:grid-cols-3">
              {pillars.map((item) => (
                <StaggerItem key={item.title}>
                  <article className="h-full bg-bg px-6 py-8 transition duration-300 hover:bg-bg-panel sm:px-8">
                    <h3 className="text-lg font-medium text-fg">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {item.copy}
                    </p>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        <section
          id="pricing"
          className="border-t border-line px-5 py-20 sm:px-8"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Free to try. Pro when you scale watches.
              </h2>
              <p className="mt-4 max-w-xl text-muted">
                1 integration and 15 runs/month on Free. Pro unlocks 50 watches,
                500 runs, and team seats.
              </p>
              <div className="mt-8">
                <Link href="/pricing" className="btn-ghost">
                  See pricing
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <section
          id="repair"
          className="border-t border-line px-5 py-20 sm:px-8"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                When Stripe ships a break, your consumers shouldn’t find out in
                production.
              </h2>
              <p className="mt-4 max-w-xl text-muted">
                Neutral third-party repair across vendors you track via OpenAPI —
                open the PR, review the blast radius, merge on your terms.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/app" className="btn-primary">
                    Connect GitHub
                  </Link>
                </motion.div>
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/demo" className="btn-ghost">
                    Fixture playground
                  </Link>
                </motion.div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
