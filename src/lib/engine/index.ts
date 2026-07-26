import { parse } from "yaml";
import { diffOpenApi } from "./diff";
import { findImpactedCode } from "./impact";
import { buildPullRequest, generateFixes } from "./repair";
import type {
  ConsumerFile,
  OpenApiDocument,
  RepairRunResult,
} from "./types";

export function parseOpenApi(source: string): OpenApiDocument {
  return parse(source) as OpenApiDocument;
}

export function runRepair(options: {
  beforeSpec: string;
  afterSpec: string;
  consumerFiles: ConsumerFile[];
}): RepairRunResult {
  const before = parseOpenApi(options.beforeSpec);
  const after = parseOpenApi(options.afterSpec);
  const changes = diffOpenApi(before, after);
  const impacts = findImpactedCode(changes, options.consumerFiles);
  const { fixes, updatedFiles } = generateFixes(
    changes,
    options.consumerFiles,
    impacts,
  );
  const fromVersion = before.info?.version ?? "unknown";
  const toVersion = after.info?.version ?? "unknown";
  const pullRequest = buildPullRequest(
    changes,
    fixes,
    options.consumerFiles,
    updatedFiles,
    { fromVersion, toVersion },
    impacts,
  );

  const impactedFiles = new Set(impacts.map((i) => i.file)).size;

  return {
    runId: `run_${Date.now().toString(36)}`,
    detectedAt: new Date().toISOString(),
    fromVersion,
    toVersion,
    changes,
    impacts,
    fixes,
    pullRequest,
    summary: {
      breaking: changes.filter((c) => c.severity === "breaking").length,
      nonBreaking: changes.filter((c) => c.severity === "non-breaking").length,
      additive: changes.filter((c) => c.severity === "additive").length,
      impactedFiles,
      safeFixes: fixes.filter((f) => f.safe).length,
    },
  };
}

export * from "./types";
export { diffOpenApi } from "./diff";
export { findImpactedCode } from "./impact";
export { buildPullRequest, generateFixes } from "./repair";
