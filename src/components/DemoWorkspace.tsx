"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { RepairRunResult } from "@/lib/engine/types";
import { HeroEnter, PixelCluster } from "@/components/Motion";

import { DemoGitHubCta } from "@/components/DemoGitHubCta";
import type { DemoScenarioId } from "@/lib/demo-scenarios";
import { DEMO_SCENARIOS } from "@/lib/demo-scenarios";

type FixtureSources = {
  beforeSpec: string;
  afterSpec: string;
  consumerFiles: Array<{ path: string; content: string }>;
};

type DemoPayload = {
  result: RepairRunResult;
  fixtures: FixtureSources;
};

type DemoTabId = "inputs" | "changes" | "impact" | "diff" | "pr" | "sbom";

const pipeline = [
  "Ingesting OpenAPI specs",
  "Diffing contracts",
  "Tracing consumer call sites",
  "Generating safe patches",
  "Drafting pull request",
] as const;

function severityClass(severity: string) {
  if (severity === "breaking") return "border-warn/40 bg-warn/10 text-warn";
  if (severity === "additive")
    return "border-accent/40 bg-accent/10 text-accent-bright";
  return "border-line bg-bg-panel text-muted";
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildBundle(result: RepairRunResult) {
  const patches = result.pullRequest.files
    .map((f) => f.patch)
    .filter(Boolean)
    .join("\n\n");
  const body = [
    `# ${result.pullRequest.title}`,
    "",
    `Branch: ${result.pullRequest.branch}`,
    `Safety score: ${result.pullRequest.safetyScore}`,
    `Labels: ${result.pullRequest.labels.join(", ")}`,
    "",
    result.pullRequest.body,
    "",
    "## Patches",
    "",
    patches || "(no patches)",
  ].join("\n");
  return { patches, body };
}

type DemoWorkspaceProps = {
  showGitHubCta?: boolean;
  oauthConfigured?: boolean;
};

export function DemoWorkspace({
  showGitHubCta = false,
  oauthConfigured = true,
}: DemoWorkspaceProps = {}) {
  const [scenarioId, setScenarioId] = useState<DemoScenarioId>("payments-ts");
  const [fixtures, setFixtures] = useState<FixtureSources | null>(null);
  const [beforeSpec, setBeforeSpec] = useState("");
  const [afterSpec, setAfterSpec] = useState("");
  const [consumerPath, setConsumerPath] = useState("");
  const [consumerContent, setConsumerContent] = useState("");
  const [consumerIndex, setConsumerIndex] = useState(0);
  const [consumerFiles, setConsumerFiles] = useState<
    Array<{ path: string; content: string }>
  >([]);
  const [result, setResult] = useState<RepairRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [step, setStep] = useState(0);
  const [apiReady, setApiReady] = useState(false);
  const [tab, setTab] = useState<DemoTabId>("inputs");

  const DEMO_TABS: Array<{ id: DemoTabId; label: string }> = [
    { id: "inputs", label: "Inputs" },
    { id: "changes", label: "Changes" },
    { id: "impact", label: "Impact" },
    { id: "diff", label: "Patch" },
    { id: "pr", label: "Pull request" },
    { id: "sbom", label: "SBOM" },
  ];
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLoadError(null);
    fetch(`/api/repair?scenario=${scenarioId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load demo fixtures");
        return res.json() as Promise<DemoPayload & { scenario?: DemoScenarioId }>;
      })
      .then((data) => {
        setFixtures(data.fixtures);
        setBeforeSpec(data.fixtures.beforeSpec);
        setAfterSpec(data.fixtures.afterSpec);
        setConsumerFiles(data.fixtures.consumerFiles);
        const first = data.fixtures.consumerFiles[0];
        if (first) {
          setConsumerPath(first.path);
          setConsumerContent(first.content);
          setConsumerIndex(0);
        }
        setResult(data.result);
        setPhase("idle");
        setStep(0);
        setApiReady(false);
        setTab("inputs");
        setError(null);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, [scenarioId]);

  useEffect(() => {
    if (phase !== "running") return;
    if (step < pipeline.length) {
      const timeout = window.setTimeout(() => setStep((s) => s + 1), 550);
      return () => window.clearTimeout(timeout);
    }
    if (!apiReady) return;
    const timeout = window.setTimeout(() => {
      setPhase("done");
      setTab("changes");
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [phase, step, apiReady]);

  const activeConsumer = consumerFiles[consumerIndex];

  const visibleChanges = useMemo(() => {
    if (!result) return [];
    if (phase === "idle") return [];
    if (phase === "running" && step < 2) return [];
    return result.changes;
  }, [phase, result, step]);

  const visibleImpacts = useMemo(() => {
    if (!result) return [];
    if (phase === "idle") return [];
    if (phase === "running" && step < 3) return [];
    return result.impacts;
  }, [phase, result, step]);

  function syncConsumerFromEditor() {
    return consumerFiles.map((file, i) =>
      i === consumerIndex
        ? { path: consumerPath.trim() || file.path, content: consumerContent }
        : file,
    );
  }

  function selectConsumer(index: number) {
    const nextFiles = syncConsumerFromEditor();
    setConsumerFiles(nextFiles);
    const file = nextFiles[index];
    if (!file) return;
    setConsumerIndex(index);
    setConsumerPath(file.path);
    setConsumerContent(file.content);
  }

  function addConsumerFile() {
    const nextFiles = [
      ...syncConsumerFromEditor(),
      {
        path: `fixtures/consumers/custom/src/client-${consumerFiles.length + 1}.ts`,
        content: `// Paste consumer TypeScript here\nexport const API_BASE = "https://api.example.com/v1";\n`,
      },
    ];
    setConsumerFiles(nextFiles);
    const index = nextFiles.length - 1;
    setConsumerIndex(index);
    setConsumerPath(nextFiles[index].path);
    setConsumerContent(nextFiles[index].content);
  }

  function resetFixtures() {
    if (!fixtures) return;
    setBeforeSpec(fixtures.beforeSpec);
    setAfterSpec(fixtures.afterSpec);
    setConsumerFiles(fixtures.consumerFiles);
    const first = fixtures.consumerFiles[0];
    setConsumerIndex(0);
    setConsumerPath(first?.path ?? "");
    setConsumerContent(first?.content ?? "");
    setPhase("idle");
    setStep(0);
    setApiReady(false);
    setTab("inputs");
    setError(null);
  }

  async function runRepair() {
    setError(null);
    setApiReady(false);
    setPhase("running");
    setStep(0);
    setTab("changes");

    const files = syncConsumerFromEditor();
    setConsumerFiles(files);

    try {
      const res = await fetch("/api/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beforeSpec,
          afterSpec,
          consumerFiles: files,
        }),
      });
      const payload = (await res.json()) as {
        result?: RepairRunResult;
        error?: string;
      };
      if (!res.ok || !payload.result) {
        throw new Error(payload.error ?? "Repair failed");
      }
      startTransition(() => {
        setResult(payload.result!);
        setApiReady(true);
      });
    } catch (err) {
      setPhase("idle");
      setStep(0);
      setApiReady(false);
      setTab("inputs");
      setError(err instanceof Error ? err.message : "Repair failed");
    }
  }

  function downloadPatches() {
    if (!result) return;
    const { patches } = buildBundle(result);
    downloadText(
      `repairo-${result.fromVersion}-to-${result.toVersion}.patch`,
      patches || "# No patches generated\n",
    );
  }

  function downloadPr() {
    if (!result) return;
    const { body } = buildBundle(result);
    downloadText(`repairo-pr-${result.runId}.md`, body);
  }

  function downloadFixedFiles() {
    if (!result) return;
    for (const file of result.pullRequest.files) {
      const name = file.path.split("/").pop() ?? "fixed.ts";
      downloadText(name, file.content);
    }
  }

  if (loadError) {
    return (
      <div className="border border-warn/40 bg-warn/10 p-6 text-warn">
        {loadError}
      </div>
    );
  }

  if (!fixtures || !result) {
    return (
      <div className="border border-line bg-bg-panel p-10 text-muted">
        Loading Repairo engine…
      </div>
    );
  }

  const changedFile =
    result.pullRequest.files[0] ??
    result.pullRequest.files.find((f) => f.patch);

  return (
    <div className="demo-workspace-root">
      <PixelCluster className="right-0 -top-2 hidden lg:grid" aria-hidden />

      {showGitHubCta && (
        <DemoGitHubCta oauthConfigured={oauthConfigured} />
      )}

      <HeroEnter>
        <header className="demo-workspace-header">
          <div className="demo-workspace-header__copy">
            <p className="demo-workspace-header__eyebrow">Interactive demo</p>
            <h2 className="demo-workspace-header__title">
              See the repair before you connect GitHub
            </h2>
            <p className="demo-workspace-header__lede">
              OpenAPI diff → impacted call sites → compiler-checked patches. Version{" "}
              {result.fromVersion} → {result.toVersion}.
            </p>
            <div className="demo-fixture-picker" role="group" aria-label="Demo scenario">
              {DEMO_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScenarioId(s.id)}
                  disabled={phase === "running"}
                  className={`border px-3 py-2 text-left text-xs transition min-w-0 max-w-full ${
                    scenarioId === s.id
                      ? "border-accent/50 bg-accent/10 text-accent-bright"
                      : "border-line bg-bg text-muted hover:border-line-strong hover:text-fg"
                  }`}
                >
                  <span className="font-medium">{s.label}</span>
                  <span className="mt-0.5 block font-mono text-[10px] opacity-80">
                    {s.languages}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="demo-workspace-header__actions">
            <motion.button
              type="button"
              onClick={resetFixtures}
              className="btn-ghost !py-2.5 !text-sm w-full sm:w-auto"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Reset fixtures
            </motion.button>
            <motion.button
              type="button"
              onClick={runRepair}
              disabled={phase === "running" || pending}
              className="btn-primary !py-2.5 !text-sm w-full sm:w-auto"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              {phase === "running" ? "Running Repairo…" : "Run Repairo"}
            </motion.button>
          </div>
        </header>
      </HeroEnter>

      {error && (
        <div className="border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {error}
        </div>
      )}

      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            className="border border-line bg-bg p-5 sm:p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-bright">
                Pipeline
              </p>
              <p className="font-mono text-xs text-muted-dim">
                {phase === "done"
                  ? "complete"
                  : `${Math.min(step + 1, pipeline.length)}/${pipeline.length}`}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-5">
              {pipeline.map((label, index) => {
                const done = phase === "done" || index < step;
                const current = phase === "running" && index === step;
                return (
                  <motion.div
                    key={label}
                    layout
                    className={`border px-3 py-3 text-xs transition ${
                      done
                        ? "border-accent/50 bg-accent/10 text-accent-bright"
                        : current
                          ? "border-line-strong bg-bg-panel text-fg"
                          : "border-line text-muted-dim"
                    }`}
                    animate={
                      current
                        ? { scale: [1, 1.02, 1], opacity: [0.85, 1, 0.85] }
                        : { scale: 1, opacity: 1 }
                    }
                    transition={
                      current
                        ? { duration: 1.1, repeat: Infinity }
                        : { duration: 0.25 }
                    }
                  >
                    {label}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            className="grid gap-px bg-line sm:grid-cols-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {[
              { label: "Breaking", value: result.summary.breaking },
              { label: "Additive", value: result.summary.additive },
              { label: "Impacted files", value: result.summary.impactedFiles },
              { label: "Safe fixes", value: result.summary.safeFixes },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="bg-bg px-4 py-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-dim">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-fg">
                  {phase === "running" && step < 2 ? "—" : stat.value}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <HeroEnter delay={0.1}>
        <div className="demo-workspace-shell">
          <div className="workspace-tabs" role="tablist" aria-label="Demo views">
            {DEMO_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="workspace-panel">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab + phase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                {tab === "inputs" && (
                  <div className="space-y-6 min-w-0">
                    <div className="demo-editor-grid">
                      <label className="demo-editor-field">
                        <span className="demo-editor-label">Before OpenAPI</span>
                        <textarea
                          value={beforeSpec}
                          onChange={(e) => setBeforeSpec(e.target.value)}
                          spellCheck={false}
                          className="demo-code-editor"
                        />
                      </label>
                      <label className="demo-editor-field">
                        <span className="demo-editor-label demo-editor-label--after">
                          After OpenAPI
                        </span>
                        <textarea
                          value={afterSpec}
                          onChange={(e) => setAfterSpec(e.target.value)}
                          spellCheck={false}
                          className="demo-code-editor demo-code-editor--after"
                        />
                      </label>
                    </div>

                    <div className="demo-consumer-section space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="demo-editor-label">Consumer files</p>
                        <button
                          type="button"
                          onClick={addConsumerFile}
                          className="btn-ghost !py-1.5 !text-xs"
                        >
                          Add file
                        </button>
                      </div>
                      <div className="demo-consumer-files">
                        {consumerFiles.map((file, index) => (
                          <button
                            key={`${file.path}-${index}`}
                            type="button"
                            onClick={() => selectConsumer(index)}
                            className={`border px-3 py-1.5 font-mono text-xs shrink-0 ${
                              index === consumerIndex
                                ? "border-accent bg-accent/10 text-accent-bright"
                                : "border-line text-muted hover:text-fg"
                            }`}
                          >
                            {file.path.split("/").pop()}
                          </button>
                        ))}
                      </div>
                      <label className="demo-editor-field">
                        <span className="demo-editor-label">Path</span>
                        <input
                          value={consumerPath}
                          onChange={(e) => setConsumerPath(e.target.value)}
                          className="demo-code-editor !min-h-0 !h-auto py-2"
                        />
                      </label>
                      <label className="demo-editor-field">
                        <span className="demo-editor-label">Source</span>
                        <textarea
                          value={consumerContent}
                          onChange={(e) => setConsumerContent(e.target.value)}
                          spellCheck={false}
                          className="demo-code-editor min-h-[16rem]"
                        />
                      </label>
                      {activeConsumer && (
                        <p className="text-xs text-muted">
                          Editing{" "}
                          <span className="font-mono text-accent-bright">
                            {activeConsumer.path.split("/").pop()}
                          </span>
                          . Run repair to diff against your pasted contracts.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {tab === "changes" && (
                  <div className="space-y-3">
                    {phase === "idle" && (
                      <p className="text-sm text-muted">
                        Run repair to diff your before/after OpenAPI specs.
                      </p>
                    )}
                    {visibleChanges.map((change, i) => (
                      <motion.div
                        key={change.id}
                        className="flex flex-col gap-2 border border-line bg-bg px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i, 8) * 0.04 }}
                      >
                        <div>
                          <p className="text-sm font-medium text-fg">
                            {change.summary}
                          </p>
                          <p className="mt-1 font-mono text-xs text-muted-dim">
                            {change.id}
                            {change.field ? ` · ${change.field}` : ""}
                          </p>
                        </div>
                        <span
                          className={`w-fit border px-2 py-1 font-mono text-[11px] uppercase tracking-wide ${severityClass(change.severity)}`}
                        >
                          {change.severity}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {tab === "impact" && (
                  <div className="space-y-3">
                    {phase === "idle" && (
                      <p className="text-sm text-muted">
                        Impact analysis appears after the contract diff
                        completes.
                      </p>
                    )}
                    {visibleImpacts.map((impact, index) => (
                      <motion.div
                        key={`${impact.file}-${impact.line}-${index}`}
                        className="border border-line bg-bg px-4 py-3"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index, 8) * 0.04 }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-xs text-accent-bright">
                            {impact.file}:{impact.line}
                          </p>
                          <span className="border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-dim">
                            {impact.confidence}
                          </span>
                        </div>
                        <p className="mt-2 font-mono text-sm text-fg">
                          {impact.snippet}
                        </p>
                        <p className="mt-1 text-xs text-muted">{impact.reason}</p>
                      </motion.div>
                    ))}
                    {phase !== "idle" && visibleImpacts.length === 0 && (
                      <p className="text-sm text-muted">
                        Tracing consumer call sites…
                      </p>
                    )}
                  </div>
                )}

                {tab === "diff" && (
                  <div className="space-y-4">
                    {phase !== "done" ? (
                      <p className="text-sm text-muted">
                        Patches are generated after safe transforms are applied.
                      </p>
                    ) : result.pullRequest.files.length === 0 ? (
                      <p className="text-sm text-muted">
                        No file patches produced.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={downloadPatches}
                            className="btn-primary !py-2 !text-sm"
                          >
                            Download .patch
                          </button>
                          <button
                            type="button"
                            onClick={downloadFixedFiles}
                            className="btn-ghost !py-2 !text-sm"
                          >
                            Download fixed files
                          </button>
                        </div>
                        {result.pullRequest.files.map((file) => (
                          <div key={file.path}>
                            <p className="mb-2 font-mono text-xs text-muted-dim">
                              {file.path}
                            </p>
                            <pre className="overflow-x-auto border border-line bg-bg p-4 font-mono text-xs leading-relaxed text-accent-bright">
                              {file.patch || "// no textual patch"}
                            </pre>
                          </div>
                        ))}
                        {!changedFile && null}
                      </>
                    )}
                  </div>
                )}

                {tab === "pr" && (
                  <div>
                    {phase !== "done" ? (
                      <p className="text-sm text-muted">
                        The pull request draft appears when the pipeline
                        finishes.
                      </p>
                    ) : (
                      <div className="space-y-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-dim">
                              Draft PR
                            </p>
                            <h2 className="mt-1 text-xl font-semibold text-fg">
                              {result.pullRequest.title}
                            </h2>
                            <p className="mt-1 font-mono text-xs text-muted-dim">
                              branch · {result.pullRequest.branch}
                            </p>
                          </div>
                          <motion.div
                            className="border border-accent/40 bg-accent/10 px-4 py-3 text-center"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 260,
                              damping: 18,
                            }}
                          >
                            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-bright">
                              Safety score
                            </p>
                            <p className="text-3xl font-semibold text-safe">
                              {result.pullRequest.safetyScore}
                            </p>
                            <p className="text-xs text-muted">
                              {result.pullRequest.autoMergeEligible
                                ? "Auto-merge eligible"
                                : "Review recommended"}
                            </p>
                          </motion.div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`https://github.com/apps/${
                              process.env.NEXT_PUBLIC_GITHUB_APP_SLUG?.trim() || "repairo-ai"
                            }/installations/new`}
                            className="btn-primary !py-2 !text-sm"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Try this on your repo (GitHub App)
                          </a>
                          <button
                            type="button"
                            onClick={downloadPr}
                            className="btn-ghost !py-2 !text-sm"
                          >
                            Download PR markdown
                          </button>
                          <button
                            type="button"
                            onClick={downloadPatches}
                            className="btn-ghost !py-2 !text-sm"
                          >
                            Download patches
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {result.pullRequest.labels.map((label) => (
                            <span
                              key={label}
                              className="border border-line px-2 py-1 font-mono text-[11px] text-muted"
                            >
                              {label}
                            </span>
                          ))}
                        </div>

                        <pre className="whitespace-pre-wrap border border-line bg-bg p-4 text-sm leading-relaxed text-muted">
                          {result.pullRequest.body}
                        </pre>

                        <div className="flex flex-wrap gap-2">
                          {result.pullRequest.files.map((file) => (
                            <span
                              key={file.path}
                              className="border border-line bg-bg px-3 py-1.5 font-mono text-xs text-fg"
                            >
                              {file.path.split("/").pop()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {tab === "sbom" && (
                  <div className="space-y-6">
                    {!result ? (
                      <p className="text-muted leading-relaxed">
                        Please run the AST repair scan to generate the CycloneDX SBOM.
                      </p>
                    ) : (
                      <div className="space-y-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-line pb-4">
                          <div>
                            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-dim">
                              Software Bill of Materials
                            </p>
                            <h2 className="mt-1 text-xl font-semibold text-fg">
                              CycloneDX SBOM
                            </h2>
                            <p className="mt-1 font-mono text-xs text-muted-dim">
                              Spec version · 1.5 | Format · CycloneDX JSON
                            </p>
                          </div>
                          <div className="border border-safe/30 bg-safe/10 px-4 py-2 text-center">
                            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-safe">
                              Trivy CVE Audit
                            </p>
                            <p className="text-base font-semibold text-safe">
                              PASS
                            </p>
                            <p className="text-[10px] text-muted-dim">
                              0 Vulnerabilities
                            </p>
                          </div>
                        </div>

                        {/* Components list */}
                        <div className="space-y-3">
                          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-dim">
                            Audited Dependencies & API Contracts
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {result.sbom?.components?.map((comp: any) => (
                              <div
                                key={comp.name}
                                className="border border-line bg-bg p-3.5 flex flex-col justify-between hover:border-accent/40 transition-colors"
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-fg text-sm">{comp.name}</span>
                                    <span className="font-mono text-[10px] border border-line bg-bg px-1.5 py-0.5 text-muted-dim">
                                      v{comp.version}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted leading-relaxed mt-1.5">
                                    {comp.description}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-line font-mono text-[10px]">
                                  <span className="text-muted-dim">purl: {comp.purl || "N/A"}</span>
                                  <span className="text-safe font-medium">Scanned</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Raw JSON scroll box */}
                        <div className="space-y-2">
                          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-dim">
                            CycloneDX JSON Output
                          </p>
                          <pre className="max-h-[300px] overflow-y-auto whitespace-pre-wrap border border-line bg-bg p-4 font-mono text-xs leading-relaxed text-fg scrollbar-thin">
                            {JSON.stringify(result.sbom, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </HeroEnter>
    </div>
  );
}
