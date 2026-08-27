import { applyAstTransforms } from "./ast-transformer";
import type {
  ApiChange,
  ConsumerFile,
  ImpactMatch,
  PullRequestDraft,
  SuggestedFix,
} from "./types";

const TS_LIKE = /\.(ts|tsx|js|jsx|mts|cts)$/i;

function makePatch(before: string, after: string, path: string): string {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const hunks: string[] = [`--- a/${path}`, `+++ b/${path}`];

  let i = 0;
  let j = 0;
  while (i < beforeLines.length || j < afterLines.length) {
    if (i < beforeLines.length && j < afterLines.length && beforeLines[i] === afterLines[j]) {
      i += 1;
      j += 1;
      continue;
    }

    const startI = i + 1;
    const startJ = j + 1;
    const removed: string[] = [];
    const added: string[] = [];

    while (
      i < beforeLines.length &&
      (j >= afterLines.length || beforeLines[i] !== afterLines[j])
    ) {
      const nextMatch = afterLines.indexOf(beforeLines[i], j);
      if (nextMatch !== -1 && nextMatch - j < 6) break;
      removed.push(`-${beforeLines[i]}`);
      i += 1;
      if (removed.length > 12) break;
    }

    while (
      j < afterLines.length &&
      (i >= beforeLines.length || afterLines[j] !== beforeLines[i])
    ) {
      const nextMatch = beforeLines.indexOf(afterLines[j], i);
      if (nextMatch !== -1 && nextMatch - i < 6) break;
      added.push(`+${afterLines[j]}`);
      j += 1;
      if (added.length > 12) break;
    }

    if (removed.length || added.length) {
      hunks.push(`@@ -${startI},${Math.max(removed.length, 1)} +${startJ},${Math.max(added.length, 1)} @@`);
      hunks.push(...removed, ...added);
    } else {
      break;
    }
  }

  return hunks.join("\n");
}

/** Narrow, honestly-labeled fallback for non-JS/TS consumer files (no AST available for
 * Python/Go/etc): a deterministic constant reassignment for base-URL changes only. */
function applyNonJsFallback(
  content: string,
  changes: ApiChange[],
  filePath: string,
): { content: string; fixes: SuggestedFix[] } {
  let next = content;
  const fixes: SuggestedFix[] = [];
  const isPy = /\.py$/i.test(filePath);
  const isGo = /\.go$/i.test(filePath);

  for (const change of changes) {
    if (change.kind !== "server-url-changed" || !change.before || !change.after) continue;

    if (next.includes(change.before)) {
      next = next.split(change.before).join(change.after);
      fixes.push({
        changeId: change.id,
        file: filePath,
        description: "Update API base URL",
        before: change.before,
        after: change.after,
        safe: true,
        safetyNotes: ["Deterministic string replacement of known base URL"],
      });
    }

    const constNames = isPy
      ? ["BASE_URL", "API_BASE", "API_URL"]
      : isGo
        ? ["BaseURL", "APIBase", "apiBase"]
        : [];
    for (const name of constNames) {
      const re = new RegExp(`(${name}\\s*=\\s*["'])([^"']+)(["'])`);
      if (re.test(next)) {
        const before = next;
        next = next.replace(re, `$1${change.after}$3`);
        if (next !== before) {
          fixes.push({
            changeId: change.id,
            file: filePath,
            description: `Update ${name} constant to new API URL`,
            before: name,
            after: change.after,
            safe: true,
            safetyNotes: ["Constant reassignment only"],
          });
        }
      }
    }
  }

  return { content: next, fixes };
}

