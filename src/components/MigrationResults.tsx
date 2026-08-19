"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  ExternalLink,
  FileCode,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Layers,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import {
  normalizeMigrationResult,
  type MigrationResultViewModel,
  type NormalizedImpact,
  type NormalizedFix,
} from "@/lib/adapters/migrationResultAdapter";

interface Props {
  /** Raw engine output (RepairRunResult) or normalized benchmark JSON */
  data?: unknown;
  /** Optional title override */
  title?: string;
  /** Optional callback to trigger opening PR or returning to workspace */
  onBack?: () => void;
  onOpenPR?: () => void;
  /** Show back button if true */
  showBackButton?: boolean;
}

export function MigrationResults({
  data,
  title = "Migration Results",
  onBack,
  onOpenPR,
  showBackButton = false,
}: Props) {
  const model: MigrationResultViewModel = useMemo(
    () => normalizeMigrationResult(data),
    [data]
  );

  const [copiedBranch, setCopiedBranch] = useState(false);

  // UX Collapse / Expand States for < 30 sec visual scanability
  const [showAllChanges, setShowAllChanges] = useState(false);
  const [expandedImpactFiles, setExpandedImpactFiles] = useState<Record<string, boolean>>({});
  const [expandedFixFiles, setExpandedFixFiles] = useState<Record<string, boolean>>({});
  const [showPrBody, setShowPrBody] = useState(false);

  // Group impacts by file path
  const impactsByFile = useMemo(() => {
    const map: Record<string, { file: string; items: NormalizedImpact[]; highestConfidence: "high" | "medium" | "low" }> = {};
    for (const imp of model.impacts) {
      if (!map[imp.file]) {
        map[imp.file] = { file: imp.file, items: [], highestConfidence: imp.confidence };
      }
      map[imp.file].items.push(imp);
      if (imp.confidence === "high") {
        map[imp.file].highestConfidence = "high";
      }
    }
    return Object.values(map);
  }, [model.impacts]);

  // Group fixes by file path
  const fixesByFile = useMemo(() => {
    const map: Record<string, { file: string; items: NormalizedFix[]; allSafe: boolean }> = {};
    for (const fix of model.fixes) {
      if (!map[fix.file]) {
        map[fix.file] = { file: fix.file, items: [], allSafe: true };
      }
      map[fix.file].items.push(fix);
      if (!fix.safe) {
        map[fix.file].allSafe = false;
      }
    }
    return Object.values(map);
  }, [model.fixes]);

  const toggleImpactFile = (file: string) => {
    setExpandedImpactFiles((prev) => ({ ...prev, [file]: !prev[file] }));
  };

  const toggleFixFile = (file: string) => {
    setExpandedFixFiles((prev) => ({ ...prev, [file]: !prev[file] }));
  };

  const copyBranch = () => {
    if (model.finalResult.branch) {
      navigator.clipboard.writeText(model.finalResult.branch);
      setCopiedBranch(true);
      setTimeout(() => setCopiedBranch(false), 2000);
    }
  };

  const visibleChanges = showAllChanges ? model.changes : model.changes.slice(0, 2);

  return (
    <div className="w-full space-y-6 font-sans text-slate-100">
      {/* 1. COMPACT RESULTS OVERVIEW (HEADER) */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/90 p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              {showBackButton && onBack && (
                <button
                  onClick={onBack}
                  className="rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
                >
                  ← Back
                </button>
              )}
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {title}
              </h1>
              {/* Verdict Status Badge */}
              {model.overallStatus === "ACCEPTED" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Repairo Accepted
                </span>
              )}
              {model.overallStatus === "REVIEW_REQUIRED" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Review Required
                </span>
              )}
              {model.overallStatus === "REJECTED" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-0.5 text-xs font-semibold text-red-400">
                  <XCircle className="h-3.5 w-3.5" />
                  Repairo Rejected
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-neutral-500" />
                Spec Transition:
                <span className="rounded bg-neutral-800 px-2 py-0.5 font-semibold text-amber-300">
                  {model.fromVersion}
                </span>
                <ArrowRight className="h-3 w-3 text-neutral-600" />
                <span className="rounded bg-neutral-800 px-2 py-0.5 font-semibold text-emerald-300">
                  {model.toVersion}
                </span>
              </span>
              <span>•</span>
              <span>
                Run: <code className="text-neutral-300">{model.runId}</code>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-neutral-500" />
                {new Date(model.detectedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Compact Metric Counters Bar */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 px-3 py-2 text-center">
              <div className="font-mono text-lg font-bold text-red-400">
                {model.summary.breaking}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                Breaking Changes
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 px-3 py-2 text-center">
              <div className="font-mono text-lg font-bold text-amber-400">
                {model.summary.impactedFiles}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                Affected Files
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 px-3 py-2 text-center">
              <div className="font-mono text-lg font-bold text-emerald-400">
                {model.summary.safeFixes}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                Safe Fixes
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 px-3 py-2 text-center">
              <div className="font-mono text-lg font-bold text-blue-400">
                {model.validation.safetyScore}%
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                Safety Rating
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECTION 01: API CHANGE */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-red-500/10 font-mono text-xs font-bold text-red-400">
              01
            </span>
            <h2 className="text-base font-bold text-white">API Change</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-red-500/10 px-2 py-0.5 font-mono text-xs text-red-400">
              {model.summary.breaking} Breaking
            </span>
            {model.summary.additive > 0 && (
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-400">
                {model.summary.additive} Additive
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {visibleChanges.map((change) => (
            <div
              key={change.id}
              className="rounded-lg border border-neutral-800 bg-neutral-950/80 p-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                      change.severity === "breaking"
                        ? "bg-red-500/10 text-red-400 border border-red-500/30"
                        : change.severity === "additive"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                    }`}
                  >
                    {change.severity}
                  </span>
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[11px] text-neutral-300">
                    {change.kind}
                  </span>
                  {change.operation && (
                    <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-400">
                      {change.operation.toUpperCase()}
                    </span>
                  )}
                  <code className="font-mono text-xs font-semibold text-amber-300">
                    {change.path}
                  </code>
                </div>
                <span className="font-mono text-[10px] text-neutral-500">{change.id}</span>
              </div>
              <p className="mt-1 text-neutral-200">{change.summary}</p>
            </div>
          ))}

          {model.changes.length > 2 && (
            <button
              onClick={() => setShowAllChanges((v) => !v)}
              className="mt-2 flex items-center gap-1 font-mono text-xs text-amber-400 hover:text-amber-300"
            >
              {showAllChanges ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Collapse API changes list
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> View all {model.changes.length} API changes
                </>
              )}
            </button>
          )}
        </div>
      </section>

      {/* 3. SECTION 02: AFFECTED FILES (GROUPED BY FILE) */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/10 font-mono text-xs font-bold text-amber-400">
              02
            </span>
            <h2 className="text-base font-bold text-white">Affected Files</h2>
          </div>
          <span className="rounded bg-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-300">
            {model.impacts.length} impact call sites across {impactsByFile.length} file(s)
          </span>
        </div>

        <div className="space-y-3">
          {impactsByFile.map((group) => {
            const isExpanded = expandedImpactFiles[group.file] ?? false;
            return (
              <div
                key={group.file}
                className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950"
              >
                {/* Collapsed File Row */}
                <div
                  onClick={() => toggleImpactFile(group.file)}
                  className="flex cursor-pointer items-center justify-between bg-neutral-900/80 px-4 py-3 hover:bg-neutral-850"
                >
                  <div className="flex items-center gap-2.5 font-mono text-xs font-semibold text-neutral-200">
                    <FileCode className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>{group.file}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-neutral-800 px-2 py-0.5 font-mono text-[11px] text-neutral-300">
                      {group.items.length} impact site(s)
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                        group.highestConfidence === "high"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {group.highestConfidence} confidence
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details List */}
                {isExpanded && (
                  <div className="border-t border-neutral-800 p-4 space-y-3">
                    {group.items.map((imp, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-neutral-850 bg-neutral-900/40 p-3 text-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-amber-300 font-semibold">
                            L{imp.line}:C{imp.column} • Symbol: {imp.symbol}
                          </span>
                          <span className="font-mono text-[10px] text-neutral-500">
                            Confidence: {imp.confidence}
                          </span>
                        </div>
                        <p className="text-neutral-300">{imp.reason}</p>
                        {imp.snippet && (
                          <div className="rounded border border-neutral-800 bg-neutral-950 p-2.5 font-mono text-[11px]">
                            <pre className="text-neutral-300 whitespace-pre-wrap">{imp.snippet}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {impactsByFile.length === 0 && (
            <p className="text-xs text-neutral-500 italic">No impacted consumer files found.</p>
          )}
        </div>
      </section>

      {/* 4. SECTION 03: PROPOSED REPAIR (GROUPED BY FILE) */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
              03
            </span>
            <h2 className="text-base font-bold text-white">Proposed Repair</h2>
          </div>
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-400">
            {model.fixes.length} repair patches ({model.summary.safeFixes} Safe)
          </span>
        </div>

        <div className="space-y-3">
          {fixesByFile.map((group) => {
            const isExpanded = expandedFixFiles[group.file] ?? false;
            return (
              <div
                key={group.file}
                className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950"
              >
                {/* Collapsed File Row */}
                <div
                  onClick={() => toggleFixFile(group.file)}
                  className="flex cursor-pointer items-center justify-between bg-neutral-900/80 px-4 py-3 hover:bg-neutral-850"
                >
                  <div className="flex items-center gap-2.5 font-mono text-xs font-semibold text-neutral-200">
                    <GitCommit className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{group.file}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-neutral-800 px-2 py-0.5 font-mono text-[11px] text-neutral-300">
                      {group.items.length} proposed fix(es)
                    </span>
                    {group.allSafe ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                        <ShieldCheck className="h-3.5 w-3.5" /> SAFE AST PATCH
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-400 border border-amber-500/30">
                        <ShieldAlert className="h-3.5 w-3.5" /> REVIEW NEEDED
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details Diff View */}
                {isExpanded && (
                  <div className="border-t border-neutral-800 p-4 space-y-4">
                    {group.items.map((fix, idx) => (
                      <div key={idx} className="space-y-3">
                        <p className="text-xs font-semibold text-neutral-200">{fix.description}</p>
                        {fix.safetyNotes.length > 0 && (
                          <div className="rounded border border-neutral-800 bg-neutral-900/50 p-2.5 text-xs text-neutral-400">
                            <span className="font-semibold text-amber-400">Safety Notes:</span>
                            <ul className="mt-1 list-disc pl-4 space-y-0.5">
                              {fix.safetyNotes.map((note, nIdx) => (
                                <li key={nIdx}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="grid gap-3 lg:grid-cols-2 font-mono text-xs">
                          <div className="rounded border border-red-900/40 bg-red-950/20 p-3">
                            <div className="mb-1 text-[10px] font-semibold uppercase text-red-400">
                              BEFORE (ORIGINAL CODE)
                            </div>
                            <pre className="overflow-x-auto text-red-200 whitespace-pre-wrap">
                              {fix.before || "// Original code snippet"}
                            </pre>
                          </div>
                          <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-3">
                            <div className="mb-1 text-[10px] font-semibold uppercase text-emerald-400">
                              AFTER (REPAIRED CODE)
                            </div>
                            <pre className="overflow-x-auto text-emerald-200 whitespace-pre-wrap">
                              {fix.after || "// Repaired code patch"}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {fixesByFile.length === 0 && (
            <p className="text-xs text-neutral-500 italic">No code repairs generated.</p>
          )}
        </div>
      </section>

      {/* 5. SECTION 04: VALIDATION (COMPACT & DATA-HONEST) */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/10 font-mono text-xs font-bold text-blue-400">
              04
            </span>
            <h2 className="text-base font-bold text-white">Validation</h2>
          </div>
          <span className="rounded bg-blue-500/10 px-2 py-0.5 font-mono text-xs text-blue-400">
            Safety Score: {model.validation.safetyScore}/100
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <div className="font-mono text-[10px] uppercase text-neutral-400">Safety Rating</div>
            <div className="mt-1 font-mono text-lg font-bold text-white">{model.validation.safetyScore}%</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">AST patch safety evaluation</div>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <div className="font-mono text-[10px] uppercase text-neutral-400">Auto-Merge Eligibility</div>
            <div className="mt-1">
              {model.validation.autoMergeEligible ? (
                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Eligible
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> Review Needed
                </span>
              )}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              {model.validation.autoMergeEligible ? "Automated PR merge policy met" : "Human peer review required"}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <div className="font-mono text-[10px] uppercase text-neutral-400">TypeScript Compilation</div>
            <div className="mt-1 font-mono text-xs text-neutral-300">
              {model.validation.typeScriptStatus.available
                ? model.validation.typeScriptStatus.statusText
                : "Not available in current result"}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              {model.validation.typeScriptStatus.available ? "Build check" : "Awaiting benchmark pipeline output"}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <div className="font-mono text-[10px] uppercase text-neutral-400">Test Suite Execution</div>
            <div className="mt-1 font-mono text-xs text-neutral-300">
              {model.validation.testStatus.available
                ? model.validation.testStatus.statusText
                : "Not available in current result"}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              {model.validation.testStatus.available ? "Test execution" : "Awaiting benchmark pipeline output"}
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION 05: FINAL RESULT */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-900/90 p-5 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-purple-500/10 font-mono text-xs font-bold text-purple-400">
              05
            </span>
            <h2 className="text-base font-bold text-white">Final Result</h2>
          </div>

          {model.finalResult.prUrl ? (
            <a
              href={model.finalResult.prUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 transition-all hover:bg-emerald-400"
            >
              <GitPullRequest className="h-4 w-4" />
              View Pull Request #{model.finalResult.prNumber || "1"}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            onOpenPR && (
              <button
                onClick={onOpenPR}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 transition-all hover:bg-emerald-400"
              >
                <GitPullRequest className="h-4 w-4" />
                Create GitHub PR
              </button>
            )
          )}
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-xs">
              <GitBranch className="h-4 w-4 text-purple-400" />
              <span className="font-semibold text-white">{model.finalResult.branch}</span>
              <button onClick={copyBranch} className="text-neutral-400 hover:text-white" title="Copy branch">
                {copiedBranch ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <span className="font-mono text-xs text-neutral-400">
              {model.finalResult.filesChangedCount} file(s) changed • {model.finalResult.commits.length} commit(s)
            </span>
          </div>

          <p className="text-xs leading-relaxed text-neutral-300">{model.finalResult.reason}</p>

          {/* Optional PR Body Collapsible */}
          <div className="pt-1">
            <button
              onClick={() => setShowPrBody((v) => !v)}
              className="flex items-center gap-1 font-mono text-xs text-neutral-400 hover:text-white"
            >
              {showPrBody ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showPrBody ? "Hide PR summary & body" : "View PR summary & body"}
            </button>

            {showPrBody && (
              <div className="mt-2 rounded border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs text-neutral-300 space-y-2">
                <div className="font-semibold text-amber-300">{model.finalResult.prTitle}</div>
                <div className="space-y-1">
                  {model.finalResult.commits.map((c, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px]">
                      <GitCommit className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{c.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
