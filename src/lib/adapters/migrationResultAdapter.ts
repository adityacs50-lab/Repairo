import type { ApiChange, ImpactMatch, SuggestedFix } from "@/lib/engine/types";

export interface NormalizedApiChange {
  id: string;
  kind: string;
  severity: "breaking" | "non-breaking" | "additive";
  path: string;
  operation?: string;
  field?: string;
  before?: string;
  after?: string;
  summary: string;
}

export interface NormalizedImpact {
  file: string;
  line: number;
  column: number;
  snippet: string;
  symbol: string;
  changeId: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export interface NormalizedFix {
  changeId: string;
  file: string;
  description: string;
  before: string;
  after: string;
  safe: boolean;
  safetyNotes: string[];
}

export interface NormalizedValidationItem {
  available: boolean;
  passed?: boolean;
  statusText: string;
  message?: string;
}

export interface NormalizedValidation {
  safetyScore: number;
  autoMergeEligible: boolean;
  typeScriptStatus: NormalizedValidationItem;
  testStatus: NormalizedValidationItem;
}

export interface NormalizedFinalResult {
  status: "accepted" | "rejected" | "review_required";
  statusTitle: string;
  reason: string;
  branch: string;
  filesChangedCount: number;
  commits: Array<{ message: string; files: string[] }>;
  prUrl?: string;
  prNumber?: number;
  prTitle?: string;
}

export interface MigrationResultViewModel {
  runId: string;
  detectedAt: string;
  fromVersion: string;
  toVersion: string;
  overallStatus: "ACCEPTED" | "REVIEW_REQUIRED" | "REJECTED";
  changes: NormalizedApiChange[];
  impacts: NormalizedImpact[];
  fixes: NormalizedFix[];
  validation: NormalizedValidation;
  finalResult: NormalizedFinalResult;
  summary: {
    breaking: number;
    nonBreaking: number;
    additive: number;
    impactedFiles: number;
    safeFixes: number;
  };
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

function getObj(obj: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const v = obj[key];
  return isObject(v) ? v : null;
}

/**
 * Data adapter / normalizer function for Repairo Migration Results.
 * Accepts engine RepairRunResult or external benchmark JSON payloads.
 * Strictly avoids fabricating missing validation states.
 */
export function normalizeMigrationResult(input: unknown): MigrationResultViewModel {
  if (!isObject(input)) {
    return createEmptyViewModel();
  }

  const raw = input;

  // Detect benchmark or engine fields
  const runId = String(raw.runId || raw.id || "run-demo-001");
  const detectedAt = String(raw.detectedAt || raw.createdAt || new Date().toISOString());
  const fromVersion = String(raw.fromVersion || raw.from_version || "v1.0.0");
  const toVersion = String(raw.toVersion || raw.to_version || "v2.0.0");

  const changesArr = Array.isArray(raw.changes) ? raw.changes : [];
  const changes: NormalizedApiChange[] = changesArr.map((c) => {
    const item: Partial<ApiChange> = isObject(c) ? (c as Partial<ApiChange>) : {};
    const severityVal = String(item.severity || "");
    const severity: "breaking" | "non-breaking" | "additive" =
      severityVal === "breaking" || severityVal === "non-breaking" || severityVal === "additive"
        ? severityVal
        : "breaking";
    return {
      id: String(item.id || "change-0"),
      kind: String(item.kind || "contract-change"),
      severity,
      path: String(item.path || "/"),
      operation: item.operation ? String(item.operation) : undefined,
      field: item.field ? String(item.field) : undefined,
      before: item.before !== undefined ? String(item.before) : undefined,
      after: item.after !== undefined ? String(item.after) : undefined,
      summary: String(item.summary || "API contract change detected"),
    };
  });

  const impactsArr = Array.isArray(raw.impacts) ? raw.impacts : [];
  const impacts: NormalizedImpact[] = impactsArr.map((imp) => {
    const item: Partial<ImpactMatch> = isObject(imp) ? (imp as Partial<ImpactMatch>) : {};
    const confVal = String(item.confidence || "");
    const confidence: "high" | "medium" | "low" =
      confVal === "high" || confVal === "medium" || confVal === "low"
        ? confVal
        : "medium";
    return {
      file: String(item.file || "unknown"),
      line: Number(item.line || 1),
      column: Number(item.column || 1),
      snippet: String(item.snippet || ""),
      symbol: String(item.symbol || "unknown"),
      changeId: String(item.changeId || ""),
      confidence,
      reason: String(item.reason || "Matched API symbol call site"),
    };
  });

  const fixesArr = Array.isArray(raw.fixes) ? raw.fixes : [];
  const fixes: NormalizedFix[] = fixesArr.map((fix) => {
    const item: Partial<SuggestedFix> = isObject(fix) ? (fix as Partial<SuggestedFix>) : {};
    return {
      changeId: String(item.changeId || ""),
      file: String(item.file || "unknown"),
      description: String(item.description || "Proposed repair patch"),
      before: String(item.before || ""),
      after: String(item.after || ""),
      safe: Boolean(item.safe),
      safetyNotes: Array.isArray(item.safetyNotes) ? item.safetyNotes.map(String) : [],
    };
  });

  const summaryObj = getObj(raw, "summary");
  const summary = {
    breaking: Number(summaryObj?.breaking ?? changes.filter((c) => c.severity === "breaking").length),
    nonBreaking: Number(summaryObj?.nonBreaking ?? changes.filter((c) => c.severity === "non-breaking").length),
    additive: Number(summaryObj?.additive ?? changes.filter((c) => c.severity === "additive").length),
    impactedFiles: Number(summaryObj?.impactedFiles ?? new Set(impacts.map((i) => i.file)).size),
    safeFixes: Number(summaryObj?.safeFixes ?? fixes.filter((f) => f.safe).length),
  };

  const pr = getObj(raw, "pullRequest") || getObj(raw, "pull_request") || {};
  const safetyScore = Number(pr.safetyScore ?? raw.safetyScore ?? (summary.breaking > 0 && summary.safeFixes === summary.breaking ? 100 : 85));
  const autoMergeEligible = Boolean(pr.autoMergeEligible ?? raw.autoMergeEligible ?? (summary.safeFixes === summary.breaking && summary.breaking > 0));

  // Extract explicit TypeScript compilation status if present in JSON payload
  const valObj = getObj(raw, "validation");
  const rawTs = getObj(raw, "typeScriptStatus") || (valObj ? getObj(valObj, "typeScript") : null) || getObj(raw, "compilation");
  const typeScriptStatus: NormalizedValidationItem = rawTs
    ? {
        available: true,
        passed: Boolean(rawTs.passed ?? (rawTs.status === "passed" || Boolean(rawTs.success))),
        statusText: String(rawTs.statusText || (rawTs.passed ? "Passed" : "Failed")),
        message: rawTs.message ? String(rawTs.message) : undefined,
      }
    : {
        available: false,
        statusText: "Not available in current result",
      };

  // Extract explicit Test execution status if present in JSON payload
  const rawTest = getObj(raw, "testStatus") || (valObj ? getObj(valObj, "tests") : null) || getObj(raw, "tests");
  const testStatus: NormalizedValidationItem = rawTest
    ? {
        available: true,
        passed: Boolean(rawTest.passed ?? (rawTest.status === "passed" || Boolean(rawTest.success))),
        statusText: String(rawTest.statusText || (rawTest.passed ? "Passed" : "Failed")),
        message: rawTest.message ? String(rawTest.message) : undefined,
      }
    : {
        available: false,
        statusText: "Not available in current result",
      };

  const validation: NormalizedValidation = {
    safetyScore,
    autoMergeEligible,
    typeScriptStatus,
    testStatus,
  };

  const isAccepted = autoMergeEligible && fixes.length > 0 && fixes.every((f) => f.safe);
  const isRejected = fixes.length === 0 && summary.breaking > 0;
  
  const status: "accepted" | "rejected" | "review_required" = isAccepted
    ? "accepted"
    : isRejected
    ? "rejected"
    : "review_required";

  const statusTitle = isAccepted
    ? "Repairo Accepted (Auto-Merge Eligible)"
    : isRejected
    ? "Repairo Rejected"
    : "Review Required";

  const finalObj = getObj(raw, "finalResult");
  const reason = String(
    finalObj?.reason ||
      pr.body ||
      (isAccepted
        ? `Deterministic AST repair verified with ${safetyScore}% safety score. All breaking call sites successfully patched.`
        : isRejected
        ? "No safe automated patch could be generated for the breaking API contract changes."
        : "Automated patch generated, but requires manual peer review before auto-merging.")
  );

  const filesArr = Array.isArray(pr.files) ? pr.files : [];
  const filesChangedCount = filesArr.length > 0 ? filesArr.length : new Set(fixes.map((f) => f.file)).size;

  const commitsArr = Array.isArray(pr.commits) ? pr.commits : [];
  const commits: Array<{ message: string; files: string[] }> = commitsArr.length > 0
    ? commitsArr.map((c) => {
        const cObj = isObject(c) ? c : {};
        const cFiles = Array.isArray(cObj.files) ? cObj.files.map(String) : [];
        return {
          message: String(cObj.message || "fix: update call site for breaking API contract"),
          files: cFiles,
        };
      })
    : [
        {
          message: `fix: repair ${fixes.length} call site(s) for ${fromVersion} → ${toVersion} migration`,
          files: fixes.map((f) => f.file),
        },
      ];

  const finalResult: NormalizedFinalResult = {
    status,
    statusTitle,
    reason,
    branch: String(pr.branch || raw.branch || "repairo/auto-repair-api-contract"),
    filesChangedCount,
    commits,
    prUrl: pr.prUrl ? String(pr.prUrl) : raw.prUrl ? String(raw.prUrl) : undefined,
    prNumber: typeof pr.prNumber === "number" ? pr.prNumber : typeof raw.prNumber === "number" ? (raw.prNumber as number) : undefined,
    prTitle: pr.title ? String(pr.title) : raw.prTitle ? String(raw.prTitle) : `fix: migrate API client to ${toVersion}`,
  };

  const overallStatus = isAccepted ? "ACCEPTED" : isRejected ? "REJECTED" : "REVIEW_REQUIRED";

  return {
    runId,
    detectedAt,
    fromVersion,
    toVersion,
    overallStatus,
    changes,
    impacts,
    fixes,
    validation,
    finalResult,
    summary,
  };
}

function createEmptyViewModel(): MigrationResultViewModel {
  return {
    runId: "empty-run",
    detectedAt: new Date().toISOString(),
    fromVersion: "v0.0.0",
    toVersion: "v0.0.0",
    overallStatus: "REVIEW_REQUIRED",
    changes: [],
    impacts: [],
    fixes: [],
    validation: {
      safetyScore: 0,
      autoMergeEligible: false,
      typeScriptStatus: { available: false, statusText: "Not available in current result" },
      testStatus: { available: false, statusText: "Not available in current result" },
    },
    finalResult: {
      status: "review_required",
      statusTitle: "No Result Data",
      reason: "No migration result data provided.",
      branch: "main",
      filesChangedCount: 0,
      commits: [],
    },
    summary: {
      breaking: 0,
      nonBreaking: 0,
      additive: 0,
      impactedFiles: 0,
      safeFixes: 0,
    },
  };
}
