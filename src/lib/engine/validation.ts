import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { Project, ts } from "ts-morph";
import { PY_LIKE, validatePythonSyntax } from "./python-syntax";
import { GO_LIKE, validateGoSyntax } from "./go-syntax";
import { CONSUMER_IGNORE_DIRS } from "./consumer-files";

/** TS and every plain-JS variant ts-morph can typecheck with `allowJs` on. Kept separate
 * from CONSUMER_FILE_RE (which also matches .py/.go) since this set feeds a TS Project. */
const TS_JS_LIKE = /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/i;

export interface TypeDiagnostic {
  file: string;
  line: number;
  code: number;
  message: string;
}

export interface ValidationResult {
  /** Overall pass/fail across every language present — TS/JS typecheck, Python syntax
   * (+ optional Pyright), Go syntax, and the test suite when requested. */
  passed: boolean;
  /** Kept for backward compatibility: true only when EVERY language's check passed, not
   * just TS/JS's. Prefer `tsJsPassed` when you specifically mean the TS/JS typecheck. */
  typecheckPassed: boolean;
  typecheckOutput: string;
  /** Errors present before the repair was applied (ignored for pass/fail) */
  preexistingErrorCount: number;
  /** Errors introduced by the repair (these fail validation) */
  newErrors: TypeDiagnostic[];
  testsPassed: boolean | null; // null if skipped / no test script
  testsOutput?: string;
  errors: string[];
  /** True iff the TS/JS typecheck itself passed (new-errors-only, baseline-subtracted). */
  tsJsPassed: boolean;
  /** True iff every .py file's syntax gate passed (and Pyright, when it ran). Absent
   * pythonFileCount means no Python files were present at all. */
  pythonPassed: boolean;
  pythonFileCount: number;
  pythonErrors: string[];
  /** Whether Pyright actually ran (vs. being skipped because it isn't installed/configured). */
  pyrightRan: boolean;
  /** True iff every .go file's syntax gate passed. */
  goPassed: boolean;
  goFileCount: number;
  goErrors: string[];
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
      if (!CONSUMER_IGNORE_DIRS.has(entry.name)) {
        res.push(...collectTsFiles(p));
      }
    } else if (TS_JS_LIKE.test(entry.name) && !entry.name.endsWith(".d.ts")) {
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
      compilerOptions: { noEmit: true, strict: false, skipLibCheck: true, allowJs: true, checkJs: false },
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

export interface PyrightDiagnostic {
  file: string;
  line: number;
  rule: string;
  message: string;
}

function pyrightDiagnosticKey(d: PyrightDiagnostic): string {
  return `${d.file}|${d.rule}|${d.message}`;
}

/** Walks up from `dir` looking for a `pyrightconfig.json`, or a `pyproject.toml` with a
 * `[tool.pyright]` section — the same signal a human running Pyright locally would use to
 * know "this is a real Pyright project," not just "there happens to be a .py file here." */
function findPyrightConfigRoot(dir: string): string | null {
  let curr = path.resolve(dir);
  while (true) {
    if (fs.existsSync(path.join(curr, "pyrightconfig.json"))) return curr;
    const pyproject = path.join(curr, "pyproject.toml");
    if (fs.existsSync(pyproject)) {
      try {
        if (fs.readFileSync(pyproject, "utf-8").includes("[tool.pyright]")) return curr;
      } catch {
        // unreadable pyproject.toml — not a signal either way
      }
    }
    const parent = path.dirname(curr);
    if (parent === curr) return null;
    curr = parent;
  }
}

/** True iff running this exact command with these args exits without a spawn error (ENOENT,
 * permission denied, ...) — i.e. the binary actually exists and is invocable. Doesn't care
 * about the command's own exit code; `--version` on a real pyright can still fail loudly. */
function commandIsInvocable(cmd: string, args: string[]): boolean {
  try {
    const result = spawnSync(cmd, args, { stdio: "ignore" });
    return result.error == null;
  } catch {
    return false;
  }
}

function resolvePyrightCommand(): { cmd: string; args: string[] } | null {
  if (commandIsInvocable("pyright", ["--version"])) return { cmd: "pyright", args: [] };
  // --no-install: never trigger a network fetch just to check availability — Pyright is
  // optional, and silently downloading a multi-hundred-MB tool on every repair run would be
  // a surprise, not a convenience.
  if (commandIsInvocable("npx", ["--no-install", "pyright", "--version"])) {
    return { cmd: "npx", args: ["--no-install", "pyright"] };
  }
  return null;
}

/**
 * Runs Pyright against `targetDir` if (and only if) both a Pyright project config exists
 * somewhere above it AND a pyright binary is actually resolvable — never installs anything,
 * never errors when either is missing, just reports `ran: false` so the caller treats
 * Pyright as skipped rather than failed. This is the optional layer on top of the mandatory
 * `validatePythonSyntax` gate, mirroring how `tsc` is optional-but-preferred over ts-morph's
 * own parse-level checks when a real tsconfig project is available.
 */
export function collectPyrightDiagnostics(targetDir: string): { ran: boolean; diagnostics: PyrightDiagnostic[] } {
  const configRoot = findPyrightConfigRoot(targetDir);
  if (!configRoot) return { ran: false, diagnostics: [] };

  const resolved = resolvePyrightCommand();
  if (!resolved) return { ran: false, diagnostics: [] };

  try {
    const result = spawnSync(resolved.cmd, [...resolved.args, "--outputjson", configRoot], {
      encoding: "utf-8",
      maxBuffer: 20 * 1024 * 1024,
    });
    if (!result.stdout) return { ran: false, diagnostics: [] };
    const parsed = JSON.parse(result.stdout) as {
      generalDiagnostics?: Array<{ file: string; severity: string; message: string; range?: { start?: { line?: number } }; rule?: string }>;
    };
    const diagnostics: PyrightDiagnostic[] = (parsed.generalDiagnostics ?? [])
      .filter((d) => d.severity === "error")
      .map((d) => ({
        file: d.file,
        line: (d.range?.start?.line ?? 0) + 1,
        rule: d.rule ?? "",
        message: d.message,
      }));
    return { ran: true, diagnostics };
  } catch {
    // Malformed output, a Pyright crash, or anything else unexpected — Pyright is optional,
    // so a broken invocation is treated the same as "not available," never as a hard failure.
    return { ran: false, diagnostics: [] };
  }
}

/**
 * Validates a repository target directory after code transformations.
 * When a baseline (collected via collectTypeDiagnostics before the repair)
 * is provided, only newly introduced errors fail validation — so repos
 * with pre-existing type errors can still receive repairs.
 */
export function validateCodebase(
  targetDir: string,
  options: { runTests?: boolean; baseline?: TypeDiagnostic[]; pythonBaseline?: PyrightDiagnostic[] } = {}
): ValidationResult {
  const rootDir = findProjectRoot(targetDir);
  const errors: string[] = [];
  let tsJsPassed = false;
  let typecheckOutput = "";
  let preexistingErrorCount = 0;
  let newErrors: TypeDiagnostic[] = [];
  let testsPassed: boolean | null = null;
  let testsOutput = "";

  // 1. TypeScript/JS diagnostics, compared against the pre-repair baseline
  try {
    const diagnostics = collectTypeDiagnostics(targetDir);
    const baselineKeys = new Set((options.baseline ?? []).map(diagnosticKey));
    newErrors = diagnostics.filter((d) => !baselineKeys.has(diagnosticKey(d)));
    preexistingErrorCount = diagnostics.length - newErrors.length;

    if (newErrors.length === 0) {
      tsJsPassed = true;
      typecheckOutput =
        preexistingErrorCount > 0
          ? `No new TypeScript/JS errors (${preexistingErrorCount} pre-existing error${preexistingErrorCount !== 1 ? "s" : ""} ignored).`
          : "No TypeScript/JS errors found.";
    } else {
      tsJsPassed = false;
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
    tsJsPassed = false;
    typecheckOutput = e instanceof Error ? e.message : String(e);
    errors.push("Typecheck execution error.");
  }

  // 2. Python: validatePythonSyntax is the mandatory gate for every .py file; Pyright runs
  // on top of it, baseline-subtracted the same way TS is, only when a real Pyright project
  // is configured and the binary is actually available (see collectPyrightDiagnostics).
  function collectPyFiles(dir: string): string[] {
    const out: string[] = [];
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (CONSUMER_IGNORE_DIRS.has(entry.name)) continue;
        out.push(...collectPyFiles(full));
      } else if (PY_LIKE.test(entry.name)) {
        out.push(full);
      }
    }
    return out;
  }
  const pyFiles = collectPyFiles(targetDir);
  const pythonErrors: string[] = [];
  let pythonPassed = true;
  for (const pyFile of pyFiles) {
    const syntax = validatePythonSyntax(fs.readFileSync(pyFile, "utf-8"));
    if (!syntax.ok) {
      pythonPassed = false;
      pythonErrors.push(`${pyFile}: ${syntax.error ?? "invalid Python syntax"}`);
    }
  }

  let pyrightRan = false;
  if (pyFiles.length > 0) {
    const pyright = collectPyrightDiagnostics(targetDir);
    pyrightRan = pyright.ran;
    if (pyright.ran) {
      const pyrightBaselineKeys = new Set((options.pythonBaseline ?? []).map(pyrightDiagnosticKey));
      const pyrightNewErrors = pyright.diagnostics.filter((d) => !pyrightBaselineKeys.has(pyrightDiagnosticKey(d)));
      if (pyrightNewErrors.length > 0) {
        pythonPassed = false;
        for (const d of pyrightNewErrors.slice(0, 10)) {
          pythonErrors.push(`${d.file}:${d.line}: [${d.rule}] ${d.message}`);
        }
      }
    }
  }
  if (!pythonPassed) {
    errors.push(`Python validation failed with ${pythonErrors.length} error${pythonErrors.length !== 1 ? "s" : ""}.`);
  }

  // 3. Go: validateGoSyntax is the only gate today (no Pyright-equivalent optional
  // typechecker wired in yet — see AGENTS.md-style future work, not this pass).
  function collectGoFiles(dir: string): string[] {
    const out: string[] = [];
    if (!fs.existsSync(dir)) return out;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (CONSUMER_IGNORE_DIRS.has(entry.name)) continue;
        out.push(...collectGoFiles(full));
      } else if (GO_LIKE.test(entry.name)) {
        out.push(full);
      }
    }
    return out;
  }
  const goFiles = collectGoFiles(targetDir);
  const goErrors: string[] = [];
  let goPassed = true;
  for (const goFile of goFiles) {
    const syntax = validateGoSyntax(fs.readFileSync(goFile, "utf-8"));
    if (!syntax.ok) {
      goPassed = false;
      goErrors.push(`${goFile}: ${syntax.error ?? "invalid Go syntax"}`);
    }
  }
  if (!goPassed) {
    errors.push(`Go validation failed with ${goErrors.length} error${goErrors.length !== 1 ? "s" : ""}.`);
  }

  // 4. Run tests if package.json has a test script and runTests is enabled
  if (options.runTests) {
    const pkgPath = path.join(rootDir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        const isInternalFixture = pkg.name === "repairo-cli" && path.resolve(targetDir) !== rootDir;
        if (pkg.scripts && pkg.scripts.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1' && !isInternalFixture) {
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

  const typecheckPassed = tsJsPassed && pythonPassed && goPassed;
  const passed = typecheckPassed && (testsPassed === null || testsPassed === true);

  return {
    passed,
    typecheckPassed,
    typecheckOutput,
    preexistingErrorCount,
    newErrors,
    testsPassed,
    testsOutput,
    tsJsPassed,
    pythonPassed,
    pythonFileCount: pyFiles.length,
    pythonErrors,
    pyrightRan,
    goPassed,
    goFileCount: goFiles.length,
    goErrors,
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
  const pyErrors: string[] = [];
  for (const file of files) {
    if (!PY_LIKE.test(file.path)) continue;
    const syntax = validatePythonSyntax(file.content);
    if (!syntax.ok) {
      pyErrors.push(`${file.path}: ${syntax.error ?? "invalid Python syntax"}`);
    }
  }

  const goErrors: string[] = [];
  for (const file of files) {
    if (!GO_LIKE.test(file.path)) continue;
    const syntax = validateGoSyntax(file.content);
    if (!syntax.ok) {
      goErrors.push(`${file.path}: ${syntax.error ?? "invalid Go syntax"}`);
    }
  }

  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true, jsx: 2, skipLibCheck: true, strict: false, noEmit: true },
  });

  let hasTsOrJs = false;
  for (const file of files) {
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(file.path)) continue;
    hasTsOrJs = true;
    try {
      project.createSourceFile(file.path, file.content);
    } catch {
      // Unparseable content is reported as a diagnostic-shaped error below instead.
    }
  }

  const errors: string[] = [...pyErrors, ...goErrors];
  if (hasTsOrJs) {
    try {
      const diagnostics = project.getPreEmitDiagnostics();
      errors.push(
        ...diagnostics
          .slice(0, 20)
          .map((d) => `${d.getSourceFile()?.getFilePath() ?? "?"}:${d.getLineNumber() ?? "?"}: ${d.getMessageText()}`),
      );
    } catch (e: any) {
      errors.push(e.message || String(e));
    }
  }

  return { passed: errors.length === 0, errors };
}
