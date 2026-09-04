/**
 * Tests for the standalone OpenAPI breaking-change diff engine.
 *
 * Run with: npx tsx tests/spec-diff.test.ts
 *
 * Follows the flat assert() convention of tests/run-tests.ts (no test framework).
 */

import { diffSpecs, parseSpecWithLines, type BreakingChange } from "../src/lib/engine/spec-diff";

let passed = 0;
let total = 0;

function assert(condition: boolean, name: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ❌ FAIL: ${name}`);
  }
}

/**
 * Expected line number for a fixture, resolved from the fixture text itself.
 * Hand-counted line numbers rot the moment a fixture gains a line; this cannot.
 */
function lineOf(source: string, needle: string): number {
  const index = source.split("\n").findIndex((line) => line.includes(needle));
  if (index === -1) throw new Error(`fixture marker not found: ${needle}`);
  return index + 1;
}

function find(changes: BreakingChange[], rule: string, path?: string) {
  return changes.filter((c) => c.rule === rule && (path === undefined || c.path === path));
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const BASELINE = `openapi: 3.0.0
info:
  title: Demo API
  version: 1.0.0
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        phone_number:
          type: string
        role:
          type: string
          enum: [admin, editor, viewer]
paths:
  /api/v1/users:
    parameters:
      - name: trace_id
        in: header
        required: false
        schema:
          type: string
    get:
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name:
                  type: string
                nickname:
                  type: string
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /api/v1/legacy:
    get:
      responses:
        '200':
          description: ok
`;

/** Replace a block of the baseline to build a head spec, keeping YAML valid. */
function mutate(source: string, from: string, to: string): string {
  if (!source.includes(from)) throw new Error(`mutation source not found: ${from}`);
  return source.replace(from, to);
}

/* -------------------------------------------------------------------------- */
/* Test 1 — endpoint removed                                                   */
/* -------------------------------------------------------------------------- */

console.log("\nTest 1: Remove an endpoint → endpoint-removed");
{
  const head = BASELINE.replace(
    `  /api/v1/legacy:
    get:
      responses:
        '200':
          description: ok
`,
    "",
  );
  const changes = diffSpecs(BASELINE, head);
  const hits = find(changes, "endpoint-removed");

  assert(hits.length === 1, "exactly one endpoint-removed is reported");
  assert(hits[0]?.path === "/api/v1/legacy", "path is the removed endpoint");
  assert(hits[0]?.method === "GET", "method is the removed operation, upper-cased");
  assert(hits[0]?.severity === "breaking", "severity is 'breaking'");
  assert(
    hits[0]?.details === "Endpoint 'GET /api/v1/legacy' was removed",
    "details names the removed endpoint",
  );
  assert(
    hits[0]?.line === lineOf(BASELINE, "  /api/v1/legacy:") + 1,
    `line points at the removed operation in the baseline (got ${hits[0]?.line})`,
  );
  assert(
    find(changes, "method-removed").length === 0,
    "a whole-path deletion is not also reported as method-removed",
  );
}

/* -------------------------------------------------------------------------- */
/* Test 2 — required parameter added                                           */
/* -------------------------------------------------------------------------- */

console.log("\nTest 2: Add required param → required-param-added");
{
  const head = mutate(
    BASELINE,
    `      parameters:
        - name: limit`,
    `      parameters:
        - name: tenant_id
          in: query
          required: true
          schema:
            type: string
        - name: limit`,
  );
  const changes = diffSpecs(BASELINE, head);
  const hits = find(changes, "required-param-added");

  assert(hits.length === 1, "exactly one required-param-added is reported");
  assert(hits[0]?.path === "/api/v1/users", "path is the affected endpoint");
  assert(hits[0]?.method === "GET", "method is the affected operation");
  assert(
    hits[0]?.details === "New required query parameter 'tenant_id' was added",
    "details names the parameter and its location",
  );
  assert(
    hits[0]?.line === lineOf(head, "- name: tenant_id"),
    `line points at the new parameter in the head spec (got ${hits[0]?.line})`,
  );

  // An optional addition must not be flagged — only required ones break callers.
  const optionalHead = mutate(
    BASELINE,
    `      parameters:
        - name: limit`,
    `      parameters:
        - name: cursor
          in: query
          required: false
          schema:
            type: string
        - name: limit`,
  );
  assert(
    find(diffSpecs(BASELINE, optionalHead), "required-param-added").length === 0,
    "adding an OPTIONAL parameter is not breaking",
  );
}

/* -------------------------------------------------------------------------- */
/* Test 3 — field type changed                                                 */
/* -------------------------------------------------------------------------- */

console.log("\nTest 3: Change field type → field-type-changed");
{
  const head = mutate(
    BASELINE,
    `        id:
          type: integer`,
    `        id:
          type: string`,
  );
  const changes = diffSpecs(BASELINE, head);
  const hits = find(changes, "field-type-changed");

  assert(hits.length > 0, "field-type-changed is reported");
  assert(
    hits.every((c) => c.details.includes("'id'")),
    "details names the field whose type changed",
  );
  assert(
    hits.some((c) => c.details.includes("from 'integer' to 'string'")),
    "details names both the old and the new type",
  );
  assert(
    hits.every((c) => c.severity === "breaking"),
    "severity is 'breaking'",
  );
  // The engine reports the line that *declares the field*, not the nested
  // `type:` line — consistent with response-field-removed pointing at
  // `phone_number:`. That is the line a reviewer wants to jump to.
  assert(
    hits.every((c) => c.line === lineOf(head, "        id:")),
    `line points at the changed field's declaration in the head spec (got ${hits[0]?.line})`,
  );
}

