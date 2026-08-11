import fs from "fs";
import path from "path";
import {
  diffOpenApi,
  findImpactedCode,
  getReportsDir,
  getSnapshotsDir,
  initRepairoConfig,
  parseOpenApi,
  scanDirectory,
  type ConsumerFile,
} from "../../lib/engine";

export interface DiffOptions {
  spec?: string;
  target?: string;
}

export function handleDiffCommand(options: DiffOptions = {}): void {
  console.log("\nREPAIRO");
  console.log("──────────────────────────────\n");

  if (!options.spec) {
    console.error("❌ Error: Missing required option '--spec <path>'\n");
    console.log("Usage:");
    console.log("  repairo diff --spec ./specs/new-openapi.json\n");
    process.exit(1);
  }

  const specPath = path.resolve(options.spec);
  if (!fs.existsSync(specPath)) {
    console.error(`❌ Error: OpenAPI specification file not found: ${specPath}\n`);
    process.exit(1);
  }

  initRepairoConfig(".");
  const snapshotsDir = getSnapshotsDir(".");
  const reportsDir = getReportsDir(".");
  const snapshotPath = path.join(snapshotsDir, "openapi.json");

  const incomingContent = fs.readFileSync(specPath, "utf-8");
  const incomingDoc = parseOpenApi(incomingContent);

  if (!fs.existsSync(snapshotPath)) {
    fs.writeFileSync(snapshotPath, incomingContent, "utf-8");
    console.log("No previous OpenAPI snapshot found.\n");
    console.log("Saved baseline:");
    console.log(`  .repairo/snapshots/openapi.json\n`);
    console.log("Run the command again after the API specification changes to detect drift.\n");
    return;
  }

  const baselineContent = fs.readFileSync(snapshotPath, "utf-8");
  const baselineDoc = parseOpenApi(baselineContent);

  const changes = diffOpenApi(baselineDoc, incomingDoc);

  if (changes.length === 0) {
    console.log("✓ No API contract changes detected between baseline and current specification.\n");
    return;
  }

  const targetDir = path.resolve(options.target || "./src");
  let consumerFiles: ConsumerFile[] = [];

  function collectConsumerFiles(dir: string): ConsumerFile[] {
    const files: ConsumerFile[] = [];
    if (!fs.existsSync(dir)) return files;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullP = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", ".next", ".git", "dist", ".repairo"].includes(entry.name)) {
          files.push(...collectConsumerFiles(fullP));
        }
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        files.push({
          path: path.relative(process.cwd(), fullP).replace(/\\/g, "/"),
          content: fs.readFileSync(fullP, "utf-8"),
        });
      }
    }
    return files;
  }

  consumerFiles = collectConsumerFiles(targetDir);
  const impacts = findImpactedCode(changes, consumerFiles);

  const breakingChanges = changes.filter((c) => c.severity === "breaking");
  const additiveChanges = changes.filter((c) => c.severity === "additive");
  const nonBreakingChanges = changes.filter((c) => c.severity === "non-breaking");

  console.log("API CONTRACT CHANGES\n");

  if (breakingChanges.length > 0) {
    console.log("BREAKING");
    console.log("────────");
    for (const change of breakingChanges) {
      console.log(`${change.operation ? change.operation.toUpperCase() : ""} ${change.path}`);
      if (change.summary) console.log(`  ${change.summary}`);
      if (change.field) console.log(`  Field / Parameter: ${change.field}`);
      if (change.before) console.log(`  Before: ${change.before}`);
      if (change.after) console.log(`  After: ${change.after}`);
      console.log();
    }
  }

  if (additiveChanges.length > 0) {
    console.log("ADDITIVE");
    console.log("────────");
    for (const change of additiveChanges) {
      console.log(`${change.operation ? change.operation.toUpperCase() : ""} ${change.path}`);
      console.log(`  ${change.summary}\n`);
    }
  }

  const impactedFilesCount = new Set(impacts.map((i) => i.file)).size;

  console.log("Potential impact:");
  console.log(`  ${impactedFilesCount} file${impactedFilesCount !== 1 ? "s" : ""}`);
  console.log(`  ${impacts.length} call site${impacts.length !== 1 ? "s" : ""}\n`);

  const reportData = {
    timestamp: new Date().toISOString(),
    specPath,
    changes,
    impacts,
    summary: {
      breaking: breakingChanges.length,
      additive: additiveChanges.length,
      nonBreaking: nonBreakingChanges.length,
      impactedFiles: impactedFilesCount,
      impactedCallSites: impacts.length,
    },
  };

  fs.writeFileSync(
    path.join(reportsDir, "latest-diff.json"),
    JSON.stringify(reportData, null, 2),
    "utf-8"
  );

  console.log("Next step:");
  console.log("  repairo repair --dry-run\n");
}
