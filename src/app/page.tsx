"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroVisual } from "@/components/HeroVisual";
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
    copy: "Sign in once. Repairo only uses access to read specs and open PRs you approve.",
  },
  {
    n: "02",
    title: "Point at your OpenAPI",
    copy: "Pick before/after paths or two refs (e.g. v1 tag → main) plus consumer TypeScript files.",
  },
  {
    n: "03",
    title: "Open a real PR",
    copy: "Review the blast radius, then push a branch and PR straight to your repository.",
  },
];

const pillars = [
  {
    title: "Detect drift",
    copy: "Diff OpenAPI the moment a producer releases — breaking, additive, and safe changes classified automatically.",
  },
  {
    title: "Map impact",
    copy: "Trace call sites, types, and status checks across consumer services before customers hit the bug.",
  },
  {
    title: "Safe PRs",
    copy: "Deterministic transforms only — URL bumps, required fields, enum renames — with a safety score.",
  },
];

export default function HomePage() {
  return (
    <div className="unkey-canvas min-h-screen">
      <div className="grad-mesh" aria-hidden>
        <motion.div
          className="grad-orb grad-orb-scooter"
          animate={{ x: [0, 30, 0], y: [0, 18, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="grad-orb grad-orb-reef"
          animate={{ x: [0, -24, 0], y: [0, 22, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="grad-orb grad-orb-aqua"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        className="cloud-drift pointer-events-none absolute inset-x-0 top-0 h-[70vh]"
        aria-hidden
        animate={{ x: [0, 18, 0], y: [0, -10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <SiteHeader active="home" />

      <main className="relative z-10">
        <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:px-8 sm:pt-28">
          <PixelCluster className="left-4 top-10 sm:left-8 sm:top-16" />
          <PixelCluster className="right-8 top-40 hidden sm:grid" />

          <HeroEnter>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent-bright">
              now in early access
            </p>
            <h1 className="grad-text mt-5 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              repairo
            </h1>
          </HeroEnter>
          <HeroEnter delay={0.1}>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              Self-maintaining API integrations. Diff OpenAPI, find what breaks,
              open a safe pull request on your GitHub — in minutes.
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

        <section className="section-wash border-t border-line px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                From LinkedIn to a live PR on your repo.
              </h2>
              <p className="mt-4 max-w-xl text-muted">
                No sales call required. Connect GitHub, run one repair, see the
                pull request.
              </p>
            </Reveal>
            <Stagger className="mt-12 grid gap-8 sm:grid-cols-3">
              {trySteps.map((step) => (
                <StaggerItem key={step.n}>
                  <article className="grad-border border border-line/80 bg-bg-panel/40 p-5 backdrop-blur-sm">
                    <p className="font-mono text-xs text-accent-bright">
                      {step.n}
                    </p>
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
          className="border-t border-line bg-bg-elevated/80 px-5 py-20 sm:px-8"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Detect. Impact. Repair. One control plane.
              </h2>
            </Reveal>
            <Stagger className="mt-14 grid gap-px bg-line sm:grid-cols-3">
              {pillars.map((item) => (
                <StaggerItem key={item.title}>
                  <article className="h-full bg-bg px-6 py-8 transition duration-300 hover:bg-bg-panel sm:px-8">
                    <div className="grad-bar mb-5 w-10" />
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
          id="repair"
          className="relative border-t border-line px-5 py-20 sm:px-8"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "linear-gradient(135deg, rgba(54,209,220,0.12) 0%, rgba(91,134,229,0.16) 100%)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl">
            <Reveal>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Built for the next OpenAPI break — not the postmortem.
              </h2>
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
