import fs from "fs";
import path from "path";
import {
  applyAstTransforms,
  collectTypeDiagnostics,
  createGitHubPR,
  diffOpenApi,
  findImpactedCode,
  getGitStatus,
  getReportsDir,
  getSnapshotsDir,
  initRepairoConfig,
  loadRepairoConfig,
  parseOpenApi,
  resolveAmbiguousEnums,
  validateCodebase,
  type AgentEnumResolution,
  type ApiChange,
  type ConsumerFile,
} from "../../lib/engine";

export interface RepairOptions {
  spec?: string;
  target?: string;
  dryRun?: boolean;
  apply?: boolean;
  createPr?: boolean;
  /** Off by default. Also requires ANTHROPIC_API_KEY — neither gate alone is sufficient. */
  agentResolve?: boolean;
  agentModel?: string;
  maxAgentResolutions?: number;
}

function makeConsoleDiff(beforeContent: string, afterContent: string, filePath: string): string {
  const beforeLines = beforeContent.split(/\r?\n/);
  const afterLines = afterContent.split(/\r?\n/);
  const output: string[] = [`File: ${filePath}\n`];

  let i = 0;
  let j = 0;
  let lineNum = 1;

  while (i < beforeLines.length || j < afterLines.length) {
    const b = beforeLines[i];
    const a = afterLines[j];

    if (b === a) {
      i++;
      j++;
      lineNum++;
      continue;
    }

    if (b !== undefined && (a === undefined || !afterLines.includes(b, j))) {
      output.push(`  L${lineNum}  - ${b}`);
      i++;
    } else if (a !== undefined && (b === undefined || !beforeLines.includes(a, i))) {
      output.push(`  L${lineNum}  + ${a}`);
      j++;
    } else {
      output.push(`  L${lineNum}  - ${b}`);
      output.push(`  L${lineNum}  + ${a}`);
      i++;
      j++;
    }
    lineNum++;
  }

  return output.join("\n");
}

