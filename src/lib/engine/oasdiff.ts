/**
 * TypeScript wrapper around the `oasdiff` CLI.
 *
 * oasdiff (https://github.com/oasdiff/oasdiff) is a Go binary with a far larger
 * rule set than our own engine — 573 checks at the version this was built
 * against. This wrapper runs it as a child process and normalizes its findings
 * into the same `BreakingChange[]` shape `spec-diff.ts` produces, so callers can
 * swap engines without changing how they read results.
 *
 * Every check ID in OASDIFF_RULE_MAP below was verified against the output of
 * `oasdiff checks changelog`, and the exit-code and JSON-shape behaviour
 * documented here was observed directly rather than assumed. `tests/oasdiff.test.ts`
 * re-validates the mapping against the installed binary so an upstream rename
 * fails loudly instead of silently dropping findings.
 */

import { spawn } from "child_process";
import type { BreakingChange, BreakingRule } from "./spec-diff";

/* -------------------------------------------------------------------------- */
/* oasdiff's own output shape                                                  */
/* -------------------------------------------------------------------------- */

/** Position block oasdiff attaches to a finding. Both sides are optional. */
interface OasdiffSource {
  file?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

/**
 * A single entry of `oasdiff breaking ... -f json`.
 *
 * Only `id`, `text` and `level` are reliably present. `path`/`operation` are
 * absent for spec-global findings, and a finding carries `baseSource` only when
 * something was removed, `revisionSource` only when something was added, and
 * both when something changed in place.
 */
export interface OasdiffChange {
  id: string;
  text: string;
  comment?: string;
  /** 3 = ERR, 2 = WARN, 1 = INFO. */
  level: number;
  operation?: string;
  operationId?: string;
  path?: string;
  section?: string;
  source?: string;
  baseSource?: OasdiffSource;
  revisionSource?: OasdiffSource;
  fingerprint?: string;
}

/** oasdiff severity levels, as emitted in the `level` field. */
export const OASDIFF_LEVEL = { info: 1, warn: 2, err: 3 } as const;

/* -------------------------------------------------------------------------- */
/* Rule mapping                                                                */
/* -------------------------------------------------------------------------- */

/**
 * oasdiff check ID -> our internal rule ID.
 *
 * Intentionally partial. oasdiff ships hundreds of checks covering constraints
 * we have no rule for (min/max narrowing, pattern changes, sunset policy), and
 * inventing a mapping for those would misreport them. Anything absent here is
 * reported through `unmapped` rather than silently dropped — see
 * `diffWithOasdiffDetailed`.
 */
export const OASDIFF_RULE_MAP: Readonly<Record<string, BreakingRule>> = Object.freeze({
  // --- endpoint-removed: the whole path is gone ----------------------------
  // Verified: removing an entire path emits api-path-removed-*, while removing
  // one method from a surviving path emits api-removed-* (no "path" segment).
  "api-path-removed-without-deprecation": "endpoint-removed",
  "api-path-removed-before-sunset": "endpoint-removed",

  // --- method-removed: path survives, one operation does not ---------------
  "api-removed-without-deprecation": "method-removed",
  "api-removed-before-sunset": "method-removed",

  // --- required-param-added ------------------------------------------------
  "new-required-request-parameter": "required-param-added",
  "new-required-request-default-parameter-to-existing-path": "required-param-added",
  "new-required-request-header-property": "required-param-added",
  "request-parameter-became-required": "required-param-added",
  "request-header-property-became-required": "required-param-added",

  // --- request-field-made-required -----------------------------------------
  "new-required-request-property": "request-field-made-required",
  "new-required-request-property-with-default": "request-field-made-required",
  "request-property-became-required": "request-field-made-required",
  "request-property-became-required-with-default": "request-field-made-required",
  "request-body-became-required": "request-field-made-required",
  "request-body-added-required": "request-field-made-required",

  // --- param-removed --------------------------------------------------------
  // NOTE: plain `request-parameter-removed` is WARN (level 2) in oasdiff, which
  // treats a dropped request parameter as tolerable because servers ignore
  // unknown input. Our rule set calls it breaking, so surfacing it requires
  // minLevel <= 2 (see OasdiffOptions.minLevel).
  "request-parameter-removed": "param-removed",
  "request-parameter-removed-before-sunset": "param-removed",

  // --- response-field-removed ----------------------------------------------
  // oasdiff only flags *required* response properties: dropping an optional one
  // is not guaranteed to break a reader. There is no `response-property-removed`
  // check to map.
  "response-required-property-removed": "response-field-removed",
  "response-media-type-removed": "response-field-removed",
  "response-body-media-type-schema-removed": "response-field-removed",

  // --- field-type-changed ---------------------------------------------------
  "request-parameter-type-changed": "field-type-changed",
  "request-property-type-changed": "field-type-changed",
  "request-body-type-changed": "field-type-changed",
  "response-property-type-changed": "field-type-changed",
  "response-body-type-changed": "field-type-changed",
  "response-header-type-changed": "field-type-changed",

  // --- enum-value-removed ---------------------------------------------------
  "request-parameter-enum-value-removed": "enum-value-removed",
  "request-parameter-property-enum-value-removed": "enum-value-removed",
  "request-property-enum-value-removed": "enum-value-removed",
  "request-body-enum-value-removed": "enum-value-removed",
  "request-parameter-x-extensible-enum-value-removed": "enum-value-removed",
  "request-property-x-extensible-enum-value-removed": "enum-value-removed",

  // --- auth-requirement-changed --------------------------------------------
  "api-security-removed": "auth-requirement-changed",
  "api-global-security-removed": "auth-requirement-changed",
  "api-security-scope-added": "auth-requirement-changed",
  "api-global-security-scope-added": "auth-requirement-changed",
});

/**
 * Translate an oasdiff check ID, or undefined when we have no rule for it.
 *
 * The own-property guard is not decorative: check IDs arrive from parsed JSON,
 * and a plain object literal inherits from Object.prototype, so a bare lookup of
 * "constructor" (or "toString") returns a truthy function that would then be
 * emitted as if it were a rule.
 */
export function mapOasdiffCheckId(id: string): BreakingRule | undefined {
  return Object.prototype.hasOwnProperty.call(OASDIFF_RULE_MAP, id)
    ? OASDIFF_RULE_MAP[id]
    : undefined;
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                      */
/* -------------------------------------------------------------------------- */

export type OasdiffFailureCode =
  /** The binary could not be spawned — not installed or not on PATH. */
  | "not-installed"
  /** Exceeded the timeout and was killed. */
  | "timeout"
  /** oasdiff could not load or parse one of the specs (its exit code 102). */
  | "spec-load-failed"
  /** Ran, but stdout was not the JSON array we expect. */
  | "invalid-output"
  /** Produced more output than the configured cap. */
  | "output-too-large"
  /** Any other non-zero exit. */
  | "failed";

export class OasdiffError extends Error {
  readonly code: OasdiffFailureCode;
  readonly exitCode: number | null;
  readonly stderr: string;

  constructor(
    code: OasdiffFailureCode,
    message: string,
    details: { exitCode?: number | null; stderr?: string } = {},
  ) {
    super(message);
    this.name = "OasdiffError";
    this.code = code;
    this.exitCode = details.exitCode ?? null;
    this.stderr = details.stderr ?? "";
  }
}

/* -------------------------------------------------------------------------- */
/* Running the binary                                                          */
/* -------------------------------------------------------------------------- */

export interface OasdiffOptions {
  /** Binary to invoke. Defaults to "oasdiff" resolved from PATH. */
  binaryPath?: string;
  /** Hard wall-clock limit. Defaults to 30 seconds. */
  timeoutMs?: number;
  /**
   * Minimum oasdiff level to keep. Defaults to 3 (ERR only) — oasdiff's own
   * judgment of what breaks a client. Lower it to 2 to also surface WARN-level
   * findings such as `request-parameter-removed`, which our rule set classifies
   * as breaking even though oasdiff does not.
   */
  minLevel?: number;
  /** Cap on combined stdout bytes. Defaults to 64 MiB. */
  maxOutputBytes?: number;
  /** Extra flags appended to the oasdiff invocation. */
  extraArgs?: string[];
  /** Cancel the run early. */
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024 * 1024;
const SIGKILL_GRACE_MS = 2_000;

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * Spawn oasdiff and collect its output.
 *
 * Uses spawn without a shell so that spec paths are passed as argv entries and
 * can never be re-interpreted as shell syntax.
 */
function runOasdiff(args: string[], options: OasdiffOptions): Promise<RunResult> {
  const binary = options.binaryPath ?? "oasdiff";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

  return new Promise<RunResult>((resolve, reject) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      reject(
        new OasdiffError(
          "not-installed",
          `Could not start '${binary}': ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      return;
    }

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;
    let killTimer: NodeJS.Timeout | undefined;

    const cleanup = () => {
      clearTimeout(timeoutTimer);
      if (killTimer) clearTimeout(killTimer);
      options.signal?.removeEventListener("abort", onAbort);
    };

    /** Terminate politely, then forcibly if the process ignores SIGTERM. */
    const terminate = () => {
      child.kill("SIGTERM");
      killTimer = setTimeout(() => child.kill("SIGKILL"), SIGKILL_GRACE_MS);
      // Do not hold the event loop open purely to deliver SIGKILL.
      killTimer.unref?.();
    };

    const fail = (error: OasdiffError) => {
      if (settled) return;
      settled = true;
      cleanup();
      terminate();
      reject(error);
    };

    const timeoutTimer = setTimeout(() => {
      fail(
        new OasdiffError(
          "timeout",
          `oasdiff did not finish within ${timeoutMs}ms and was terminated`,
        ),
      );
    }, timeoutMs);

    function onAbort() {
      fail(new OasdiffError("failed", "oasdiff run was aborted by the caller"));
    }
    options.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxOutputBytes) {
        fail(
          new OasdiffError(
            "output-too-large",
            `oasdiff produced more than ${maxOutputBytes} bytes of output`,
          ),
        );
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      // stderr is only ever surfaced in error messages, so keep a bounded tail.
      stderrBytes += chunk.length;
      if (stderrBytes <= 64 * 1024) stderrChunks.push(chunk);
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      fail(
        error.code === "ENOENT"
          ? new OasdiffError(
              "not-installed",
              `oasdiff binary '${binary}' was not found on PATH. Install it from https://github.com/oasdiff/oasdiff or pass options.binaryPath.`,
            )
          : new OasdiffError("failed", `oasdiff failed to run: ${error.message}`),
      );
    });

    child.on("close", (exitCode) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        exitCode,
      });
    });
  });
}

