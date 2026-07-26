"use client";

import { useEffect, useState } from "react";
import type { RepairRunResult } from "@/lib/engine/types";

type Repo = {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  defaultBranch: string;
};

type Props = {
  repos: Repo[];
  onDone?: (prUrl: string | null) => void;
};

/**
 * One-shot: pick a real GitHub repo → repair → open PR.
 * No webhook required — best first experience for LinkedIn / cold users.
 */
export function QuickRepair({ repos, onDone }: Props) {
  const [repoFullName, setRepoFullName] = useState(repos[0]?.fullName ?? "");
  const [beforePath, setBeforePath] = useState("openapi.yaml");
  const [afterPath, setAfterPath] = useState("openapi.yaml");
  const [beforeRef, setBeforeRef] = useState("");
  const [afterRef, setAfterRef] = useState("");
  const [consumerPaths, setConsumerPaths] = useState("src/client.ts");
  const [baseBranch, setBaseBranch] = useState("");
  const [phase, setPhase] = useState<"form" | "running" | "done">("form");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RepairRunResult | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!repos[0]) return;
    setRepoFullName((v) => v || repos[0].fullName);
    setBeforeRef((v) => v || repos[0].defaultBranch);
    setAfterRef((v) => v || repos[0].defaultBranch);
    setBaseBranch((v) => v || repos[0].defaultBranch);
  }, [repos]);

  const selected = repos.find((r) => r.fullName === repoFullName) ?? repos[0];

  const steps = [
    "Loading specs from GitHub",
    "Diffing OpenAPI",
    "Tracing impact",
    "Building patches",
  ];

  useEffect(() => {
    if (phase !== "running") return;
    if (step >= steps.length) return;
    const t = window.setTimeout(() => setStep((s) => s + 1), 450);
    return () => window.clearTimeout(t);
  }, [phase, step, steps.length]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setPrUrl(null);
    setResult(null);
    setPhase("running");
    setStep(0);

    try {
      const paths = consumerPaths
        .split(/[\n,]/)
        .map((p) => p.trim())
        .filter(Boolean);
      const res = await fetch("/api/repair/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: selected.owner,
          repo: selected.name,
          beforePath,
          afterPath,
          beforeRef: beforeRef || selected.defaultBranch,
          afterRef: afterRef || selected.defaultBranch,
          consumerPaths: paths,
          consumerRef: baseBranch || selected.defaultBranch,
        }),
      });
      const data = (await res.json()) as {
        result?: RepairRunResult;
        error?: string;
      };
      if (!res.ok || !data.result) {
        throw new Error(data.error ?? "Repair failed — check file paths exist in the repo");
      }
      setResult(data.result);
      setPhase("done");
      setStep(steps.length);
    } catch (err) {
      setPhase("form");
      setError(err instanceof Error ? err.message : "Repair failed");
    }
  }

  async function openPr() {
    if (!selected || !result) return;
    setOpening(true);
    setError(null);
    try {
      const res = await fetch("/api/github/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: selected.owner,
          repo: selected.name,
          base: baseBranch || selected.defaultBranch,
          result,
        }),
      });
      const data = (await res.json()) as {
        pr?: { url: string; number: number };
        error?: string;
      };
      if (!res.ok || !data.pr) {
        throw new Error(data.error ?? "Could not open PR");
      }
      setPrUrl(data.pr.url);
      onDone?.(data.pr.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PR failed");
    } finally {
      setOpening(false);
    }
  }

  if (!repos.length) {
    return (
      <p className="text-sm text-muted">
        No writable repositories found on this GitHub account. Grant repo access
        or create a test repo first.
      </p>
    );
  }

  return (
    <div className="space-y-5 border border-line bg-bg-panel p-5 sm:p-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-bright">
          Try on your GitHub
        </p>
        <h2 className="mt-2 text-xl font-semibold">
          Repair a real repo in one run
        </h2>
        <p className="mt-2 text-sm text-muted">
          Point at before/after OpenAPI paths (or the same path on two refs),
          list consumer TypeScript files, then open a PR on GitHub.
        </p>
      </div>

      {error && (
        <div className="border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          {error}
        </div>
      )}

      {phase === "form" && (
        <form onSubmit={run} className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="font-mono text-[11px] uppercase text-muted-dim">
              Repository
            </span>
            <select
              value={repoFullName}
              onChange={(e) => {
                const repo = repos.find((r) => r.fullName === e.target.value);
                setRepoFullName(e.target.value);
                if (repo) {
                  setBeforeRef(repo.defaultBranch);
                  setAfterRef(repo.defaultBranch);
                  setBaseBranch(repo.defaultBranch);
                }
              }}
              className="w-full border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {repos.map((repo) => (
                <option key={repo.id} value={repo.fullName}>
                  {repo.fullName}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-mono text-[11px] uppercase text-muted-dim">
                Before OpenAPI path
              </span>
              <input
                value={beforePath}
                onChange={(e) => setBeforePath(e.target.value)}
                required
                className="w-full border border-line bg-bg px-3 py-2 font-mono text-xs outline-none focus:border-accent"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-mono text-[11px] uppercase text-muted-dim">
                Before ref (branch/tag/sha)
              </span>
              <input
                value={beforeRef}
                onChange={(e) => setBeforeRef(e.target.value)}
                placeholder="v1.0.0 or main"
                className="w-full border border-line bg-bg px-3 py-2 font-mono text-xs outline-none focus:border-accent"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-mono text-[11px] uppercase text-muted-dim">
                After OpenAPI path
              </span>
              <input
                value={afterPath}
                onChange={(e) => setAfterPath(e.target.value)}
                required
                className="w-full border border-line bg-bg px-3 py-2 font-mono text-xs outline-none focus:border-accent"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-mono text-[11px] uppercase text-muted-dim">
                After ref
              </span>
              <input
                value={afterRef}
                onChange={(e) => setAfterRef(e.target.value)}
                placeholder="main"
                className="w-full border border-line bg-bg px-3 py-2 font-mono text-xs outline-none focus:border-accent"
              />
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="font-mono text-[11px] uppercase text-muted-dim">
              Consumer TypeScript paths
            </span>
            <textarea
              value={consumerPaths}
              onChange={(e) => setConsumerPaths(e.target.value)}
              rows={2}
              required
              className="w-full border border-line bg-bg p-3 font-mono text-xs outline-none focus:border-accent"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-mono text-[11px] uppercase text-muted-dim">
              PR base branch
            </span>
            <input
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              className="w-full border border-line bg-bg px-3 py-2 font-mono text-xs outline-none focus:border-accent"
            />
          </label>

          <p className="text-xs text-muted">
            Tip: use the same OpenAPI path with{" "}
            <span className="font-mono text-accent-bright">beforeRef=v1</span> and{" "}
            <span className="font-mono text-accent-bright">afterRef=main</span>{" "}
            when the file moved between versions.
          </p>

          <button type="submit" className="btn-primary !py-2.5 !text-sm">
            Run repair on this repo
          </button>
        </form>
      )}

      {phase === "running" && (
        <div className="space-y-3">
          <p className="font-mono text-xs text-muted-dim">
            {Math.min(step + 1, steps.length)}/{steps.length}
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            {steps.map((label, i) => (
              <div
                key={label}
                className={`border px-3 py-3 text-xs ${
                  i < step
                    ? "border-accent/50 bg-accent/10 text-accent-bright"
                    : i === step
                      ? "border-line-strong text-fg"
                      : "border-line text-muted-dim"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "done" && result && (
        <div className="space-y-4">
          <div className="grid gap-px bg-line sm:grid-cols-4">
            {[
              ["Breaking", result.summary.breaking],
              ["Additive", result.summary.additive],
              ["Impacted", result.summary.impactedFiles],
              ["Safe fixes", result.summary.safeFixes],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-bg px-3 py-3">
                <p className="font-mono text-[10px] uppercase text-muted-dim">
                  {label}
                </p>
                <p className="text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="border border-line bg-bg p-4">
            <p className="font-mono text-xs text-muted-dim">Draft PR</p>
            <p className="mt-1 font-medium">{result.pullRequest.title}</p>
            <p className="mt-1 text-xs text-muted">
              Safety score {result.pullRequest.safetyScore}/100 ·{" "}
              {result.pullRequest.files.length} file(s)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openPr}
              disabled={
                opening || result.pullRequest.files.length === 0 || Boolean(prUrl)
              }
              className="btn-primary !py-2.5 !text-sm disabled:opacity-50"
            >
              {prUrl
                ? "PR opened"
                : opening
                  ? "Opening on GitHub…"
                  : "Open pull request on GitHub"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase("form");
                setResult(null);
                setPrUrl(null);
              }}
              className="btn-ghost !py-2.5 !text-sm"
            >
              Run again
            </button>
            {prUrl && (
              <a
                href={prUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost !py-2.5 !text-sm"
              >
                View PR
              </a>
            )}
          </div>

          {prUrl && (
            <p className="border border-safe/30 bg-safe/10 px-3 py-2 text-sm text-safe">
              Live on GitHub: {prUrl}
            </p>
          )}

          {result.pullRequest.files.length === 0 && (
            <p className="text-sm text-muted">
              No automatic patches were generated for this diff. Try different
              refs or consumer paths that call the changed API.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
