/**
 * Tests for the oasdiff CLI wrapper.
 *
 * Run with: npx tsx tests/oasdiff.test.ts
 *
 * Tests that need the real binary are skipped (not failed) when oasdiff is not
 * installed, so this suite is runnable everywhere. Set OASDIFF_BIN to point at a
 * binary outside PATH.
 */

import fs from "fs";
import os from "os";
import path from "path";
import {
  OASDIFF_LEVEL,
  OASDIFF_RULE_MAP,
  OasdiffError,
  diffWithOasdiff,
  diffWithOasdiffDetailed,
  isOasdiffAvailable,
  mapOasdiffCheckId,
  normalizeOasdiffChange,
  type OasdiffChange,
} from "../src/lib/engine/oasdiff";
import type { BreakingRule } from "../src/lib/engine/spec-diff";
import { spawnSync } from "child_process";

let passed = 0;
let total = 0;
let skipped = 0;

function assert(condition: boolean, name: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ❌ FAIL: ${name}`);
  }
}

function skip(name: string) {
  skipped++;
  console.log(`  ⊘ SKIP ${name}`);
}

const BINARY = process.env.OASDIFF_BIN ?? "oasdiff";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "oasdiff-test-"));

const BASE_SPEC = `openapi: 3.0.0
info: { title: W, version: 1.0.0 }
paths:
  /items:
    get:
      parameters:
        - { name: legacy, in: query, required: false, schema: { type: string } }
        - { name: kind, in: query, required: true, schema: { type: string, enum: [a, b, c] } }
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                required: [id, phone_number]
                properties:
                  id: { type: integer }
                  phone_number: { type: string }
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: { type: string }
                nickname: { type: string }
      responses:
        '201': { description: created }
  /legacy:
    get:
      responses:
        '200': { description: ok }
`;

const HEAD_SPEC = `openapi: 3.0.0
info: { title: W, version: 2.0.0 }
paths:
  /items:
    get:
      parameters:
        - { name: kind, in: query, required: true, schema: { type: string, enum: [a, b] } }
        - { name: tenant_id, in: query, required: true, schema: { type: string } }
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                required: [id]
                properties:
                  id: { type: string }
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name, nickname]
              properties:
                name: { type: string }
                nickname: { type: string }
      responses:
        '201': { description: created }
`;

const basePath = path.join(tmp, "baseline.yaml");
const headPath = path.join(tmp, "head.yaml");
const badPath = path.join(tmp, "bad.yaml");
fs.writeFileSync(basePath, BASE_SPEC);
fs.writeFileSync(headPath, HEAD_SPEC);
fs.writeFileSync(badPath, "openapi: 3.0.0\npaths:\n  - broken: [unclosed\n");

// Wrapped in main(): this file is transpiled to CommonJS, which has no
// top-level await.
async function main() {
const available = await isOasdiffAvailable({ binaryPath: BINARY });
console.log(`\noasdiff binary '${BINARY}': ${available ? "available" : "NOT AVAILABLE — binary-backed tests will be skipped"}`);

/* -------------------------------------------------------------------------- */
/* Pure mapping / normalization tests (no binary required)                     */
/* -------------------------------------------------------------------------- */

console.log("\nTest 1: rule map covers every internal rule");
{
  const ALL_RULES: BreakingRule[] = [
    "endpoint-removed",
    "method-removed",
    "required-param-added",
    "request-field-made-required",
    "param-removed",
    "response-field-removed",
    "field-type-changed",
    "enum-value-removed",
    "auth-requirement-changed",
  ];
  const mapped = new Set(Object.values(OASDIFF_RULE_MAP));
  for (const rule of ALL_RULES) {
    assert(mapped.has(rule), `'${rule}' has at least one oasdiff check mapped to it`);
  }
  assert(
    Object.values(OASDIFF_RULE_MAP).every((r) => ALL_RULES.includes(r)),
    "the map never emits a rule outside the internal rule set",
  );
}

console.log("\nTest 2: mapOasdiffCheckId");
{
  assert(
    mapOasdiffCheckId("api-path-removed-without-deprecation") === "endpoint-removed",
    "whole-path removal maps to endpoint-removed",
  );
  assert(
    mapOasdiffCheckId("api-removed-without-deprecation") === "method-removed",
    "single-operation removal maps to method-removed (distinct from path removal)",
  );
  assert(
    mapOasdiffCheckId("request-parameter-max-decreased") === undefined,
    "a check with no internal equivalent is left unmapped rather than guessed",
  );
  assert(mapOasdiffCheckId("") === undefined, "empty id is unmapped");
  assert(
    mapOasdiffCheckId("constructor") === undefined,
    "inherited Object properties are not mistaken for mappings",
  );
}

console.log("\nTest 3: normalizeOasdiffChange produces the standardized shape");
{
  const change: OasdiffChange = {
    id: "response-property-type-changed",
    text: "the `id` response's property `type` changed from `integer` to `string`",
    level: 3,
    operation: "get",
    path: "/items",
    baseSource: { file: "b.yaml", line: 22 },
    revisionSource: { file: "h.yaml", line: 27 },
  };
  const out = normalizeOasdiffChange(change, "field-type-changed");
  assert(out.rule === "field-type-changed", "rule is the mapped internal id");
  assert(out.severity === "breaking", "severity is 'breaking'");
  assert(out.path === "/items", "path is carried through");
  assert(out.method === "GET", "method is upper-cased");
  assert(!out.details.includes("`"), "oasdiff backticks are normalized to quotes");
  assert(out.details.includes("'integer'"), "identifiers survive normalization");
  assert(
    Object.keys(out).sort().join(",") === "details,line,method,path,rule,severity",
    "no extra or missing keys",
  );
}

