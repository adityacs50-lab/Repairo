import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { Project } from "ts-morph";

export interface ValidationResult {
  passed: boolean;
  typecheckPassed: boolean;
  typecheckOutput: string;
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

/**
 * Validates a repository target directory after code transformations.
 * Performs real TypeScript compilation and optionally executes workspace tests.
 */
export function validateCodebase(
  targetDir: string,
  options: { runTests?: boolean } = {}
): ValidationResult {
  const rootDir = findProjectRoot(targetDir);
  const errors: string[] = [];
  let typecheckPassed = false;
  let typecheckOutput = "";
  let testsPassed: boolean | null = null;
  let testsOutput = "";

  // 1. Run TypeScript Typechecking
  const tsconfigPath = path.join(rootDir, "tsconfig.json");

  if (fs.existsSync(tsconfigPath)) {
    try {
      const output = execSync("npx tsc --noEmit --project ./tsconfig.json", {
        cwd: rootDir,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      typecheckPassed = true;
      typecheckOutput = output || "No TypeScript errors found.";
    } catch (err: any) {
      try {
        const project = new Project({ tsConfigFilePath: tsconfigPath });
        const diagnostics = project.getPreEmitDiagnostics();
        if (diagnostics.length === 0) {
          typecheckPassed = true;
          typecheckOutput = "Validated with ts-morph AST program (0 errors).";
        } else {
          typecheckPassed = false;
          typecheckOutput = diagnostics
            .slice(0, 10)
            .map((d) => `${d.getSourceFile()?.getFilePath()}:${d.getLineNumber()}: ${d.getMessageText()}`)
            .join("\n");
          errors.push(`Typecheck failed with ${diagnostics.length} diagnostic errors.`);
        }
      } catch (tsMorphErr: any) {
        typecheckPassed = false;
        typecheckOutput = (err.stdout || "") + "\n" + (err.stderr || "");
        errors.push(`TypeScript compilation failed with status ${err.status}`);
      }
    }
  } else {
    // Fallback: Validate using in-memory ts-morph program diagnostics
    try {
      const project = new Project({
        skipAddingFilesFromTsConfig: true,
        compilerOptions: {
          noEmit: true,
          strict: false,
          skipLibCheck: true,
        },
      });

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

      const files = collectTsFiles(rootDir);
      for (const f of files) {
        project.addSourceFileAtPath(f);
      }

      const diagnostics = project.getPreEmitDiagnostics();
      if (diagnostics.length === 0) {
        typecheckPassed = true;
        typecheckOutput = `Validated ${files.length} TypeScript files with ts-morph (0 errors).`;
      } else {
        typecheckPassed = false;
        typecheckOutput = diagnostics
          .slice(0, 10)
          .map((d) => `${d.getSourceFile()?.getFilePath()}:${d.getLineNumber()}: ${d.getMessageText()}`)
          .join("\n");
        errors.push(`Typecheck failed with ${diagnostics.length} diagnostic errors.`);
      }
    } catch (e: any) {
      typecheckPassed = false;
      typecheckOutput = e.message || String(e);
      errors.push("Typecheck execution error.");
    }
  }

  // 2. Run Tests if package.json has a test script and runTests is enabled
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
    testsPassed,
    testsOutput,
    errors,
  };
}
