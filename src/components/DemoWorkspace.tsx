"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { RepairRunResult } from "@/lib/engine/types";
import { HeroEnter } from "@/components/Motion";

import { DemoGitHubCta } from "@/components/DemoGitHubCta";
import { DemoSplitDiff } from "@/components/demo/DemoSplitDiff";
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

type StoryStepId = "break" | "impact" | "fix";

const pipeline = [
  "Comparing specs",
  "Flagging breaking changes",
  "Generating the fix",
] as const;

const STORY_STEPS: Array<{ id: StoryStepId; label: string; blurb: string }> = [
  {
    id: "break",
    label: "1. The break",
    blurb: "What the vendor changed in their OpenAPI contract.",
  },
  {
    id: "impact",
    label: "2. The impact",
    blurb: "Which files and call sites in your repo are affected.",
  },
  {
    id: "fix",
    label: "3. The fix",
    blurb: "The patch Repairo generated — validated before you merge.",
  },
];

function severityClass(severity: string) {
  if (severity === "breaking")
    return "border-red-500/40 bg-red-500/10 text-red-400";
  if (severity === "additive")
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
  return "border-zinc-700 bg-zinc-900/40 text-zinc-400";
}

function metricValueClass(label: string) {
  if (label === "Breaking") return "demo-metric-card__value--breaking";
  if (label === "Additive" || label === "Safe fixes")
    return "demo-metric-card__value--additive";
  if (label === "Impacted files") return "demo-metric-card__value--impact";
  return "";
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
  const [tab, setTab] = useState<StoryStepId>("break");
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
        setTab("break");
        setError(null);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, [scenarioId]);

  useEffect(() => {
    if (phase !== "running") return;
    if (step < pipeline.length) {
      const timeout = window.setTimeout(() => setStep((s) => s + 1), 600);
      return () => window.clearTimeout(timeout);
    }
    if (!apiReady) return;
    const timeout = window.setTimeout(() => {
      setPhase("done");
      setTab("fix");
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [phase, step, apiReady]);

  useEffect(() => {
    if (phase !== "running") return;
    if (step >= 1) setTab("break");
    if (step >= 2) setTab("impact");
  }, [phase, step]);

  const visibleChanges = useMemo(() => {
    if (!result) return [];
    if (phase === "running" && step < 1) return [];
    return result.changes.slice(0, 10);
  }, [phase, result, step]);

  const visibleImpacts = useMemo(() => {
    if (!result) return [];
    if (phase === "running" && step < 2) return [];
    return result.impacts.slice(0, 32);
  }, [phase, result, step]);

  const impactsByFile = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, typeof visibleImpacts>();
    for (const impact of visibleImpacts) {
      if (!map.has(impact.file)) {
        order.push(impact.file);
        map.set(impact.file, []);
      }
      map.get(impact.file)!.push(impact);
    }
    return order.map((file) => ({
      file,
      fileName: file.split("/").pop() ?? file,
      impacts: map.get(file)!,
    }));
  }, [visibleImpacts]);

  const primaryFix = useMemo(() => {
    if (!result) return null;
    return (
      result.fixes.find((f) => f.safe && f.before && f.after) ??
      result.fixes.find((f) => f.before && f.after) ??
      null
    );
  }, [result]);

  const storyStep = STORY_STEPS.find((s) => s.id === tab);

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
    setTab("break");
    setError(null);
  }

  async function runRepair() {
    setError(null);
    setApiReady(false);
    setPhase("running");
    setStep(0);
    setTab("break");

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
      setTab("break");
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

  const showFixPanel =
    phase === "done" ||
    phase === "idle" ||
    (phase === "running" && step >= 2 && apiReady);

  return (
    <div className="demo-workspace-root">
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
            <details className="demo-advanced-fixtures">
              <summary>Edit OpenAPI &amp; consumer code (optional)</summary>
              <div className="demo-advanced-fixtures__body space-y-6 min-w-0">
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
                      className="demo-code-editor min-h-[12rem]"
                    />
                  </label>
                </div>
              </div>
            </details>
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
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-400">
                Pipeline
              </p>
              <p className="font-mono text-xs text-zinc-600">
                {phase === "done"
                  ? "Complete"
                  : `Step ${Math.min(step + 1, pipeline.length)} of ${pipeline.length}`}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {pipeline.map((label, index) => {
                const done = phase === "done" || index < step;
                const current = phase === "running" && index === step;
                const pending = !done && !current;
                return (
                  <div
                    key={label}
                    className={`demo-pipeline-step ${
                      current
                        ? "demo-pipeline-step--active"
                        : done
                          ? "demo-pipeline-step--done"
                          : pending
                            ? "demo-pipeline-step--pending"
                            : ""
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            className="demo-metrics-strip"
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
                className="demo-metric-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-dim">
                  {stat.label}
                </p>
                <p
                  className={`mt-2 text-3xl font-semibold ${metricValueClass(stat.label)}`}
                >
                  {phase === "running" && step < 1 && stat.label === "Breaking"
                    ? "—"
                    : phase === "running" && step < 2 && stat.label === "Impacted files"
                      ? "—"
                      : stat.value}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <HeroEnter delay={0.1}>
        <div className="demo-workspace-shell">
          <div className="workspace-tabs" role="tablist" aria-label="Repair story">
            {STORY_STEPS.map(({ id, label }) => (
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
            {storyStep ? (
              <p className="demo-story-intro">
                <strong>{storyStep.label}</strong> — {storyStep.blurb}
              </p>
            ) : null}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab + phase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                {tab === "break" && (
                  <div className="space-y-3">
                    {visibleChanges.length === 0 && (
                      <p className="text-sm text-zinc-500">
                        Run Repairo to diff the vendor OpenAPI specs.
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
                  <div className="space-y-4">
                    {impactsByFile.length === 0 && (
                      <p className="text-sm text-zinc-500">
                        Impact mapping runs right after the contract diff.
                      </p>
                    )}
                    {impactsByFile.map((group, groupIndex) => (
                      <section
                        key={group.file}
                        className="demo-impact-file-group"
                        aria-labelledby={`impact-file-${groupIndex}`}
                      >
                        <header className="demo-impact-file-group__header">
                          <h3
                            id={`impact-file-${groupIndex}`}
                            className="demo-impact-file-group__title"
                          >
                            {group.fileName}
                          </h3>
                          <p className="demo-impact-file-group__path">{group.file}</p>
                          <p className="demo-impact-file-group__count">
                            {group.impacts.length} call site
                            {group.impacts.length === 1 ? "" : "s"}
                          </p>
                        </header>
                        <ul className="demo-impact-file-group__list">
                          {group.impacts.map((impact, index) => (
                            <motion.li
                              key={`${impact.file}-${impact.line}-${impact.column}-${index}`}
                              className="demo-impact-file-group__item"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                delay: Math.min(groupIndex * 0.05 + index * 0.03, 0.4),
                              }}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-mono text-xs text-amber-400/90">
                                  line {impact.line}
                                  {impact.column ? `:${impact.column}` : ""}
                                </p>
                                <span className="border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-dim">
                                  {impact.confidence}
                                </span>
                              </div>
                              <p className="mt-2 font-mono text-sm text-fg">
                                {impact.snippet}
                              </p>
                              <p className="mt-1 text-xs text-muted">{impact.reason}</p>
                            </motion.li>
                          ))}
                        </ul>
                      </section>
                    ))}
                    {phase !== "idle" && visibleImpacts.length === 0 && (
                      <p className="text-sm text-muted">
                        Tracing consumer call sites…
                      </p>
                    )}
                  </div>
                )}

                {tab === "fix" && (
                  <div className="space-y-5">
                    {!showFixPanel ? (
                      <p className="text-sm text-zinc-500">
                        Repairo is applying safe AST transforms and running compile checks…
                      </p>
                    ) : !primaryFix ? (
                      <p className="text-sm text-zinc-500">
                        No automatic fix for this scenario — review flagged impacts manually.
                      </p>
                    ) : (
                      <>
                        <DemoSplitDiff
                          file={primaryFix.file}
                          before={primaryFix.before}
                          after={primaryFix.after}
                          description={primaryFix.description}
                        />
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-line bg-bg px-4 py-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                              Draft pull request
                            </p>
                            <p className="text-sm font-medium text-fg truncate">
                              {result.pullRequest.title}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {result.typecheck.passed
                                ? "Typecheck passed"
                                : "Review compile output before merge"}
                              {" · "}
                              {result.summary.safeFixes} safe fix
                              {result.summary.safeFixes === 1 ? "" : "es"}
                            </p>
                          </div>
                          <div className="shrink-0 text-center border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
                            <p className="font-mono text-[9px] uppercase tracking-wider text-emerald-400">
                              Safety
                            </p>
                            <p className="text-2xl font-semibold text-emerald-400">
                              {result.pullRequest.safetyScore}
                            </p>
                          </div>
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
                            Open on your repo
                          </a>
                          <button
                            type="button"
                            onClick={downloadFixedFiles}
                            className="btn-ghost !py-2 !text-sm"
                          >
                            Download fixed files
                          </button>
                          <button
                            type="button"
                            onClick={downloadPr}
                            className="btn-ghost !py-2 !text-sm"
                          >
                            PR summary
                          </button>
                        </div>
                      </>
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