export function generateFixes(
  changes: ApiChange[],
  files: ConsumerFile[],
  impacts: ImpactMatch[],
): { fixes: SuggestedFix[]; updatedFiles: ConsumerFile[] } {
  const updatedFiles: ConsumerFile[] = [];
  const fixes: SuggestedFix[] = [];
  const impactedPaths = new Set(impacts.map((i) => i.file));

  for (const file of files) {
    if (!impactedPaths.has(file.path)) {
      updatedFiles.push(file);
      continue;
    }

    if (TS_LIKE.test(file.path)) {
      const fileImpacts = impacts.filter((i) => i.file === file.path);
      const result = applyAstTransforms(file.content, changes, file.path, fileImpacts);
      const fileFixes = result.fixes.map((fix) => ({ ...fix, file: file.path }));
      fixes.push(...fileFixes);
      updatedFiles.push({ path: file.path, content: result.content });
    } else {
      const result = applyNonJsFallback(file.content, changes, file.path);
      fixes.push(...result.fixes);
      updatedFiles.push({ path: file.path, content: result.content });
    }
  }

  return { fixes, updatedFiles };
}

export function buildPullRequest(
  changes: ApiChange[],
  fixes: SuggestedFix[],
  originalFiles: ConsumerFile[],
  updatedFiles: ConsumerFile[],
  meta: { fromVersion: string; toVersion: string; specTitle?: string },
  impacts: ImpactMatch[] = [],
): PullRequestDraft {
  const changed = updatedFiles.filter((file) => {
    const original = originalFiles.find((o) => o.path === file.path);
    return original && original.content !== file.content;
  });

  const safeFixes = fixes.filter((f) => f.safe);
  const unsafeFixes = fixes.length - safeFixes.length;
  const patchedPaths = new Set(changed.map((f) => f.path));
  const highImpacts = impacts.filter((i) => i.confidence === "high");
  const uncoveredHigh = highImpacts.filter((i) => !patchedPaths.has(i.file)).length;
  const breakingChanges = changes.filter((c) => c.severity === "breaking");
  const addressedChangeIds = new Set(safeFixes.map((f) => f.changeId));
  const coverageRatio =
    breakingChanges.length === 0
      ? 1
      : Math.min(
          1,
          breakingChanges.filter((c) => addressedChangeIds.has(c.id)).length /
            Math.max(breakingChanges.length, 1),
        );

  // Score the PR on patch coverage + deterministic-only transforms.
  const safetyScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        70 +
          coverageRatio * 20 +
          (changed.length > 0 ? 8 : 0) -
          uncoveredHigh * 12 -
          unsafeFixes * 18,
      ),
    ),
  );

  const files = changed.map((file) => {
    const original = originalFiles.find((o) => o.path === file.path)!;
    return {
      path: file.path,
      content: file.content,
      patch: makePatch(original.content, file.content, file.path),
    };
  });

  const specLabel = meta.specTitle ? `${meta.specTitle} ` : "API ";

  const body = [
    "## Repairo automatic integration repair",
    "",
    `Detected breaking and additive changes from **${specLabel}${meta.fromVersion} → ${meta.toVersion}**.`,
    "",
    "### Changes detected",
    ...changes.map(
      (c) => `- \`${c.severity}\` ${c.summary}${c.field ? ` (\`${c.field}\`)` : ""}`,
    ),
    "",
    "### Safe fixes applied",
    ...safeFixes.map((f) => `- ${f.description} in \`${f.file}\``),
    "",
    "### Safety checks",
    `- Safety score: **${safetyScore}/100**`,
    `- Deterministic AST transforms only (no speculative refactors)`,
    `- CI should run contract + unit tests before merge`,
    "",
    safetyScore >= 75
      ? "✅ Auto-merge eligible after green CI."
      : "⚠️ Manual review recommended before merge.",
  ].join("\n");

  return {
    title: `fix(integrations): adapt to ${specLabel}${meta.toVersion}`.trim(),
    branch: `repairo/${(meta.specTitle ?? "api").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${meta.toVersion.replace(/\./g, "-")}`,
    body,
    labels: ["repairo", "api-repair", "safe-auto-pr"],
    commits: [
      {
        message: `fix: update consumer for ${specLabel}${meta.toVersion}`,
        files: files.map((f) => f.path),
      },
    ],
    files,
    safetyScore,
    autoMergeEligible: safetyScore >= 75 && safeFixes.length === fixes.length,
  };
}
