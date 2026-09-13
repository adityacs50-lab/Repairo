import { parse } from "yaml";
import { diffOpenApi } from "./diff";
import { convertDiscoveryToOpenApi, isDiscoveryDocument } from "./discovery";
import { findImpactedCode } from "./impact";
import { buildPullRequest, generateFixes } from "./repair";
import { validateInMemory } from "./validation";
import { resolveAmbiguousEnums } from "./agent-resolve";
import type {
  ConsumerFile,
  OpenApiDocument,
  RepairRunResult,
} from "./types";

export function parseOpenApi(source: string): OpenApiDocument {
  const doc = parse(source);
  if (isDiscoveryDocument(doc)) {
    return convertDiscoveryToOpenApi(doc);
  }
  return doc as OpenApiDocument;
}

/** "lodash/get" -> "lodash", "@scope/pkg/sub" -> "@scope/pkg" — the installable package name. */
function packageRootName(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

export function generateSbom(
  consumerFiles: ConsumerFile[],
  specTitle?: string,
  specVersion?: string,
  /** Real installed versions (e.g. read from the target repo's package.json), keyed by
   * package name. Without this, Repairo has no way to know what's actually installed —
   * a fabricated version number would be worse than none, so it's reported as "unknown"
   * rather than guessed. */
  installedVersions?: Record<string, string>,
) {
  const components: any[] = [];
  const detectedPackages = new Set<string>();

  const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const file of consumerFiles) {
    let match;
    importRegex.lastIndex = 0;
    requireRegex.lastIndex = 0;

    while ((match = importRegex.exec(file.content)) !== null) {
      detectedPackages.add(match[1]);
    }
    while ((match = requireRegex.exec(file.content)) !== null) {
      detectedPackages.add(match[1]);
    }
  }

  for (const specifier of Array.from(detectedPackages)) {
    if (specifier.startsWith(".") || specifier.startsWith("/")) continue; // relative import, not a package

    const name = packageRootName(specifier);
    const version = installedVersions?.[name];
    const purl = `pkg:npm/${encodeURIComponent(name).replace(/%2F/g, "/")}${version ? `@${version}` : ""}`;
    components.push({
      type: "library",
      name,
      version: version ?? "unknown",
      purl,
    });
  }

  if (specTitle) {
    components.push({
      type: "application",
      name: specTitle.toLowerCase().replace(/\s+/g, "-"),
      version: specVersion ?? "1.0.0",
      description: `OpenAPI Contract Spec for ${specTitle}`,
    });
  }

  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${uuid}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: "Repairo", name: "Repairo Engine", version: "1.0.0" }],
      component: { type: "application", name: "repairo-client-workspace" },
    },
    components,
  };
}

export async function runRepair(options: {
  beforeSpec: string;
  afterSpec: string;
  consumerFiles: ConsumerFile[];
  /** Off by default. Requires ANTHROPIC_API_KEY to actually make any calls — see
   * resolveAmbiguousEnums in agent-resolve.ts. CLI-only for now; the hosted /api/repair*
   * routes intentionally never set this (see plan §7 for the reasoning). */
  agentResolve?: boolean;
  agentModel?: string;
  maxAgentResolutions?: number;
  /** Real installed package versions for the SBOM — see generateSbom. */
  installedVersions?: Record<string, string>;
}): Promise<RepairRunResult> {
  const before = parseOpenApi(options.beforeSpec);
  const after = parseOpenApi(options.afterSpec);
  const changes = diffOpenApi(before, after);
  const impacts = findImpactedCode(changes, options.consumerFiles);
  const agentResolutions = await resolveAmbiguousEnums(changes, {
    enabled: Boolean(options.agentResolve),
    model: options.agentModel,
    maxAgentResolutions: options.maxAgentResolutions,
  });
  const { fixes, updatedFiles } = generateFixes(
    changes,
    options.consumerFiles,
    impacts,
    agentResolutions,
  );
  const fromVersion = before.info?.version ?? "unknown";
  const toVersion = after.info?.version ?? "unknown";
  const specTitle = after.info?.title ?? before.info?.title;
  const pullRequest = buildPullRequest(
    changes,
    fixes,
    options.consumerFiles,
    updatedFiles,
    { fromVersion, toVersion, specTitle },
    impacts,
  );

  const impactedFiles = new Set(impacts.map((i) => i.file)).size;
  const sbom = generateSbom(
    options.consumerFiles,
    after.info?.title ?? before.info?.title,
    toVersion,
    options.installedVersions,
  );

  // Validate the full resulting workspace (updated files layered over the originals) with
  // an in-memory TypeScript program before this PR is ever proposed as auto-merge eligible.
  // This can't see node_modules types, but it does catch same-project inconsistencies a
  // transform might introduce — the one real safety net available to the hosted GitHub-PR
  // flow, which never has an on-disk checkout to run the CLI's full `tsc` validation against.
  const updatedByPath = new Map(updatedFiles.map((f) => [f.path, f]));
  const mergedFiles = options.consumerFiles.map((f) => updatedByPath.get(f.path) ?? f);
  const typecheck = validateInMemory(mergedFiles);
  if (!typecheck.passed) {
    pullRequest.autoMergeEligible = false;
    pullRequest.safetyScore = Math.min(pullRequest.safetyScore, 40);
  }

  return {
    runId: `run_${Date.now().toString(36)}`,
    detectedAt: new Date().toISOString(),
    fromVersion,
    toVersion,
    changes,
    impacts,
    fixes,
    pullRequest,
    sbom,
    typecheck,
    summary: {
      breaking: changes.filter((c) => c.severity === "breaking").length,
      nonBreaking: changes.filter((c) => c.severity === "non-breaking").length,
      additive: changes.filter((c) => c.severity === "additive").length,
      impactedFiles,
      safeFixes: fixes.filter((f) => f.safe).length,
      agentAssistedFixes: fixes.filter((f) => f.origin === "agent-proposed").length,
    },
  };
}

export * from "./types";
export { diffOpenApi } from "./diff";
export {
  diffSpecs,
  diffSpecFiles,
  parseSpecWithLines,
  type BreakingChange,
  type BreakingRule,
} from "./spec-diff";
export {
  OASDIFF_LEVEL,
  OASDIFF_RULE_MAP,
  OasdiffError,
  diffWithOasdiff,
  diffWithOasdiffDetailed,
  isOasdiffAvailable,
  mapOasdiffCheckId,
  normalizeOasdiffChange,
  type OasdiffChange,
  type OasdiffFailureCode,
  type OasdiffOptions,
  type OasdiffResult,
} from "./oasdiff";
export { findImpactedCode } from "./impact";
export { buildPullRequest, generateFixes } from "./repair";
export { scanDirectory, scanCodebase } from "./ast-parser";
export { applyAstTransforms, groupEnumChanges, type AgentEnumResolution } from "./ast-transformer";
export { normalizeMaxAgentResolutions, proposeEnumMapping, resolveAmbiguousEnums, validateProposal } from "./agent-resolve";
export { validateCodebase, validateInMemory, collectTypeDiagnostics, type TypeDiagnostic } from "./validation";
export { initRepairoConfig, loadRepairoConfig, getSnapshotsDir, getReportsDir } from "./config";
export { getGitStatus, createGitHubPR } from "./github";
export { VENDOR_CATALOG, getVendor, listVendors, type VendorCatalogEntry } from "./catalog";
export { fetchSpecText, resolveSpecIndirection } from "./fetch-spec";
export { convertDiscoveryToOpenApi, isDiscoveryDocument } from "./discovery";
