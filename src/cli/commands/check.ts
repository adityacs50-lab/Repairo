import fs from "fs";
import path from "path";
import {
  diffOpenApi,
  fetchSpecText,
  findImpactedCode,
  getReportsDir,
  getSnapshotsDir,
  getVendor,
  initRepairoConfig,
  listVendors,
  loadRepairoConfig,
  parseOpenApi,
  type ApiChange,
  type ConsumerFile,
  type ImpactMatch,
} from "../../lib/engine";

export interface CheckOptions {
  vendors?: string[];
  target?: string;
  json?: boolean;
  updateSnapshot?: boolean;
}

interface VendorCheckResult {
  vendor: string;
  status: "baseline-created" | "no-changes" | "changes-detected" | "error";
  breaking: number;
  additive: number;
  nonBreaking: number;
  impactedFiles: number;
  changes: ApiChange[];
  impacts: ImpactMatch[];
  error?: string;
}

function collectConsumerFiles(dir: string): ConsumerFile[] {
  const res: ConsumerFile[] = [];
  if (!fs.existsSync(dir)) return res;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullP = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".next", ".git", "dist", ".repairo"].includes(entry.name)) {
        res.push(...collectConsumerFiles(fullP));
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      res.push({
        path: path.relative(process.cwd(), fullP).replace(/\\/g, "/"),
        content: fs.readFileSync(fullP, "utf-8"),
      });
    }
  }
  return res;
}

export async function handleCheckCommand(options: CheckOptions = {}): Promise<void> {
  const log = (msg = "") => {
    if (!options.json) console.log(msg);
  };

  log("\nREPAIRO CHECK");
  log("──────────────────────────────\n");

  const config = loadRepairoConfig(".");
  const requested = options.vendors?.length
    ? options.vendors
    : config?.vendors ?? [];

  const vendorIds = requested.map((v) => v.toLowerCase().trim()).filter(Boolean);
  const unknown = vendorIds.filter((id) => !getVendor(id));

  if (vendorIds.length === 0 || unknown.length > 0) {
    const available = listVendors().map((v) => v.id).join(", ");
    if (unknown.length > 0) {
      console.error(`❌ Unknown vendor(s): ${unknown.join(", ")}`);
    } else {
      console.error("❌ No vendors specified. Use --vendors or run: repairo init --vendors stripe,openai");
    }
    console.error(`Available vendors: ${available}\n`);
    process.exit(2);
  }

  initRepairoConfig(".", { vendors: vendorIds });
  const snapshotsDir = getSnapshotsDir(".");
  const reportsDir = getReportsDir(".");
  const targetDir = path.resolve(options.target || "./src");
  let consumerFiles: ConsumerFile[] | null = null;

  const results: VendorCheckResult[] = [];

  for (const vendorId of vendorIds) {
    const vendor = getVendor(vendorId)!;
    const snapshotPath = path.join(snapshotsDir, `${vendorId}.json`);
    log(`Checking ${vendor.name} (${vendorId})...`);

    try {
      const liveText = await fetchSpecText(vendor.openapiUrl);
      const liveDoc = parseOpenApi(liveText);
      const liveNormalized = JSON.stringify(liveDoc, null, 2);

      if (!fs.existsSync(snapshotPath)) {
        fs.writeFileSync(snapshotPath, liveNormalized, "utf-8");
        log(`  Baseline saved: .repairo/snapshots/${vendorId}.json`);
        log("  Commit this file — future runs diff against it.\n");
        results.push({
          vendor: vendorId,
          status: "baseline-created",
          breaking: 0,
          additive: 0,
          nonBreaking: 0,
          impactedFiles: 0,
          changes: [],
          impacts: [],
        });
        continue;
      }

      const baselineDoc = parseOpenApi(fs.readFileSync(snapshotPath, "utf-8"));
      const changes = diffOpenApi(baselineDoc, liveDoc);

      if (changes.length === 0) {
        log("  ✓ No contract changes since baseline.\n");
        results.push({
          vendor: vendorId,
          status: "no-changes",
          breaking: 0,
          additive: 0,
          nonBreaking: 0,
          impactedFiles: 0,
          changes: [],
          impacts: [],
        });
        continue;
      }

      if (consumerFiles === null) {
        consumerFiles = collectConsumerFiles(targetDir);
      }
      const impacts = findImpactedCode(changes, consumerFiles);
      const breaking = changes.filter((c) => c.severity === "breaking");
      const additive = changes.filter((c) => c.severity === "additive");
      const impactedFiles = new Set(impacts.map((i) => i.file)).size;

      log(`  ${breaking.length} breaking, ${additive.length} additive change${changes.length !== 1 ? "s" : ""} detected:`);
      for (const change of breaking.slice(0, 10)) {
        log(`    [breaking] ${change.summary}`);
      }
      if (breaking.length > 10) log(`    ... and ${breaking.length - 10} more breaking changes`);
      log(`  Impact: ${impactedFiles} file(s), ${impacts.length} call site(s)\n`);

      const report = {
        timestamp: new Date().toISOString(),
        vendor: vendorId,
        specUrl: vendor.openapiUrl,
        changes,
        impacts,
        summary: {
          breaking: breaking.length,
          additive: additive.length,
          nonBreaking: changes.length - breaking.length - additive.length,
          impactedFiles,
          impactedCallSites: impacts.length,
        },
      };
      fs.writeFileSync(
        path.join(reportsDir, `check-${vendorId}.json`),
        JSON.stringify(report, null, 2),
        "utf-8",
      );
      // Also feed the repair pipeline (repairo repair reads latest-diff.json)
      fs.writeFileSync(
        path.join(reportsDir, "latest-diff.json"),
        JSON.stringify(report, null, 2),
        "utf-8",
      );

      if (options.updateSnapshot) {
        fs.writeFileSync(snapshotPath, liveNormalized, "utf-8");
        log(`  Snapshot updated: .repairo/snapshots/${vendorId}.json\n`);
      }

      results.push({
        vendor: vendorId,
        status: "changes-detected",
        breaking: breaking.length,
        additive: additive.length,
        nonBreaking: changes.length - breaking.length - additive.length,
        impactedFiles,
        changes,
        impacts,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`  ⚠️ Check failed: ${message}\n`);
      results.push({
        vendor: vendorId,
        status: "error",
        breaking: 0,
        additive: 0,
        nonBreaking: 0,
        impactedFiles: 0,
        changes: [],
        impacts: [],
        error: message,
      });
    }
  }

  const totalBreaking = results.reduce((sum, r) => sum + r.breaking, 0);
  const errors = results.filter((r) => r.status === "error");

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          results: results.map(({ changes, impacts, ...summary }) => ({
            ...summary,
            changes: changes.map((c) => ({
              kind: c.kind,
              severity: c.severity,
              path: c.path,
              operation: c.operation,
              field: c.field,
              summary: c.summary,
            })),
          })),
          totalBreaking,
        },
        null,
        2,
      ),
    );
  } else {
    log("──────────────────────────────");
    if (totalBreaking > 0) {
      log(`❌ ${totalBreaking} breaking change${totalBreaking !== 1 ? "s" : ""} detected.`);
      log("Next step:");
      log("  repairo repair --dry-run\n");
    } else if (errors.length === results.length) {
      log("⚠️ All vendor checks failed.\n");
    } else {
      log("✓ No breaking changes detected.\n");
    }
  }

  if (totalBreaking > 0) process.exit(1);
  if (errors.length === results.length && results.length > 0) process.exit(2);
}
