import fs from "fs";
import path from "path";
import type { ConsumerFile } from "./types";
import { PYTHON_SKIP_DIRS } from "./python-syntax";
import { GO_SKIP_DIRS } from "./go-syntax";

/** Every extension a consumer-code transform exists for, kept in one place so the CLI, the
 * GitHub App, and any future entry point walk the same set of files. TS/JS variants match
 * `src/github-app/webhooks.ts`'s CODE_LIKE; `.py`/`.go` match their own engines. */
export const CONSUMER_FILE_RE = /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs|py|go)$/i;

/** Union of every language-specific skip-dir set (Python's venv/__pycache__, Go's vendor,
 * ...) plus the generic build/VCS directories no consumer code ever lives in. */
export const CONSUMER_IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  ".repairo",
  ...PYTHON_SKIP_DIRS,
  ...GO_SKIP_DIRS,
]);

/**
 * Walks `rootDir` for consumer source files, skipping build/VCS/dependency directories.
 * Paths are returned relative to `cwd` (default: the process's own cwd) with forward
 * slashes, matching what `ConsumerFile.path` looks like everywhere else in the engine.
 */
export function collectConsumerFiles(rootDir: string, cwd: string = process.cwd()): ConsumerFile[] {
  const results: ConsumerFile[] = [];
  if (!fs.existsSync(rootDir)) return results;

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!CONSUMER_IGNORE_DIRS.has(entry.name)) walk(fullPath);
      } else if (CONSUMER_FILE_RE.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        results.push({
          path: path.relative(cwd, fullPath).replace(/\\/g, "/"),
          content: fs.readFileSync(fullPath, "utf-8"),
        });
      }
    }
  }
  walk(rootDir);
  return results;
}