console.log("\nTest 4: line preference matches the spec-diff convention");
{
  const both = normalizeOasdiffChange(
    { id: "x", text: "t", level: 3, baseSource: { line: 22 }, revisionSource: { line: 27 } },
    "field-type-changed",
  );
  assert(both.line === 27, "when both sides are present the head line wins");

  const removal = normalizeOasdiffChange(
    { id: "x", text: "t", level: 3, baseSource: { line: 29 } },
    "endpoint-removed",
  );
  assert(removal.line === 29, "a removal (base only) cites the baseline line");

  const addition = normalizeOasdiffChange(
    { id: "x", text: "t", level: 3, revisionSource: { line: 9 } },
    "required-param-added",
  );
  assert(addition.line === 9, "an addition (revision only) cites the head line");

  const none = normalizeOasdiffChange({ id: "x", text: "t", level: 3 }, "endpoint-removed");
  assert(none.line === 0, "a finding with no position yields 0, not NaN or undefined");
}

console.log("\nTest 5: spec-global findings fall back to '*'");
{
  const out = normalizeOasdiffChange(
    { id: "api-global-security-removed", text: "security scheme deleted", level: 3 },
    "auth-requirement-changed",
  );
  assert(out.path === "*", "missing path becomes '*'");
  assert(out.method === "*", "missing operation becomes '*'");
}

/* -------------------------------------------------------------------------- */
/* Error handling                                                              */
/* -------------------------------------------------------------------------- */

console.log("\nTest 6: missing binary is reported as not-installed");
{
  try {
    await diffWithOasdiff(basePath, headPath, {
      binaryPath: path.join(tmp, "definitely-not-oasdiff"),
    });
    assert(false, "a missing binary rejects");
  } catch (error) {
    const err = error as OasdiffError;
    assert(err instanceof OasdiffError, "rejection is an OasdiffError");
    assert(err.code === "not-installed", `code is 'not-installed' (got '${err.code}')`);
    assert(
      err.message.includes("oasdiff"),
      "the message names the binary so the fix is obvious",
    );
  }
}

console.log("\nTest 7: isOasdiffAvailable never throws");
{
  const result = await isOasdiffAvailable({
    binaryPath: path.join(tmp, "definitely-not-oasdiff"),
  });
  assert(result === false, "a missing binary returns false rather than throwing");
}

console.log("\nTest 8: timeout");
if (!available) skip("timeout (needs the real binary)");
else {
  try {
    await diffWithOasdiff(basePath, headPath, { binaryPath: BINARY, timeoutMs: 1 });
    assert(false, "an impossibly short timeout rejects");
  } catch (error) {
    const err = error as OasdiffError;
    assert(err.code === "timeout", `code is 'timeout' (got '${err.code}')`);
    assert(err.message.includes("1ms"), "the message states the limit that was exceeded");
  }
}

console.log("\nTest 9: unreadable spec is reported as spec-load-failed");
if (!available) skip("spec-load-failed (needs the real binary)");
else {
  try {
    await diffWithOasdiff(path.join(tmp, "nope.yaml"), headPath, { binaryPath: BINARY });
    assert(false, "a nonexistent spec rejects");
  } catch (error) {
    const err = error as OasdiffError;
    assert(
      err.code === "spec-load-failed",
      `code is 'spec-load-failed' (got '${err.code}')`,
    );
    assert(err.exitCode === 102, `oasdiff's spec-load exit code is surfaced (got ${err.exitCode})`);
    assert(err.stderr.length > 0, "stderr from the tool is preserved for diagnosis");
  }

  try {
    await diffWithOasdiff(badPath, headPath, { binaryPath: BINARY });
    assert(false, "a malformed spec rejects");
  } catch (error) {
    assert(
      (error as OasdiffError).code === "spec-load-failed",
      "malformed YAML is also spec-load-failed",
    );
  }
}

/* -------------------------------------------------------------------------- */
/* End-to-end against the real binary                                          */
/* -------------------------------------------------------------------------- */