export async function handleRepairCommand(options: RepairOptions = {}): Promise<void> {
  console.log("\nREPAIRO REPAIR");
  console.log("──────────────────────────────\n");

  const targetDir = path.resolve(options.target || "./src");
  const snapshotsDir = getSnapshotsDir(".");
  const snapshotPath = path.join(snapshotsDir, "openapi.json");

  let changes: ApiChange[] = [];

  if (options.spec) {
    const specPath = path.resolve(options.spec);
    if (fs.existsSync(specPath)) {
      const incoming = parseOpenApi(fs.readFileSync(specPath, "utf-8"));
      if (fs.existsSync(snapshotPath)) {
        const baseline = parseOpenApi(fs.readFileSync(snapshotPath, "utf-8"));
        changes = diffOpenApi(baseline, incoming);
      } else {
        changes = diffOpenApi({ openapi: "3.0.0", paths: {} }, incoming);
      }
    }
  } else if (fs.existsSync(path.join(getReportsDir("."), "latest-diff.json"))) {
    const reportRaw = fs.readFileSync(path.join(getReportsDir("."), "latest-diff.json"), "utf-8");
    const report = JSON.parse(reportRaw);
    changes = report.changes || [];
  } else if (fs.existsSync(snapshotPath)) {
    const baseline = parseOpenApi(fs.readFileSync(snapshotPath, "utf-8"));
    changes = diffOpenApi({ openapi: "3.0.0", paths: {} }, baseline);
  }

  if (changes.length === 0) {
    console.log("No API changes detected — nothing to repair.\n");
    console.log("To detect changes first, run:");
    console.log("  repairo diff --spec ./path/to/new-openapi.json\n");
    return;
  }

  function collectFiles(dir: string): ConsumerFile[] {
    const res: ConsumerFile[] = [];
    if (!fs.existsSync(dir)) return res;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullP = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", ".next", ".git", "dist", ".repairo"].includes(entry.name)) {
          res.push(...collectFiles(fullP));
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

  const files = collectFiles(targetDir);
  if (files.length === 0) {
    console.log(`No source files found in ${targetDir}\n`);
    return;
  }

  let agentResolutions: Map<string, AgentEnumResolution> = new Map();
  if (options.agentResolve) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("⚠️ --agent-resolve was passed but ANTHROPIC_API_KEY is not set — falling back to flagging ambiguous cases for manual review.\n");
    } else {
      agentResolutions = await resolveAmbiguousEnums(changes, {
        enabled: true,
        model: options.agentModel,
        maxAgentResolutions: options.maxAgentResolutions,
      });
    }
  }

  const modifiedFiles: Array<{ file: ConsumerFile; updatedContent: string; diffText: string; agentFixes: number }> = [];

  for (const f of files) {
    const transformResult = applyAstTransforms(f.content, changes, f.path, [], agentResolutions);
    if (transformResult.content !== f.content) {
      modifiedFiles.push({
        file: f,
        updatedContent: transformResult.content,
        diffText: makeConsoleDiff(f.content, transformResult.content, f.path),
        agentFixes: transformResult.fixes.filter((fix) => fix.origin === "agent-proposed").length,
      });
    }
  }

  if (modifiedFiles.length === 0) {
    console.log("No AST repairs required for the current codebase.\n");
    return;
  }

  console.log(`Found ${modifiedFiles.length} file${modifiedFiles.length > 1 ? "s" : ""} needing AST repair:\n`);
  for (const mod of modifiedFiles) {
    console.log(`Proposed repair: ${mod.file.path}`);
    console.log(mod.diffText);
    if (mod.agentFixes > 0) {
      console.log(`  🤖 ${mod.agentFixes} AI-proposed, compile-verified fix${mod.agentFixes > 1 ? "es" : ""} — spec diff alone was ambiguous; review before merging`);
    }
    console.log();
  }

  const isApply = Boolean(options.apply);
  const isCreatePr = Boolean(options.createPr);

  console.log("REPAIRO VALIDATION");
  console.log("──────────────────────────────");

  // Baseline BEFORE writing repairs: pre-existing type errors are the
  // user's, not ours — validation only fails on errors the repair adds.
  const baseline = collectTypeDiagnostics(targetDir);
  if (baseline.length > 0) {
    console.log(`Pre-existing type errors: ${baseline.length} (ignored — validating new errors only)`);
  }

  const backupMap = new Map<string, string>();
  try {
    for (const mod of modifiedFiles) {
      backupMap.set(mod.file.path, mod.file.content);
      fs.writeFileSync(path.resolve(mod.file.path), mod.updatedContent, "utf-8");
    }

    const validation = validateCodebase(targetDir, { runTests: true, baseline });

    console.log(`AST transformation      PASS`);
    console.log(`TypeScript compilation  ${validation.typecheckPassed ? "PASS" : "FAIL"}`);
    if (validation.testsPassed !== null) {
      console.log(`Tests                    ${validation.testsPassed ? "PASS" : "FAIL"}`);
    } else {
      console.log(`Tests                    SKIP (no test script)`);
    }
    console.log();

    if (!validation.passed) {
      console.log("⚠️ REPAIRO VALIDATION FAILED");
      console.log("Repair was NOT accepted.\n");
      if (validation.errors.length > 0) {
        console.log("Errors:");
        for (const e of validation.errors) {
          console.log(`  - ${e}`);
        }
      }
      for (const [p, content] of backupMap) {
        fs.writeFileSync(path.resolve(p), content, "utf-8");
      }
      process.exit(1);
    }

    console.log("✓ Repair is safe to review.\n");

    if (options.dryRun || (!isApply && !isCreatePr)) {
      for (const [p, content] of backupMap) {
        fs.writeFileSync(path.resolve(p), content, "utf-8");
      }
      console.log("Mode: --dry-run");
      console.log("No files modified on disk.\n");
      console.log("To apply changes to your working tree:");
      console.log("  repairo repair --apply\n");
      return;
    }

    if (isApply) {
      console.log(`✓ Applied validated repairs to ${modifiedFiles.length} file${modifiedFiles.length > 1 ? "s" : ""}.\n`);
    }

    if (isCreatePr) {
      console.log("GitHub PR Creation:");
      const config = loadRepairoConfig(".");
      const prResult = await createGitHubPR({
        targetDir: ".",
        repoOwnerAndName: config?.repository,
        title: "fix(api): adapt codebase to breaking API changes",
        body: "Automated AST repair generated and validated by Repairo.",
      });

      if (prResult.success) {
        console.log(`✓ ${prResult.message}\n`);
      } else {
        console.log(`⚠️ ${prResult.message}\n`);
      }
    }
  } catch (err: any) {
    for (const [p, content] of backupMap) {
      if (fs.existsSync(path.resolve(p))) {
        fs.writeFileSync(path.resolve(p), content, "utf-8");
      }
    }
    console.error(`\n❌ Repair execution error: ${err.message || String(err)}\n`);
    process.exit(1);
  }
}