/* -------------------------------------------------------------------------- */
/* Coverage for the remaining six rules                                        */
/* -------------------------------------------------------------------------- */

console.log("\nTest 4: method-removed (path survives, method does not)");
{
  const head = BASELINE.replace(
    `    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name:
                  type: string
                nickname:
                  type: string
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
`,
    "",
  );
  const changes = diffSpecs(BASELINE, head);
  const hits = find(changes, "method-removed");
  assert(hits.length === 1, "one method-removed is reported");
  assert(hits[0]?.method === "POST", "the removed method is named");
  assert(hits[0]?.path === "/api/v1/users", "the surviving path is named");
  assert(
    find(changes, "endpoint-removed").length === 0,
    "removing one method is not reported as endpoint-removed",
  );
}

console.log("\nTest 5: param-removed");
{
  const head = BASELINE.replace(
    `        - name: limit
          in: query
          required: false
          schema:
            type: integer
`,
    "",
  );
  const hits = find(diffSpecs(BASELINE, head), "param-removed");
  assert(hits.length === 1, "one param-removed is reported");
  assert(
    hits[0]?.details === "query parameter 'limit' was removed",
    "details names the parameter and its location",
  );
  assert(
    hits[0]?.line === lineOf(BASELINE, "- name: limit"),
    `line points at the parameter in the baseline (got ${hits[0]?.line})`,
  );
}

console.log("\nTest 6: response-field-removed (through a $ref)");
{
  const head = BASELINE.replace(
    `        phone_number:
          type: string
`,
    "",
  );
  const changes = diffSpecs(BASELINE, head);
  const hits = find(changes, "response-field-removed");
  assert(hits.length > 0, "response-field-removed is reported through a $ref'd schema");
  assert(
    hits.some((c) => c.details === "Response field 'phone_number' was removed"),
    "details matches the documented output schema wording",
  );
  assert(
    hits.every((c) => c.line === lineOf(BASELINE, "        phone_number:")),
    `line points at the removed field in the baseline (got ${hits[0]?.line})`,
  );
}

console.log("\nTest 7: enum-value-removed");
{
  const head = mutate(
    BASELINE,
    "          enum: [admin, editor, viewer]",
    "          enum: [admin, viewer]",
  );
  const hits = find(diffSpecs(BASELINE, head), "enum-value-removed");
  assert(hits.length > 0, "enum-value-removed is reported");
  assert(
    hits.some((c) => c.details.includes("'editor'")),
    "details names the dropped value",
  );
  assert(
    hits.every((c) => !c.details.includes("'admin'")),
    "retained values are not reported as dropped",
  );
}

console.log("\nTest 8: request-field-made-required");
{
  const head = mutate(BASELINE, "              required: [name]", "              required: [name, nickname]");
  const hits = find(diffSpecs(BASELINE, head), "request-field-made-required");
  assert(hits.length === 1, "one request-field-made-required is reported");
  assert(
    hits[0]?.details === "Request body field 'nickname' is now required",
    "details names the newly required field",
  );
  assert(hits[0]?.method === "POST", "the request-side operation is named");
}