/** oasdiff's exit code when a spec cannot be loaded or parsed. */
const EXIT_SPEC_LOAD_FAILED = 102;

/* -------------------------------------------------------------------------- */
/* Normalization                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Pick the line to report.
 *
 * Prefers the revision (head) position, falling back to the base. Because
 * oasdiff attaches only `baseSource` to removals and only `revisionSource` to
 * additions, this single rule yields exactly the convention spec-diff.ts uses:
 * removals cite the baseline, additions and in-place changes cite the head.
 */
function lineOf(change: OasdiffChange): number {
  const line = change.revisionSource?.line ?? change.baseSource?.line ?? 0;
  return Number.isInteger(line) && line > 0 ? line : 0;
}

/** oasdiff renders identifiers in `backticks`; our own engine uses 'quotes'. */
function normalizeText(text: string): string {
  return text.replace(/`/g, "'");
}

/** Convert one oasdiff finding into our standardized shape. */
export function normalizeOasdiffChange(
  change: OasdiffChange,
  rule: BreakingRule,
): BreakingChange {
  return {
    rule,
    severity: "breaking",
    path: change.path && change.path.length > 0 ? change.path : "*",
    method:
      change.operation && change.operation.length > 0
        ? change.operation.toUpperCase()
        : "*",
    details: normalizeText(change.text),
    line: lineOf(change),
  };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export interface OasdiffResult {
  /** Findings that mapped onto one of our internal rules. */
  changes: BreakingChange[];
  /**
   * Findings oasdiff reported that we have no rule for. Surfaced rather than
   * dropped: we map a few dozen of oasdiff's several hundred checks, and
   * silently discarding the rest would let a caller read "no breaking changes"
   * when oasdiff actually found some.
   */
  unmapped: OasdiffChange[];
}

/**
 * Run oasdiff over two specs and return both the mapped and unmapped findings.
 *
 * `--fail-on` is deliberately not passed: with it, oasdiff exits 1 when it
 * finds breaking changes, which is indistinguishable from a genuine failure.
 * Without it, oasdiff exits 0 on success regardless of what it found, so any
 * non-zero exit here unambiguously means the tool itself failed.
 */
export async function diffWithOasdiffDetailed(
  baselinePath: string,
  headPath: string,
  options: OasdiffOptions = {},
): Promise<OasdiffResult> {
  const args = [
    "breaking",
    baselinePath,
    headPath,
    "-f",
    "json",
    ...(options.extraArgs ?? []),
  ];

  const { stdout, stderr, exitCode } = await runOasdiff(args, options);

  if (exitCode !== 0) {
    const detail = stderr.trim() || stdout.trim() || "(no output)";
    if (exitCode === EXIT_SPEC_LOAD_FAILED) {
      throw new OasdiffError(
        "spec-load-failed",
        `oasdiff could not load one of the specs: ${detail}`,
        { exitCode, stderr },
      );
    }
    throw new OasdiffError(
      "failed",
      `oasdiff exited with code ${exitCode}: ${detail}`,
      { exitCode, stderr },
    );
  }

  const trimmed = stdout.trim();
  // A successful run with no findings prints "[]", but treat empty stdout as
  // "nothing found" rather than a parse error.
  if (trimmed.length === 0) return { changes: [], unmapped: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new OasdiffError(
      "invalid-output",
      `oasdiff produced output that is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { exitCode, stderr },
    );
  }

  if (!Array.isArray(parsed)) {
    throw new OasdiffError(
      "invalid-output",
      `expected oasdiff to emit a JSON array, received ${typeof parsed}`,
      { exitCode, stderr },
    );
  }

  const minLevel = options.minLevel ?? OASDIFF_LEVEL.err;
  const changes: BreakingChange[] = [];
  const unmapped: OasdiffChange[] = [];

  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const change = entry as OasdiffChange;
    if (typeof change.id !== "string" || typeof change.text !== "string") continue;
    if (typeof change.level === "number" && change.level < minLevel) continue;

    const rule = mapOasdiffCheckId(change.id);
    if (rule) changes.push(normalizeOasdiffChange(change, rule));
    else unmapped.push(change);
  }

  return { changes, unmapped };
}

/**
 * Run oasdiff over two specs and return the standardized breaking changes.
 *
 * Findings with no corresponding internal rule are discarded; use
 * `diffWithOasdiffDetailed` when you need to see those too.
 */
export async function diffWithOasdiff(
  baselinePath: string,
  headPath: string,
  options: OasdiffOptions = {},
): Promise<BreakingChange[]> {
  const { changes } = await diffWithOasdiffDetailed(baselinePath, headPath, options);
  return changes;
}

/** Whether the oasdiff binary can be executed. Never throws. */
export async function isOasdiffAvailable(options: OasdiffOptions = {}): Promise<boolean> {
  try {
    const { exitCode } = await runOasdiff(["--version"], {
      ...options,
      timeoutMs: options.timeoutMs ?? 5_000,
    });
    return exitCode === 0;
  } catch {
    return false;
  }
}
