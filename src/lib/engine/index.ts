import { parse } from "yaml";
import { diffOpenApi } from "./diff";
import { convertDiscoveryToOpenApi, isDiscoveryDocument } from "./discovery";
import { findImpactedCode } from "./impact";
import { buildPullRequest, generateFixes } from "./repair";
import { validateInMemory } from "./validation";
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

export function generateSbom(
  consumerFiles: ConsumerFile[],
  specTitle?: string,
  specVersion?: string,
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

  const packageMeta: Record<
    string,
    { name: string; version: string; purl: string; description: string }
  > = {
    stripe: {
      name: "stripe",
      version: "12.3.2",
      purl: "pkg:npm/stripe@12.3.2",
      description: "Stripe NodeJS SDK Client Library",
    },
    openai: {
      name: "openai",
      version: "4.26.0",
      purl: "pkg:npm/openai@4.26.0",
      description: "OpenAI NodeJS SDK Client Library",
    },
    supabase: {
      name: "@supabase/supabase-js",
      version: "2.39.8",
      purl: "pkg:npm/%40supabase/supabase-js@2.39.8",
      description: "Supabase Client Library",
    },
    "@supabase/supabase-js": {
      name: "@supabase/supabase-js",
      version: "2.39.8",
      purl: "pkg:npm/%40supabase/supabase-js@2.39.8",
      description: "Supabase Client Library",
    },
  };

  for (const pkg of Array.from(detectedPackages)) {
    let mapped = packageMeta[pkg];
    if (!mapped) {
      for (const key of Object.keys(packageMeta)) {
        if (pkg.startsWith(key)) {
          mapped = packageMeta[key];
          break;
        }
      }
    }

    if (mapped) {
      components.push({
        type: "library",
        name: mapped.name,
        version: mapped.version,
        purl: mapped.purl,
        description: mapped.description,
        licenses: [{ license: { id: "MIT" } }],
      });
    }
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
    },
  };
}

export * from "./types";
export { diffOpenApi } from "./diff";
export { findImpactedCode } from "./impact";
export { buildPullRequest, generateFixes } from "./repair";
export { scanDirectory, scanCodebase } from "./ast-parser";
export { applyAstTransforms } from "./ast-transformer";
export { validateCodebase, collectTypeDiagnostics, type TypeDiagnostic } from "./validation";
export { initRepairoConfig, loadRepairoConfig, getSnapshotsDir, getReportsDir } from "./config";
export { getGitStatus, createGitHubPR } from "./github";
export { VENDOR_CATALOG, getVendor, listVendors, type VendorCatalogEntry } from "./catalog";
export { fetchSpecText, resolveSpecIndirection } from "./fetch-spec";
export { convertDiscoveryToOpenApi, isDiscoveryDocument } from "./discovery";