console.log("\nTest 9: auth-requirement-changed");
{
  const head = mutate(BASELINE, "      scheme: bearer", "      scheme: basic");
  const hits = find(diffSpecs(BASELINE, head), "auth-requirement-changed");
  assert(hits.length > 0, "auth-requirement-changed is reported");
  assert(hits[0]?.severity === "breaking", "severity is 'breaking'");
}

/* -------------------------------------------------------------------------- */
/* Invariants                                                                  */
/* -------------------------------------------------------------------------- */

console.log("\nTest 10: no false positives on an unchanged spec");
{
  const changes = diffSpecs(BASELINE, BASELINE);
  assert(changes.length === 0, `identical specs produce zero changes (got ${changes.length})`);
}

console.log("\nTest 11: purely additive changes are not breaking");
{
  const head = mutate(
    BASELINE,
    `        phone_number:
          type: string`,
    `        phone_number:
          type: string
        email:
          type: string`,
  );
  assert(diffSpecs(BASELINE, head).length === 0, "adding an optional response field is not breaking");
}

console.log("\nTest 12: JSON specs parse through the same loader");
{
  const baselineJson = JSON.stringify(
    {
      openapi: "3.0.0",
      paths: {
        "/api/v1/users": {
          get: {
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: { type: "object", properties: { id: { type: "integer" } } },
                  },
                },
              },
            },
          },
        },
      },
    },
    null,
    2,
  );
  const headJson = baselineJson.replace(`"type": "integer"`, `"type": "string"`);
  const hits = find(diffSpecs(baselineJson, headJson), "field-type-changed");
  assert(hits.length === 1, "JSON input is diffed identically to YAML");
  assert(
    hits[0]?.details.includes("from 'integer' to 'string'"),
    "JSON type change is described correctly",
  );
  assert((hits[0]?.line ?? 0) > 0, `JSON input still yields a real line number (got ${hits[0]?.line})`);
}

console.log("\nTest 13: output conforms to the documented schema");
{
  const head = BASELINE.replace(
    `  /api/v1/legacy:
    get:
      responses:
        '200':
          description: ok
`,
    "",
  );
  const changes = diffSpecs(BASELINE, head);
  assert(changes.length > 0, "at least one change to inspect");
  assert(
    changes.every(
      (c) =>
        typeof c.rule === "string" &&
        c.severity === "breaking" &&
        typeof c.path === "string" &&
        typeof c.method === "string" &&
        typeof c.details === "string" &&
        Number.isInteger(c.line),
    ),
    "every change has rule/severity/path/method/details/line with the right types",
  );
  assert(
    changes.every((c) => Object.keys(c).sort().join(",") === "details,line,method,path,rule,severity"),
    "no extra or missing keys on the emitted objects",
  );
}

console.log("\nTest 14: recursive $ref schemas terminate");
{
  const recursive = `openapi: 3.0.0
components:
  schemas:
    Node:
      type: object
      properties:
        label:
          type: string
        children:
          type: array
          items:
            $ref: '#/components/schemas/Node'
paths:
  /tree:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Node'
`;
  const head = recursive.replace(
    `        label:
          type: string
`,
    "",
  );
  // The assertion that matters is that this returns at all rather than hanging.
  const hits = find(diffSpecs(recursive, head), "response-field-removed");
  assert(hits.length > 0, "a self-referential schema is diffed without infinite recursion");
}

console.log("\nTest 15: parseSpecWithLines exposes usable line metadata");
{
  const { doc, lineOf: lookup } = parseSpecWithLines(BASELINE);
  const paths = (doc as Record<string, Record<string, unknown>>).paths;
  assert(
    lookup(paths["/api/v1/users"]) === lineOf(BASELINE, "  /api/v1/users:"),
    "a path item resolves to its declaring line",
  );
  assert(lookup("a scalar", undefined, null) === 0, "unknown nodes fall back to 0 rather than throwing");
}

/* -------------------------------------------------------------------------- */

console.log("\n" + "=".repeat(50));
console.log(`SPEC-DIFF TESTS: ${passed} / ${total} PASSED`);
console.log("=".repeat(50));
if (passed !== total) process.exit(1);