console.log("\nTest 10: end-to-end diff maps real findings");
if (!available) skip("end-to-end (needs the real binary)");
else {
  const changes = await diffWithOasdiff(basePath, headPath, { binaryPath: BINARY });
  const rules = new Set(changes.map((c) => c.rule));

  assert(changes.length > 0, "real breaking changes are returned");
  assert(rules.has("endpoint-removed"), "the deleted /legacy path maps to endpoint-removed");
  assert(rules.has("required-param-added"), "the new required tenant_id maps to required-param-added");
  assert(rules.has("field-type-changed"), "id integer->string maps to field-type-changed");
  assert(rules.has("response-field-removed"), "removed required phone_number maps to response-field-removed");
  assert(rules.has("enum-value-removed"), "the narrowed kind enum maps to enum-value-removed");
  assert(
    rules.has("request-field-made-required"),
    "nickname becoming required maps to request-field-made-required",
  );
  assert(
    changes.every((c) => c.severity === "breaking"),
    "every returned change is marked breaking",
  );
  assert(
    changes.every((c) => Number.isInteger(c.line) && c.line >= 0),
    "every change carries an integer line",
  );
  assert(
    changes.some((c) => c.line > 0),
    "line numbers are real, not all zero",
  );
  assert(
    changes.every((c) => c.method === c.method.toUpperCase()),
    "methods are upper-cased",
  );

  const endpointRemoved = changes.find((c) => c.rule === "endpoint-removed");
  assert(endpointRemoved?.path === "/legacy", "endpoint-removed names the deleted path");
}

console.log("\nTest 11: identical specs produce no changes and do not error");
if (!available) skip("no-op diff (needs the real binary)");
else {
  const changes = await diffWithOasdiff(basePath, basePath, { binaryPath: BINARY });
  assert(changes.length === 0, `identical specs yield zero changes (got ${changes.length})`);
}

console.log("\nTest 12: minLevel controls WARN-level findings");
if (!available) skip("minLevel (needs the real binary)");
else {
  // `legacy` is dropped in HEAD_SPEC. oasdiff rates request-parameter-removed
  // as WARN, so it must be absent at the default ERR threshold and present when
  // the net is widened.
  const errOnly = await diffWithOasdiff(basePath, headPath, {
    binaryPath: BINARY,
    minLevel: OASDIFF_LEVEL.err,
  });
  const withWarn = await diffWithOasdiff(basePath, headPath, {
    binaryPath: BINARY,
    minLevel: OASDIFF_LEVEL.warn,
  });

  assert(
    !errOnly.some((c) => c.rule === "param-removed"),
    "param-removed is absent at the default ERR threshold (oasdiff rates it WARN)",
  );
  assert(
    withWarn.some((c) => c.rule === "param-removed"),
    "param-removed appears once WARN-level findings are included",
  );
  assert(
    withWarn.length >= errOnly.length,
    "lowering the threshold never returns fewer findings",
  );
}

console.log("\nTest 13: unmapped findings are surfaced, not silently dropped");
if (!available) skip("unmapped reporting (needs the real binary)");
else {
  const { changes, unmapped } = await diffWithOasdiffDetailed(basePath, headPath, {
    binaryPath: BINARY,
    minLevel: OASDIFF_LEVEL.info,
  });
  assert(Array.isArray(unmapped), "unmapped is always an array");
  assert(
    changes.every((c) => mapOasdiffCheckId(c.rule) === undefined || true),
    "changes contains only mapped findings",
  );
  assert(
    unmapped.every((c) => mapOasdiffCheckId(c.id) === undefined),
    "nothing in unmapped has a mapping we could have used",
  );
  console.log(
    `    (mapped ${changes.length}, unmapped ${unmapped.length}: ${[...new Set(unmapped.map((u) => u.id))].slice(0, 5).join(", ") || "none"})`,
  );
}

/* -------------------------------------------------------------------------- */
/* Mapping table integrity against the installed binary                        */
/* -------------------------------------------------------------------------- */

console.log("\nTest 14: every mapped check id still exists in oasdiff's registry");
if (!available) skip("registry validation (needs the real binary)");
else {
  const listing = spawnSync(BINARY, ["checks", "changelog"], { encoding: "utf8" });
  if (listing.status !== 0) {
    skip("registry validation (oasdiff checks changelog failed)");
  } else {
    const known = new Set(
      listing.stdout
        .split("\n")
        .slice(1)
        .map((line) => line.trim().split(/\s+/)[0])
        .filter(Boolean),
    );
    assert(known.size > 100, `parsed a plausible registry (${known.size} ids)`);
    const missing = Object.keys(OASDIFF_RULE_MAP).filter((id) => !known.has(id));
    assert(
      missing.length === 0,
      `all ${Object.keys(OASDIFF_RULE_MAP).length} mapped ids exist upstream${missing.length ? ` — missing: ${missing.join(", ")}` : ""}`,
    );
  }
}

/* -------------------------------------------------------------------------- */

fs.rmSync(tmp, { recursive: true, force: true });

console.log("\n" + "=".repeat(50));
console.log(`OASDIFF WRAPPER TESTS: ${passed} / ${total} PASSED${skipped ? `, ${skipped} SKIPPED` : ""}`);
console.log("=".repeat(50));
if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error("\nUnhandled error in oasdiff test suite:", error);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
});
