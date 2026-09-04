import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import yaml from "js-yaml";
import { diffWithOasdiff, isOasdiffAvailable } from "../lib/engine/oasdiff";
import { diffSpecs, type BreakingChange as EngineChange } from "../lib/engine/spec-diff";

/** One breaking change, normalised to the shape the PR comment table needs. */
export interface BreakingChange {
  /** Rule id, e.g. `response-field-removed`. */
  rule: string;
  /** `METHOD /path`, or `*` when the change is not scoped to one operation. */
  endpoint: string;
  details: string;
  level: "error" | "warn";
}

export interface OasdiffResult {
  breaking: BreakingChange[];
  /** Which engine produced the result — useful in logs. */
  engine: "oasdiff" | "builtin";
}

export interface OasdiffInput {
  /** Raw spec text (YAML or JSON). `null`/empty means "no spec on this side". */
  base: string | null;
  head: string | null;
}

const EMPTY_SPEC = "openapi: 3.0.0\ninfo: {title: empty, version: '0'}\npaths: {}\n";

/**
 * Diff two OpenAPI documents and return only the breaking changes.
 *
 * Thin adapter for the GitHub App over the shared engine in `src/lib/engine`:
 * uses the `oasdiff` CLI wrapper (https://github.com/oasdiff/oasdiff) when the
 * binary is available — set `OASDIFF_BIN` or have `oasdiff` on PATH — and
 * otherwise falls back to the built-in `diffSpecs` engine so the app works
 * with zero extra tooling.
 */
export async function runOasdiff(input: OasdiffInput): Promise<OasdiffResult> {
  const base = normaliseSpec(input.base);
  const head = normaliseSpec(input.head);

  const binaryPath = process.env.OASDIFF_BIN ?? "oasdiff";
  if (await isOasdiffAvailable({ binaryPath })) {
    return { engine: "oasdiff", breaking: await runBinary(binaryPath, base, head) };
  }
  return { engine: "builtin", breaking: diffSpecs(base, head).map(toBreakingChange) };
}

async function runBinary(binaryPath: string, base: string, head: string): Promise<BreakingChange[]> {
  const dir = await mkdtemp(join(tmpdir(), "repairo-oasdiff-"));
  try {
    const basePath = join(dir, "base.yaml");
    const headPath = join(dir, "head.yaml");
    await writeFile(basePath, base);
    await writeFile(headPath, head);
    // minLevel 2 keeps oasdiff's WARN-level findings (e.g. a removed request
    // parameter), which our rule set also treats as breaking.
    const changes = await diffWithOasdiff(basePath, headPath, { binaryPath, minLevel: 2 });
    return changes.map(toBreakingChange);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Validate a raw spec and return the text to diff. A missing side becomes an
 * empty document so a deleted spec reports every endpoint as removed.
 */
function normaliseSpec(text: string | null): string {
  if (!text || !text.trim()) return EMPTY_SPEC;
  const doc = yaml.load(text);
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    throw new Error("Spec is not a YAML/JSON object");
  }
  return text;
}

/** Map an engine change onto the `rule | endpoint | details` row the comment renders. */
export function toBreakingChange(change: EngineChange): BreakingChange {
  const endpoint = change.method === "*" ? change.path : `${change.method} ${change.path}`;
  return { rule: change.rule, endpoint, details: change.details, level: "error" };
}
