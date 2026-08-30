import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { Project, ts } from "ts-morph";

export interface TypeDiagnostic {
  file: string;
  line: number;
  code: number;
  message: string;
}

export interface ValidationResult {
  passed: boolean;
  typecheckPassed: boolean;
  typecheckOutput: string;
  /** Errors present before the repair was applied (ignored for pass/fail) */
  preexistingErrorCount: number;
  /** Errors introduced by the repair (these fail validation) */
  newErrors: TypeDiagnostic[];
  testsPassed: boolean | null; // null if skipped / no test script
  testsOutput?: string;
  errors: string[];
}

function findProjectRoot(dir: string): string {
  let curr = path.resolve(dir);
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, "tsconfig.json")) || fs.existsSync(path.join(curr, "package.json"))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return path.resolve(dir);
}

function collectTsFiles(dir: string): string[] {
  const res: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".next", ".git", "dist", ".repairo"].includes(entry.name)) {
        res.push(...collectTsFiles(p));
      }
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      res.push(p);
    }
  }
  return res;
}

/**
 * Collects TypeScript diagnostics for the project containing targetDir,
 * using tsconfig.json when present or an ad-hoc program otherwise.
 * Run this BEFORE applying repairs to establish the pre-existing error
 * baseline, so validation only fails on errors a repair introduces.
 */
export function collectTypeDiagnostics(targetDir: string): TypeDiagnostic[] {
  const rootDir = findProjectRoot(targetDir);
  const tsconfigPath = path.join(rootDir, "tsconfig.json");

  let project: Project;
  if (fs.existsSync(tsconfigPath)) {
    project = new Project({ tsConfigFilePath: tsconfigPath });
  } else {
    project = new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: { noEmit: true, strict: false, skipLibCheck: true },
    });
    for (const f of collectTsFiles(rootDir)) {
      project.addSourceFileAtPath(f);
    }
  }

  return project.getPreEmitDiagnostics().map((d) => ({
    file: d.getSourceFile()?.getFilePath() ?? "",
    line: d.getLineNumber() ?? 0,
    code: d.getCode(),
    message: ts.flattenDiagnosticMessageText(d.compilerObject.messageText, " "),
  }));
}

/**
 * Line numbers are intentionally excluded: repairs shift lines, and a
 * pre-existing error that moved must not be counted as a new error.
 */
function diagnosticKey(d: TypeDiagnostic): string {
  return `${d.file}|${d.code}|${d.message}`;
}

/**
 * Validates a repository target directory after code transformations.
 * When a baseline (collected via collectTypeDiagnostics before the repair)
 * is provided, only newly introduced errors fail validation — so repos
 * with pre-existing type errors can still receive repairs.
 */
export function validateCodebase(
  targetDir: string,
  options: { runTests?: boolean; baseline?: TypeDiagnostic[] } = {}
): ValidationResult {
  const rootDir = findProjectRoot(targetDir);
  const errors: string[] = [];
  let typecheckPassed = false;
  let typecheckOutput = "";
  let preexistingErrorCount = 0;
  let newErrors: TypeDiagnostic[] = [];
  let testsPassed: boolean | null = null;
  let testsOutput = "";

  // 1. TypeScript diagnostics, compared against the pre-repair baseline
  try {
    const diagnostics = collectTypeDiagnostics(targetDir);
    const baselineKeys = new Set((options.baseline ?? []).map(diagnosticKey));
    newErrors = diagnostics.filter((d) => !baselineKeys.has(diagnosticKey(d)));
    preexistingErrorCount = diagnostics.length - newErrors.length;

    if (newErrors.length === 0) {
      typecheckPassed = true;
      typecheckOutput =
        preexistingErrorCount > 0
          ? `No new TypeScript errors (${preexistingErrorCount} pre-existing error${preexistingErrorCount !== 1 ? "s" : ""} ignored).`
          : "No TypeScript errors found.";
    } else {
      typecheckPassed = false;
      typecheckOutput = newErrors
        .slice(0, 10)
        .map((d) => `${d.file}:${d.line}: TS${d.code}: ${d.message}`)
        .join("\n");
      errors.push(
        `Typecheck failed with ${newErrors.length} new diagnostic error${newErrors.length !== 1 ? "s" : ""}` +
          (preexistingErrorCount > 0 ? ` (${preexistingErrorCount} pre-existing ignored)` : "") +
          ".",
      );
    }
  } catch (e: unknown) {
    typecheckPassed = false;
    typecheckOutput = e instanceof Error ? e.message : String(e);
    errors.push("Typecheck execution error.");
  }

  // 2. Run tests if package.json has a test script and runTests is enabled
  if (options.runTests) {
    const pkgPath = path.join(rootDir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.scripts && pkg.scripts.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1') {
          const testOut = execSync("npm test", {
            cwd: rootDir,
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 300_000,
          });
          testsPassed = true;
          testsOutput = testOut;
        } else {
          testsPassed = null; // Skipped
        }
      } catch (err: any) {
        testsPassed = false;
        testsOutput = (err.stdout || "") + "\n" + (err.stderr || "");
        errors.push("Workspace test suite failed.");
      }
    }
  }

  const passed = typecheckPassed && (testsPassed === null || testsPassed === true);

  return {
    passed,
    typecheckPassed,
    typecheckOutput,
    preexistingErrorCount,
    newErrors,
    testsPassed,
    testsOutput,
    errors,
  };
}

/**
 * Validates a set of in-memory files without touching disk — for callers (like the hosted
 * GitHub-PR flow) that never have a real checkout to run `tsc` against. This can't see the
 * project's actual node_modules types, so it won't catch every error `validateCodebase`
 * would, but it does catch same-project inconsistencies (e.g. a rewritten comparison that
 * no longer type-checks against its own interfaces) using the real TypeScript compiler.
 */
export function validateInMemory(
  files: { path: string; content: string }[],
): { passed: boolean; errors: string[] } {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true, jsx: 2, skipLibCheck: true, strict: false, noEmit: true },
  });

  for (const file of files) {
    if (!/\.(ts|tsx)$/i.test(file.path)) continue;
    try {
      project.createSourceFile(file.path, file.content);
    } catch {
      // Unparseable content is reported as a diagnostic-shaped error below instead.
    }
  }

  try {
    const diagnostics = project.getPreEmitDiagnostics();
    const errors = diagnostics
      .slice(0, 20)
      .map((d) => `${d.getSourceFile()?.getFilePath() ?? "?"}:${d.getLineNumber() ?? "?"}: ${d.getMessageText()}`);
    return { passed: errors.length === 0, errors };
  } catch (e: any) {
    return { passed: false, errors: [e.message || String(e)] };
  }
}
