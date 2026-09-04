import { execFile } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { parse } from "yaml";
import { diffOpenApi } from "../lib/engine/diff";
import type { ApiChange, OpenApiDocument } from "../lib/engine/types";

const execFileAsync = promisify(execFile);

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

/**
 * Diff two OpenAPI documents and return only the breaking changes.
 *
 * Uses the `oasdiff` CLI (https://github.com/oasdiff/oasdiff) when it is
 * available — set `OASDIFF_BIN` or have `oasdiff` on PATH — and otherwise
 * falls back to Repairo's built-in structural diff so the app works with
 * zero extra tooling.
 */
export async function runOasdiff(input: OasdiffInput): Promise<OasdiffResult> {
  const bin = process.env.OASDIFF_BIN ?? "oasdiff";
  if (await isExecutable(bin)) {
    return { engine: "oasdiff", breaking: await runOasdiffBinary(bin, input) };
  }
  return { engine: "builtin", breaking: runBuiltinDiff(input) };
}

// ---------------------------------------------------------------------------
// oasdiff binary
// ---------------------------------------------------------------------------

interface OasdiffJsonEntry {
  id: string;
  text: string;
  level: number; // 3 = ERR, 2 = WARN, 1 = INFO
  operation?: string;
  path?: string;
}

async function runOasdiffBinary(bin: string, input: OasdiffInput): Promise<BreakingChange[]> {
  const dir = await mkdtemp(join(tmpdir(), "repairo-oasdiff-"));
  try {
    const basePath = join(dir, "base.yaml");
    const headPath = join(dir, "head.yaml");
    await writeFile(basePath, input.base ?? "openapi: 3.0.0\ninfo: {title: empty, version: '0'}\npaths: {}\n");
    await writeFile(headPath, input.head ?? "openapi: 3.0.0\ninfo: {title: empty, version: '0'}\npaths: {}\n");

    const { stdout } = await execFileAsync(bin, ["breaking", basePath, headPath, "--format", "json"], {
      maxBuffer: 16 * 1024 * 1024,
    });
    const entries = (stdout.trim() ? JSON.parse(stdout) : []) as OasdiffJsonEntry[];
    return entries
      .filter((e) => e.level >= 2)
      .map((e) => ({
        rule: e.id,
        endpoint: e.operation && e.path ? `${e.operation.toUpperCase()} ${e.path}` : "*",
        details: e.text,
        level: e.level >= 3 ? "error" : "warn",
      }));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function isExecutable(bin: string): Promise<boolean> {
  try {
    await execFileAsync(bin, ["--version"]);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Built-in fallback (src/lib/engine/diff.ts)
// ---------------------------------------------------------------------------

export function parseSpec(text: string | null): OpenApiDocument {
  if (!text || !text.trim()) return { paths: {} };
  const doc = parse(text);
  if (!doc || typeof doc !== "object") {
    throw new Error("Spec is not a YAML/JSON object");
  }
  return doc as OpenApiDocument;
}

function runBuiltinDiff(input: OasdiffInput): BreakingChange[] {
  const changes = diffOpenApi(parseSpec(input.base), parseSpec(input.head));
  return changes.filter((c) => c.severity === "breaking").map(toBreakingChange);
}

/** Map an engine `ApiChange` onto an oasdiff-style rule id + human sentence. */
export function toBreakingChange(change: ApiChange): BreakingChange {
  const endpoint = change.operation
    ? `${change.operation.toUpperCase()} ${change.path}`
    : "*";
  const side = change.side === "response" ? "response" : "request";
  const sideLabel = side === "response" ? "Response" : "Request";
  // The engine reports parameters and body fields with the same kinds; its
  // summaries for parameters always start with "Parameter".
  const isParam = change.summary.startsWith("Parameter");
  const name = change.field ?? "";

  switch (change.kind) {
    case "endpoint-removed":
      return { rule: "endpoint-removed", endpoint, details: `Endpoint ${endpoint} was removed`, level: "error" };
    case "field-removed":
      return isParam
        ? { rule: "request-param-removed", endpoint, details: `Parameter '${name}' was removed`, level: "error" }
        : { rule: `${side}-field-removed`, endpoint, details: `${sideLabel} field '${name}' was removed`, level: "error" };
    case "field-required":
      return isParam
        ? { rule: "required-param-added", endpoint, details: `New required parameter '${name}' was added`, level: "error" }
        : { rule: `${side}-field-required`, endpoint, details: `${sideLabel} field '${name}' is now required`, level: "error" };
    case "type-changed":
      return {
        rule: `${side}-field-type-changed`,
        endpoint,
        details: `${sideLabel} field '${name}' changed type from ${change.before} to ${change.after}`,
        level: "error",
      };
    case "enum-value-removed":
      return {
        rule: `${side}-enum-value-removed`,
        endpoint,
        details: `Enum value '${change.before}' was removed from ${side} field '${name}'`,
        level: "error",
      };
    case "server-url-changed":
      return {
        rule: "server-url-changed",
        endpoint,
        details: `Base URL changed from ${change.before} to ${change.after}`,
        level: "warn",
      };
    default:
      return { rule: change.kind, endpoint, details: change.summary, level: "error" };
  }
}
