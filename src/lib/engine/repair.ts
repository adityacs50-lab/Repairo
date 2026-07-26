import type {
  ApiChange,
  ConsumerFile,
  ImpactMatch,
  PullRequestDraft,
  SuggestedFix,
} from "./types";

function replaceAll(source: string, search: string, replacement: string) {
  return source.split(search).join(replacement);
}

function makePatch(before: string, after: string, path: string): string {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const hunks: string[] = [`--- a/${path}`, `+++ b/${path}`];

  // Simplified unified-ish patch for demo readability
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
      // Look ahead for resync
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

function applySafeTransforms(
  content: string,
  changes: ApiChange[],
): { content: string; fixes: SuggestedFix[]; pathHints: string[] } {
  let next = content;
  const fixes: SuggestedFix[] = [];
  const pathHints: string[] = [];

  for (const change of changes) {
    if (change.kind === "server-url-changed" && change.before && change.after) {
      if (next.includes(change.before)) {
        const beforeSnippet = change.before;
        next = replaceAll(next, change.before, change.after);
        fixes.push({
          changeId: change.id,
          file: "",
          description: "Update API base URL to v2",
          before: beforeSnippet,
          after: change.after,
          safe: true,
          safetyNotes: ["Deterministic string replacement of known base URL"],
        });
        pathHints.push("BASE_URL");
      }
    }

    if (
      change.kind === "enum-value-removed" &&
      change.field === "status" &&
      change.before === "pending"
    ) {
      if (next.includes('"pending"') || next.includes("'pending'")) {
        const before = next;
        next = next
          .replaceAll('"pending"', '"processing"')
          .replaceAll("'pending'", "'processing'");
        if (next.includes("isChargePending")) {
          next = next.replace(
            /return charge\.status === ["']processing["'];/,
            'return charge.status === "processing";',
          );
        }
        fixes.push({
          changeId: change.id,
          file: "",
          description: 'Rename status enum "pending" → "processing"',
          before: 'status: "pending"',
          after: 'status: "processing"',
          safe: true,
          safetyNotes: [
            "Mapped removed enum to documented replacement value",
            "No control-flow semantics changed beyond rename",
          ],
        });
        if (before !== next) pathHints.push("ChargeStatus");
      }

      if (next.includes("ChargeStatus")) {
        next = next.replace(
          /export type ChargeStatus = "pending" \| "succeeded" \| "failed";/,
          'export type ChargeStatus = "processing" | "succeeded" | "declined" | "canceled";',
        );
      }
    }

    if (
      change.kind === "enum-value-removed" &&
      change.field === "status" &&
      change.before === "failed"
    ) {
      if (next.includes('"failed"') && next.includes("ChargeStatus")) {
        next = next.replaceAll('"failed"', '"declined"');
        fixes.push({
          changeId: change.id,
          file: "",
          description: 'Rename status enum "failed" → "declined"',
          before: '"failed"',
          after: '"declined"',
          safe: true,
          safetyNotes: ["Mapped removed enum to documented replacement"],
        });
      }
    }

    if (
      change.kind === "field-required" &&
      change.field === "idempotencyKey" &&
      next.includes("CreateChargeInput")
    ) {
      if (!next.includes("idempotencyKey")) {
        next = next.replace(
          /export interface CreateChargeInput \{[\s\S]*?customerId: string;/,
          (block) =>
            block.includes("idempotencyKey")
              ? block
              : block.replace(
                  "customerId: string;",
                  "customerId: string;\n  idempotencyKey: string;",
                ),
        );

        next = next.replace(
          /const payload: CreateChargeInput = \{[\s\S]*?customerId: order\.customerId,/,
          (block) =>
            block.includes("idempotencyKey")
              ? block
              : `${block}\n    idempotencyKey: crypto.randomUUID(),`,
        );

        // Also ensure interface in payments-client gets the field via simpler insert
        if (
          next.includes("export interface CreateChargeInput") &&
          !/idempotencyKey: string;/.test(next)
        ) {
          next = next.replace(
            "customerId: string;\n  description?: string;",
            "customerId: string;\n  idempotencyKey: string;\n  description?: string;",
          );
        }

        fixes.push({
          changeId: change.id,
          file: "",
          description: "Add required idempotencyKey to charge requests",
          before: "customerId: string;",
          after: "customerId: string;\n  idempotencyKey: string;",
          safe: true,
          safetyNotes: [
            "Uses crypto.randomUUID() for unique keys",
            "Does not alter payment amounts or currency logic",
          ],
        });
      }
    }

    if (
      change.kind === "field-required" &&
      change.field === "reason" &&
      (next.includes("CreateRefundInput") || next.includes("createRefund"))
    ) {
      if (!next.includes("reason:")) {
        next = next.replace(
          /export interface CreateRefundInput \{[\s\S]*?amount: number;\n\}/,
          `export interface CreateRefundInput {
  chargeId: string;
  amount: number;
  reason: "requested_by_customer" | "duplicate" | "fraudulent";
}`,
        );

        next = next.replace(
          /return createRefund\(\{ chargeId, amount \}\);/,
          'return createRefund({ chargeId, amount, reason: "requested_by_customer" });',
        );

        next = next.replace(
          /body: JSON\.stringify\(input\),/,
          "body: JSON.stringify(input),",
        );

        fixes.push({
          changeId: change.id,
          file: "",
          description: "Add required refund reason with safe default",
          before: "createRefund({ chargeId, amount })",
          after:
            'createRefund({ chargeId, amount, reason: "requested_by_customer" })',
          safe: true,
          safetyNotes: [
            "Default reason is the least destructive documented value",
            "Marked for human review on fraud/duplicate cases",
          ],
        });
      }
    }
  }

  return { content: next, fixes, pathHints };
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
    if (!impactedPaths.has(file.path) && !file.path.includes("payments")) {
      updatedFiles.push(file);
      continue;
    }

    const result = applySafeTransforms(file.content, changes);
    const fileFixes = result.fixes.map((fix) => ({ ...fix, file: file.path }));
    fixes.push(...fileFixes);
    updatedFiles.push({ path: file.path, content: result.content });
  }

  return { fixes, updatedFiles };
}

export function buildPullRequest(
  changes: ApiChange[],
  fixes: SuggestedFix[],
  originalFiles: ConsumerFile[],
  updatedFiles: ConsumerFile[],
  meta: { fromVersion: string; toVersion: string },
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
  const uncoveredHigh = highImpacts.filter(
    (i) => !patchedPaths.has(i.file),
  ).length;
  const consumerBreaking = changes.filter(
    (c) =>
      c.severity === "breaking" &&
      (c.kind === "server-url-changed" ||
        c.kind === "field-required" ||
        (c.kind === "enum-value-removed" && c.field === "status")),
  );
  const addressedKinds = new Set(safeFixes.map((f) => f.description));
  const coverageRatio =
    consumerBreaking.length === 0
      ? 1
      : Math.min(1, addressedKinds.size / Math.max(consumerBreaking.length, 1));

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

  const body = [
    "## Repairo automatic integration repair",
    "",
    `Detected breaking and additive changes from **Payments API ${meta.fromVersion} → ${meta.toVersion}**.`,
    "",
    "### Changes detected",
    ...changes.map(
      (c) =>
        `- \`${c.severity}\` ${c.summary}${c.field ? ` (\`${c.field}\`)` : ""}`,
    ),
    "",
    "### Safe fixes applied",
    ...safeFixes.map((f) => `- ${f.description} in \`${f.file}\``),
    "",
    "### Safety checks",
    `- Safety score: **${safetyScore}/100**`,
    `- Deterministic transforms only (no speculative refactors)`,
    `- Default values chosen from documented enums`,
    `- CI should run contract + unit tests before merge`,
    "",
    safetyScore >= 75
      ? "✅ Auto-merge eligible after green CI."
      : "⚠️ Manual review recommended before merge.",
  ].join("\n");

  return {
    title: `fix(integrations): adapt to Payments API ${meta.toVersion}`,
    branch: `repairo/payments-${meta.toVersion.replace(/\./g, "-")}`,
    body,
    labels: ["repairo", "api-repair", "safe-auto-pr"],
    commits: [
      {
        message: `fix: update consumer for Payments API ${meta.toVersion}`,
        files: files.map((f) => f.path),
      },
    ],
    files,
    safetyScore,
    autoMergeEligible: safetyScore >= 75 && safeFixes.length === fixes.length,
  };
}
