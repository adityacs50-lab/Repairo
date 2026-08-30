import fs from "fs";
import path from "path";
import {
  applyAstTransforms,
  diffOpenApi,
  findImpactedCode,
  parseOpenApi,
  resolveAmbiguousEnums,
  runRepair,
  scanCodebase,
  scanDirectory,
  validateCodebase,
  validateProposal,
  type ApiChange,
} from "../src/lib/engine";
import { handleDiffCommand } from "../src/cli/commands/diff";
import { handleInitCommand } from "../src/cli/commands/init";
import { handleRepairCommand } from "../src/cli/commands/repair";
import { handleScanCommand } from "../src/cli/commands/scan";

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
  }
}

async function main() {
console.log("\n==================================================");
console.log("REPAIRO REAL INTEGRATION TEST SUITE");
console.log("==================================================\n");

// Test 1: OpenAPI parser test
console.log("Test 1: OpenAPI parser test");
const rawYaml = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /v1/test:
    get:
      summary: Test endpoint
`;
const parsedDoc = parseOpenApi(rawYaml);
assert(parsedDoc.info?.title === "Test API", "Parses YAML OpenAPI specification into structured object");

// Test 2: OpenAPI diff test
console.log("\nTest 2: OpenAPI diff test");
const beforeSpec = parseOpenApi(`
openapi: 3.0.0
info:
  title: API
paths:
  /v1/charge:
    post:
      parameters:
        - name: amount
          in: query
`);
const afterSpec = parseOpenApi(`
openapi: 3.0.0
info:
  title: API
paths:
  /v1/charge:
    post:
      parameters:
        - name: total_amount
          in: query
`);
const diffChanges = diffOpenApi(beforeSpec, afterSpec);
assert(diffChanges.some((c) => c.kind === "field-removed" && c.field === "amount"), "Detects removed parameter 'amount'");
assert(diffChanges.some((c) => c.kind === "field-added" && c.field === "total_amount"), "Detects added parameter 'total_amount'");

// Test 3: Breaking parameter detection test
console.log("\nTest 3: Breaking parameter detection test");
const breakingChanges = diffChanges.filter((c) => c.severity === "breaking");
assert(breakingChanges.length > 0, "Categorizes removed parameter as breaking change severity");

// Test 4: AST impact analysis test
console.log("\nTest 4: AST impact analysis test");
const sampleCode = `
const client = new APIClient();
client.createCharge({ amount: 100 });
`;
const impacts = findImpactedCode(diffChanges, [{ path: "src/payment.ts", content: sampleCode }]);
assert(impacts.length > 0 && impacts[0].file === "src/payment.ts", "Locates exact file and line of removed parameter symbol");

// Test 5: AST transformation test
console.log("\nTest 5: AST transformation test");
const openaiBeforeCode = `
const response = await openai.chat.completions.create({
  model: "gpt-4",
  max_tokens: 500
});
`;
const openaiChanges = [
  {
    id: "chg_001",
    kind: "field-removed" as const,
    severity: "breaking" as const,
    path: "/v1/chat/completions",
    operation: "post",
    field: "max_tokens",
    summary: "Parameter max_tokens removed",
    before: "max_tokens",
    after: "max_output_tokens",
  },
];
const transformResult = applyAstTransforms(openaiBeforeCode, openaiChanges, "src/ai.ts");
assert(transformResult.content.includes("max_output_tokens: 500"), "Transforms max_tokens -> max_output_tokens deterministically via AST");
assert(!transformResult.content.includes("max_tokens: 500"), "Removes deprecated max_tokens property");

// Test 6: TypeScript validation test
console.log("\nTest 6: TypeScript validation test");
const validation = validateCodebase("./fixtures/breaking-api-demo");
assert(typeof validation.passed === "boolean", "Executes real TypeScript validation and returns status");

// Test 7: CLI scan test
console.log("\nTest 7: CLI scan test");
const scanResult = scanDirectory(path.resolve("./fixtures/breaking-api-demo"));
assert(scanResult.filesScanned > 0, "Scans fixture repository files accurately");
assert(scanResult.totalCallSites > 0, "Identifies real API call sites in fixture code");

// Test 8: CLI diff test
console.log("\nTest 8: CLI diff test");
const demoOldSpec = fs.readFileSync(path.resolve("./fixtures/breaking-api-demo/specs/old-openapi.json"), "utf-8");
const demoNewSpec = fs.readFileSync(path.resolve("./fixtures/breaking-api-demo/specs/new-openapi.json"), "utf-8");
const demoDiff = diffOpenApi(parseOpenApi(demoOldSpec), parseOpenApi(demoNewSpec));
assert(demoDiff.length > 0, "Computes structural spec diff between old and new demo specs");

// Test 9: CLI repair test
console.log("\nTest 9: CLI repair test");
const demoClientPath = path.resolve("./fixtures/breaking-api-demo/src/ai/client.ts");
const demoClientBefore = fs.readFileSync(demoClientPath, "utf-8");
const repairTransform = applyAstTransforms(demoClientBefore, demoDiff, demoClientPath);
assert(repairTransform.content.includes("max_output_tokens"), "Generates valid AST repair for breaking API parameter change");

// Test 10: Interface vs Call Site AST Scope Regression Test
console.log("\nTest 10: Interface vs Call Site AST Scope Regression Test");
const codeWithInterfaceAndCall = `
export interface ChatCompletionsInput {
  max_tokens?: number;
}
const response = await openai.chat.completions.create({
  max_tokens: 500
});
`;
const scopeTestResult = applyAstTransforms(codeWithInterfaceAndCall, openaiChanges, "src/ai.ts");
assert(scopeTestResult.content.includes("max_tokens?: number;"), "Interface declaration max_tokens?: number; remains 100% UNCHANGED");
assert(scopeTestResult.content.includes("max_output_tokens: 500"), "Call site max_tokens: 500 is renamed to max_output_tokens: 500");
assert(!scopeTestResult.content.includes("max_tokens: 500"), "Old max_tokens: 500 property is removed from call site");

// Test 11: Cross-domain generality regression test — a second, independently-designed
// fixture (a Shipping API) with no naming overlap with the payments fixture at all, to
// prove the engine repairs codebases generically rather than being tuned to one demo.
console.log("\nTest 11: Cross-domain generality regression test (Shipping API fixture)");
const shippingBeforeSpec = fs.readFileSync(path.resolve("./fixtures/apis/shipping-v1.openapi.yaml"), "utf-8");
const shippingAfterSpec = fs.readFileSync(path.resolve("./fixtures/apis/shipping-v2.openapi.yaml"), "utf-8");
const shippingConsumerPaths = [
  "fixtures/consumers/logistics-service/src/shipments-client.ts",
  "fixtures/consumers/logistics-service/src/order-flow.ts",
];
const shippingConsumerFiles = shippingConsumerPaths.map((p) => ({
  path: p,
  content: fs.readFileSync(path.resolve(p), "utf-8"),
}));
const shippingResult = await runRepair({
  beforeSpec: shippingBeforeSpec,
  afterSpec: shippingAfterSpec,
  consumerFiles: shippingConsumerFiles,
});
const shippingClientFile = shippingResult.pullRequest.files.find((f) => f.path.endsWith("shipments-client.ts"));
const shippingFlowFile = shippingResult.pullRequest.files.find((f) => f.path.endsWith("order-flow.ts"));

assert(
  shippingClientFile?.content.includes("https://api.acme-shipping.com/v2") ?? false,
  "Base URL updated to v2 in an unrelated (Shipping) API's consumer code",
);
assert(
  shippingClientFile?.content.includes("recipientEmail: string;") ?? false,
  "New required field added to the request interface (side-correct, request)",
);
assert(
  shippingClientFile?.content.includes("estimatedDelivery: string;") ?? false,
  "New required field added to the response interface, not the request interface",
);
assert(
  !(shippingClientFile?.content.includes("CreateShipmentRequest") &&
    /CreateShipmentRequest\s*\{[^}]*estimatedDelivery/.test(shippingClientFile.content)),
  "Response-only field is never inserted into the request interface",
);
assert(
  shippingClientFile?.content.includes('"ups" | "fedex" | "dhl" | "usps"') ?? false,
  "Purely-additive enum member appended without disturbing an unrelated rename",
);
assert(
  (shippingClientFile?.content.match(/"pending" \| "in_transit" \| "delivered"/) ?? null) !== null,
  "Unambiguous 1:1 enum rename applied to the status union type",
);
assert(
  shippingClientFile?.content.includes('record.status === "pending"') ?? false,
  "Enum rename also applied to the matching comparison, not just the type declaration",
);
assert(
  shippingFlowFile?.content.includes("recipientEmail:") ?? false,
  "Required field also added at the object-literal call site in a different file",
);
assert(shippingResult.typecheck.passed, "Repaired Shipping API consumer code compiles cleanly");
assert(shippingResult.pullRequest.autoMergeEligible, "Unambiguous cross-domain repair is auto-merge eligible");

// Test 12: Ambiguous-enum baseline regression test — 2 removed / 2 added values for the
// same field, with no agent resolution supplied at all. Locks in today's exact behavior:
// both removed values are flagged for manual review, and the source is left untouched.
console.log("\nTest 12: Ambiguous-enum baseline regression test");
const ambiguousEnumCode = `
export interface Order {
  status: "pending" | "processing" | "shipped";
}
const o: Order = { status: "pending" };
function isProcessing(x: Order) { return x.status === "processing"; }
`;
const ambiguousEnumChanges: ApiChange[] = [
  { id: "amb_rm_1", kind: "enum-value-removed", severity: "breaking", path: "/v1/orders", operation: "post", field: "status", before: "pending", summary: 'Enum value "pending" removed' },
  { id: "amb_rm_2", kind: "enum-value-removed", severity: "breaking", path: "/v1/orders", operation: "post", field: "status", before: "processing", summary: 'Enum value "processing" removed' },
  { id: "amb_add_1", kind: "enum-value-added", severity: "additive", path: "/v1/orders", operation: "post", field: "status", after: "queued", summary: 'Enum value "queued" added' },
  { id: "amb_add_2", kind: "enum-value-added", severity: "additive", path: "/v1/orders", operation: "post", field: "status", after: "in_progress", summary: 'Enum value "in_progress" added' },
];
const baselineResult = applyAstTransforms(ambiguousEnumCode, ambiguousEnumChanges, "src/orders.ts");
const baselineFix1 = baselineResult.fixes.find((f) => f.changeId === "amb_rm_1");
const baselineFix2 = baselineResult.fixes.find((f) => f.changeId === "amb_rm_2");
assert(baselineFix1?.safe === false && baselineFix1.description.includes("ambiguous"), "Ambiguous removed value 'pending' is flagged, not guessed");
assert(baselineFix2?.safe === false && baselineFix2.description.includes("ambiguous"), "Ambiguous removed value 'processing' is flagged, not guessed");
assert(baselineResult.content === ambiguousEnumCode, "Source is left byte-for-byte unchanged when ambiguous and no agent resolution is supplied");

// Test 13: No-key no-op test — resolveAmbiguousEnums must never attempt a network call (and
// must return an empty map) when ANTHROPIC_API_KEY isn't set, even if the caller explicitly
// opted in via `enabled: true`. The resulting repair output must be identical to the baseline.
console.log("\nTest 13: No-key no-op test");
const savedApiKey13 = process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
const noKeyMap = await resolveAmbiguousEnums(ambiguousEnumChanges, { enabled: true });
assert(noKeyMap.size === 0, "resolveAmbiguousEnums returns an empty map with no network attempt when ANTHROPIC_API_KEY is unset");
const noKeyTransform = applyAstTransforms(ambiguousEnumCode, ambiguousEnumChanges, "src/orders.ts", [], noKeyMap);
assert(noKeyTransform.content === baselineResult.content, "Output is identical to the baseline when no key is present (flag-off path is byte-for-byte unchanged)");
if (savedApiKey13 !== undefined) process.env.ANTHROPIC_API_KEY = savedApiKey13;

// Test 14: Agent-proposed pairing flows through the real deterministic AST-rename path —
// this tests the seam (a hand-built resolution map), not the live API integration.
console.log("\nTest 14: Agent-proposed pairing flows through the deterministic path");
const agentMap = new Map([
  ["amb_rm_1", { target: "queued", confidence: 0.87, reasoning: "Historically pending orders map to the new queued state" }],
]);
const agentResult = applyAstTransforms(ambiguousEnumCode, ambiguousEnumChanges, "src/orders.ts", [], agentMap);
assert(agentResult.content.includes('"queued" | "processing" | "shipped"'), "Agent-resolved value is renamed in the union type declaration");
assert(agentResult.content.includes('status: "queued"'), "Agent-resolved value is renamed at the object-literal call site");
const agentFix1 = agentResult.fixes.find((f) => f.changeId === "amb_rm_1" && f.origin === "agent-proposed");
assert(agentFix1?.agentConfidence === 0.87, "Agent-proposed fix carries the model's reported confidence");
assert(agentFix1?.agentReasoning === "Historically pending orders map to the new queued state", "Agent-proposed fix carries the model's reasoning");
const agentFix2 = agentResult.fixes.find((f) => f.changeId === "amb_rm_2");
assert(agentFix2?.safe === false, "A second, unresolved removed value in the same ambiguous group still gets flagged — a partial resolution doesn't short-circuit the rest of the group");
assert(agentResult.content.includes('x.status === "processing"'), "The unresolved value's comparison usage is left untouched");

// Test 15: validateProposal unit tests (pure, network-free).
console.log("\nTest 15: validateProposal unit tests");
const candidates15 = ["queued", "in_progress"];
assert(validateProposal({ target: "queued", confidence: 0.8, reasoning: "clear mapping" }, candidates15) !== null, "Valid proposal is accepted");
assert(validateProposal({ target: "cancelled", confidence: 0.9, reasoning: "x" }, candidates15) === null, "Out-of-candidate target is rejected");
assert(validateProposal({ target: "queued", confidence: 0.3, reasoning: "x" }, candidates15) === null, "Below-threshold confidence is rejected");
assert(validateProposal({ target: "queued", confidence: 0.9, reasoning: "" }, candidates15) === null, "Empty reasoning is rejected");
assert(validateProposal({ target: "queued", confidence: 0.9 } as any, candidates15) === null, "Missing reasoning is rejected");

// Test 16: maxAgentResolutions cap / fail-closed test — 5 independent ambiguous cases with
// a cap of 2. No real network call: global fetch is monkey-patched for the duration of this
// test only, to return a canned successful tool_use response (the standard no-mocking-
// framework approach already used implicitly elsewhere in this suite).
console.log("\nTest 16: maxAgentResolutions cap / fail-closed test");
const capChanges: ApiChange[] = [];
for (let g = 1; g <= 5; g++) {
  capChanges.push({ id: `cap_rm_${g}`, kind: "enum-value-removed", severity: "breaking", path: "/v1/widgets", operation: "post", field: `field${g}`, before: `old${g}`, summary: `Enum value "old${g}" removed` });
  capChanges.push({ id: `cap_add_${g}_a`, kind: "enum-value-added", severity: "additive", path: "/v1/widgets", operation: "post", field: `field${g}`, after: `new_a${g}`, summary: `Enum value "new_a${g}" added` });
  capChanges.push({ id: `cap_add_${g}_b`, kind: "enum-value-added", severity: "additive", path: "/v1/widgets", operation: "post", field: `field${g}`, after: `new_b${g}`, summary: `Enum value "new_b${g}" added` });
}

const savedApiKey16 = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "test-key-for-mock";
const originalFetch = globalThis.fetch;
let mockCallCount = 0;
globalThis.fetch = (async (_input: any, init?: any) => {
  mockCallCount++;
  const body = init?.body ? JSON.parse(init.body) : {};
  const candidatesFromRequest: string[] = body.tools?.[0]?.input_schema?.properties?.target?.enum ?? [];
  const responseBody = {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: body.model ?? "claude-opus-5",
    content: [
      { type: "tool_use", id: "toolu_test", name: "propose_enum_mapping", input: { target: candidatesFromRequest[0], confidence: 0.9, reasoning: "mocked" } },
    ],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  };
  return new Response(JSON.stringify(responseBody), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

let capMap: Map<string, { target: string; confidence: number; reasoning: string }>;
try {
  capMap = await resolveAmbiguousEnums(capChanges, { enabled: true, maxAgentResolutions: 2 });
} finally {
  globalThis.fetch = originalFetch;
  if (savedApiKey16 !== undefined) process.env.ANTHROPIC_API_KEY = savedApiKey16;
  else delete process.env.ANTHROPIC_API_KEY;
}

assert(mockCallCount === 2, `resolveAmbiguousEnums calls proposeEnumMapping exactly maxAgentResolutions (2) times, not all 5 ambiguous cases (got ${mockCallCount})`);
assert(capMap.size === 2, "Returned map has exactly 2 entries when the cap is 2");

const overflowChangeIds = capChanges.filter((c) => c.kind === "enum-value-removed").map((c) => c.id).filter((id) => !capMap.has(id));
assert(overflowChangeIds.length === 3, "Exactly 3 of the 5 ambiguous cases were left unresolved by the cap");

const capCode = `
export interface Widget {
  field1: "old1" | "new_a1" | "new_b1";
  field2: "old2" | "new_a2" | "new_b2";
  field3: "old3" | "new_a3" | "new_b3";
  field4: "old4" | "new_a4" | "new_b4";
  field5: "old5" | "new_a5" | "new_b5";
}
const w: Widget = { field1: "old1", field2: "old2", field3: "old3", field4: "old4", field5: "old5" };
`;
const capTransform = applyAstTransforms(capCode, capChanges, "src/widgets.ts", [], capMap);
const overflowFixes = capTransform.fixes.filter((f) => overflowChangeIds.includes(f.changeId));
assert(overflowFixes.length === 3 && overflowFixes.every((f) => f.safe === false), "The 3 cases beyond the cap fall straight through to the existing ambiguous-flag path (safe: false), not an error or a guess");
const resolvedFixes = capTransform.fixes.filter((f) => capMap.has(f.changeId));
const resolvedChangeIds = new Set(resolvedFixes.map((f) => f.changeId));
assert(resolvedChangeIds.size === 2 && resolvedFixes.every((f) => f.origin === "agent-proposed"), "The 2 cases within the cap are actually resolved via the agent-proposed path, compile-verifiable like any other fix");

console.log("\n==================================================");
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
console.log("==================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
