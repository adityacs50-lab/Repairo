"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Scene = {
  id: string;
  duration: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  visual: "logo" | "problem" | "pipeline" | "agent" | "pr" | "cta";
};

const scenes: Scene[] = [
  {
    id: "logo",
    duration: 3500,
    eyebrow: "self-maintaining apis",
    title: "repairo",
    subtitle: "Dependabot for OpenAPI contracts",
    visual: "logo",
  },
  {
    id: "problem",
    duration: 5500,
    eyebrow: "the problem",
    title: "API communication is broken.",
    subtitle:
      "Breaking changes ship quietly. Changelogs don’t get read. Outages follow.",
    visual: "problem",
  },
  {
    id: "pipeline",
    duration: 6500,
    eyebrow: "the product",
    title: "Detect. Impact. Apply.",
    subtitle: "Diff OpenAPI → map TypeScript consumers → open a safe GitHub PR.",
    visual: "pipeline",
  },
  {
    id: "agent",
    duration: 5500,
    eyebrow: "vendor agents",
    title: "Install Stripe’s update agent.",
    subtitle:
      "Watch the public OpenAPI. Scan your repo. Repair when the contract moves.",
    visual: "agent",
  },
  {
    id: "pr",
    duration: 5500,
    eyebrow: "the outcome",
    title: "A real pull request.",
    subtitle: "Review the blast radius. Merge on your terms. Never silent.",
    visual: "pr",
  },
  {
    id: "cta",
    duration: 7000,
    eyebrow: "early access",
    title: "Try it on your GitHub.",
    subtitle: "heyrepairo.in",
    visual: "cta",
  },
];

function SceneVisual({ kind }: { kind: Scene["visual"] }) {
  if (kind === "logo") {
    return (
      <motion.div
        className="grad-text text-6xl font-semibold tracking-tight sm:text-8xl"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        repairo
      </motion.div>
    );
  }

  if (kind === "problem") {
    return (
      <div className="grid w-full max-w-lg gap-2 font-mono text-xs text-muted sm:text-sm">
        {[
          { t: "Stripe ships /v2", tone: "text-warn" },
          { t: "Changelog unread", tone: "text-muted" },
          { t: "Consumer still on /v1", tone: "text-warn" },
          { t: "Production 500s", tone: "text-warn" },
        ].map((row, i) => (
          <motion.div
            key={row.t}
            className={`border border-line bg-bg-panel px-4 py-3 ${row.tone}`}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.2 }}
          >
            {row.t}
          </motion.div>
        ))}
      </div>
    );
  }

  if (kind === "pipeline") {
    return (
      <div className="grid w-full max-w-2xl gap-px bg-line sm:grid-cols-3">
        {[
          { t: "Detect", m: "11 breaking" },
          { t: "Impact", m: "2 files mapped" },
          { t: "Safe PR", m: "score 87" },
        ].map((c, i) => (
          <motion.div
            key={c.t}
            className="bg-bg px-5 py-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.18 }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-dim">
              {c.t}
            </p>
            <p className="mt-3 font-mono text-sm text-fg">{c.m}</p>
          </motion.div>
        ))}
      </div>
    );
  }

  if (kind === "agent") {
    return (
      <motion.div
        className="w-full max-w-md border border-line bg-bg-panel p-5 text-left"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="font-mono text-[11px] uppercase text-muted-dim">
          Install agent
        </p>
        <p className="mt-2 text-xl font-medium">Stripe update agent</p>
        <div className="mt-4 space-y-2 font-mono text-xs text-muted">
          <p>✓ Remote OpenAPI watch</p>
          <p>✓ Scan consumer repo</p>
          <p>✓ Open repair PR</p>
        </div>
        <div className="mt-5 inline-block bg-fg px-3 py-2 text-sm font-medium text-bg">
          Install Stripe agent
        </div>
      </motion.div>
    );
  }

  if (kind === "pr") {
    return (
      <motion.div
        className="w-full max-w-md border border-line bg-bg-panel p-5 text-left font-mono text-xs"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-muted-dim">pull request · opened</p>
        <p className="mt-2 text-sm text-fg">
          fix(integrations): adapt to API v2
        </p>
        <div className="mt-4 space-y-1 text-muted">
          <p className="text-safe">+ idempotencyKey required</p>
          <p>~ pending → processing</p>
          <p>~ base URL /v1 → /v2</p>
        </div>
        <p className="mt-4 text-safe">safety score 87 · review before merge</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <p className="grad-text text-4xl font-semibold tracking-tight sm:text-5xl">
        repairo
      </p>
      <p className="mt-4 font-mono text-sm text-muted">
        heyrepairo.in
      </p>
    </motion.div>
  );
}

export function LaunchReel({
  autoPlay = true,
  loop = true,
}: {
  autoPlay?: boolean;
  loop?: boolean;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay && !reduce);
  const scene = scenes[index];

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= scenes.length - 1) return loop ? 0 : i;
      return i + 1;
    });
  }, [loop]);

  useEffect(() => {
    if (!playing || reduce) return;
    const t = window.setTimeout(next, scene.duration);
    return () => window.clearTimeout(t);
  }, [playing, index, scene.duration, next, reduce]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-black text-fg">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="grad-mesh absolute inset-0 opacity-80" />
        <div className="aurora-band opacity-60" />
      </div>

      <div className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-dim">
          launch reel · {index + 1}/{scenes.length}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="btn-ghost !py-1.5 !text-xs"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={next}
            className="btn-ghost !py-1.5 !text-xs"
          >
            Next
          </button>
          <Link href="/" className="btn-ghost !py-1.5 !text-xs">
            Exit
          </Link>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-16 text-center sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id}
            className="flex w-full max-w-3xl flex-col items-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {scene.eyebrow && scene.visual !== "logo" && (
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-dim">
                {scene.eyebrow}
              </p>
            )}
            {scene.visual === "logo" ? (
              <SceneVisual kind="logo" />
            ) : (
              <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
                {scene.title}
              </h1>
            )}
            {scene.subtitle && (
              <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
                {scene.subtitle}
              </p>
            )}
            {scene.visual !== "logo" && scene.visual !== "cta" && (
              <div className="mt-12 flex w-full justify-center">
                <SceneVisual kind={scene.visual} />
              </div>
            )}
            {scene.visual === "cta" && (
              <div className="mt-10">
                <SceneVisual kind="cta" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 mx-auto mb-6 flex w-full max-w-3xl gap-1 px-5 sm:px-8">
        {scenes.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Go to scene ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-0.5 flex-1 transition ${
              i === index ? "bg-fg" : i < index ? "bg-line-strong" : "bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
