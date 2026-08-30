import fs from "fs";
import os from "os";
import path from "path";
import {
  applyAstTransforms,
  buildPullRequest,
  collectTypeDiagnostics,
  diffOpenApi,
  findImpactedCode,
  normalizeMaxAgentResolutions,
  parseOpenApi,
  resolveAmbiguousEnums,
  resolveSpecIndirection,
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

// Test 4b: Symbol-resolution regression test
console.log("\nTest 4b: ts-morph symbol-resolution regression test");
const symbolResolutionCode = `
interface ChargeInput { amount: number; }
const note = "amount should remain documented";
const cachedPayload = { amount: 100 };
const client = { createCharge: (input: ChargeInput) => input };
client.createCharge({ amount: 100 });
`;
const amountRemoval = [{
  id: "chg_symbol_resolution",
  kind: "field-removed" as const,
  severity: "breaking" as const,
  path: "/v1/charge",
  operation: "post",
  field: "amount",
  before: "amount",
  summary: "amount removed",
}];
const symbolImpacts = findImpactedCode(amountRemoval, [{ path: "src/payment.ts", content: symbolResolutionCode }]);
assert(symbolImpacts.length === 1, "Ignores matching names in types, strings, and non-call objects");
assert(symbolImpacts[0]?.line === 6 && symbolImpacts[0]?.snippet.includes("createCharge"), "Resolves the removed field to its request call argument");

// Test 4c: Call-alias symbol-resolution regression test
console.log("\nTest 4c: call-alias symbol-resolution regression test");
const aliasedCallCode = `
const client = { createCharge: (input: { amount: number }) => input };
const submit = client.createCharge;
submit({ amount: 100 });
`;
const aliasedImpacts = findImpactedCode(amountRemoval, [
  { path: "src/aliased-payment.ts", content: aliasedCallCode },
]);
assert(
  aliasedImpacts.length === 1,
  "Follows a call alias back to the API operation symbol",
);
assert(
  aliasedImpacts[0]?.line === 4,
  "Reports the removed field at the aliased request call",
);
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

// Test 11: Baseline-aware validation for repos with pre-existing type errors
console.log("\nTest 11: Baseline-aware validation for repos with pre-existing type errors");
const baselineFixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "repairo-baseline-"));
fs.writeFileSync(
  path.join(baselineFixtureDir, "tsconfig.json"),
  JSON.stringify({ compilerOptions: { strict: true, noEmit: true, skipLibCheck: true } }),
);
fs.writeFileSync(path.join(baselineFixtureDir, "legacy.ts"), 'export const broken: number = "not a number";\n');
fs.writeFileSync(path.join(baselineFixtureDir, "repaired.ts"), "export const fine: number = 1;\n");

const noBaselineResult = validateCodebase(baselineFixtureDir);
assert(noBaselineResult.typecheckPassed === false, "Without a baseline, pre-existing errors fail validation");

const baselineDiagnostics = collectTypeDiagnostics(baselineFixtureDir);
assert(baselineDiagnostics.length > 0, "Collects pre-existing diagnostics as baseline");

const baselineResult = validateCodebase(baselineFixtureDir, { baseline: baselineDiagnostics });
assert(baselineResult.typecheckPassed === true, "With a baseline, pre-existing errors are ignored");
assert(baselineResult.preexistingErrorCount > 0, "Reports how many pre-existing errors were ignored");

fs.writeFileSync(path.join(baselineFixtureDir, "repaired.ts"), 'export const fine: number = "introduced by repair";\n');
const newErrorResult = validateCodebase(baselineFixtureDir, { baseline: baselineDiagnostics });
assert(newErrorResult.typecheckPassed === false, "Errors introduced after the baseline fail validation");
assert(newErrorResult.newErrors.some((d) => d.file.includes("repaired.ts")), "New error is attributed to the repaired file");

fs.writeFileSync(path.join(baselineFixtureDir, "repaired.ts"), "export const fine: number = 1;\n");
fs.writeFileSync(
  path.join(baselineFixtureDir, "legacy.ts"),
  '// repair inserted lines above the old error\n// shifting it down\nexport const broken: number = "not a number";\n',
);
const shiftedResult = validateCodebase(baselineFixtureDir, { baseline: baselineDiagnostics });
assert(shiftedResult.typecheckPassed === true, "Pre-existing errors shifted to new lines are still recognized as pre-existing");

fs.rmSync(baselineFixtureDir, { recursive: true, force: true });

// Test 12: Transform scoping — unrelated object literals untouched
console.log("\nTest 12: Transform scoping — unrelated object literals untouched");
const unrelatedObjectCode = `
const config = { max_tokens: 500, retries: 3 };
console.log({ max_tokens: 1 });
const response = await openai.chat.completions.create({ max_tokens: 500 });
`;
const scopedRename = applyAstTransforms(unrelatedObjectCode, openaiChanges, "src/scoped.ts");
assert(scopedRename.content.includes("const config = { max_tokens: 500, retries: 3 };"), "Plain config object literal is NOT renamed");
assert(scopedRename.content.includes("console.log({ max_tokens: 1 });"), "Non-API call argument is NOT renamed");
assert(scopedRename.content.includes("create({ max_output_tokens: 500 })"), "API call-site property IS renamed");

// Test 13: Required field insertion scoped to API request objects
console.log("\nTest 13: Required field insertion scoped to API request objects");
const requiredFieldCode = `
const uiState = { open: true };
function render(props: { title: string }) {}
render({ title: "Refunds" });
await paymentsClient.createRefund({ chargeId: "ch_1", amount: 100 });
`;
const requiredChange = [
  {
    id: "chg_010",
    kind: "field-required" as const,
    severity: "breaking" as const,
    path: "/v1/refunds",
    operation: "post",
    field: "reason",
    summary: 'Field "reason" is now required',
    before: "optional",
    after: "required",
  },
];
const requiredResult = applyAstTransforms(requiredFieldCode, requiredChange, "src/refunds.ts");
assert(requiredResult.content.includes("const uiState = { open: true };"), "Unrelated state object does NOT receive the required field");
assert(requiredResult.content.includes('render({ title: "Refunds" })'), "Non-API function call argument does NOT receive the required field");
assert(/createRefund\(\{ chargeId: "ch_1", amount: 100,\s*\n?\s*reason: "requested_by_customer"/.test(requiredResult.content.replace(/\r\n/g, "\n")), "API request object DOES receive the required field with default");
assert((requiredResult.content.match(/reason:/g) || []).length === 1, "Required field is inserted exactly once");

// Test 14: Enum rename scoped to usages of the changed field
console.log("\nTest 14: Enum rename scoped to usages of the changed field");
const enumCode = `
console.log("pending");
const label = "pending approval";
if (charge.status === "pending") retry();
await paymentsClient.createCharge({ amount: 5, status: "pending" });
`;
const enumChange = [
  {
    id: "chg_011",
    kind: "enum-value-removed" as const,
    severity: "breaking" as const,
    path: "/v1/charges",
    operation: "post",
    field: "status",
    summary: 'Enum value "pending" removed from "status"',
    before: "pending",
    after: "processing",
  },
];
const enumResult = applyAstTransforms(enumCode, enumChange, "src/status.ts");
assert(enumResult.content.includes('console.log("pending");'), "Unrelated string literal is NOT rewritten");
assert(enumResult.content.includes('const label = "pending approval";'), "Partial string match is NOT rewritten");
assert(enumResult.content.includes('charge.status === "processing"'), "Comparison against changed field IS rewritten");
assert(enumResult.content.includes('status: "processing"'), "API call argument enum value IS rewritten");

// Test 15: Enum rename without documented replacement is skipped
console.log("\nTest 15: Enum rename without documented replacement is skipped");
const noReplacementChange = [{ ...enumChange[0], after: undefined }];
const noReplacementResult = applyAstTransforms(enumCode, noReplacementChange, "src/status.ts");
assert(noReplacementResult.content === enumCode, "No speculative enum mapping is invented when spec has no replacement");

// Test 16: Removed field with no paired addition is not renamed speculatively
console.log("\nTest 16: Removed field with no paired addition is not renamed speculatively");
const removalOnlyChanges = [
  {
    id: "chg_012",
    kind: "field-removed" as const,
    severity: "breaking" as const,
    path: "/v1/chat/completions",
    operation: "post",
    field: "max_tokens",
    summary: "Parameter max_tokens removed",
    before: "max_tokens",
  },
  {
    id: "chg_013",
    kind: "field-added" as const,
    severity: "additive" as const,
    path: "/v1/other",
    operation: "post",
    field: "unrelated_field",
    summary: "Added unrelated_field",
    after: "unrelated_field",
  },
];
const removalOnlyResult = applyAstTransforms(openaiBeforeCode, removalOnlyChanges, "src/ai.ts");
assert(removalOnlyResult.content.includes("max_tokens: 500"), "Removed field is NOT renamed to a field added on a different endpoint");

// Test 17: Google Discovery document conversion
console.log("\nTest 17: Google Discovery document conversion");
const discoveryJson = JSON.stringify({
  kind: "discovery#restDescription",
  discoveryVersion: "v1",
  name: "generativelanguage",
  title: "Generative Language API",
  version: "v1beta",
  baseUrl: "https://generativelanguage.googleapis.com/",
  schemas: {
    GenerateContentRequest: {
      id: "GenerateContentRequest",
      type: "object",
      properties: {
        model: { type: "string", description: "Required. The model name." },
        contents: { type: "array", items: { $ref: "Content" } },
      },
    },
    Content: { id: "Content", type: "object", properties: { role: { type: "string", enum: ["user", "model"] } } },
  },
  resources: {
    models: {
      methods: {
        generateContent: {
          id: "generativelanguage.models.generateContent",
          path: "v1beta/{+model}:generateContent",
          flatPath: "v1beta/models/{modelsId}:generateContent",
          httpMethod: "POST",
          parameters: { model: { location: "path", required: true, type: "string" } },
          request: { $ref: "GenerateContentRequest" },
          response: { $ref: "GenerateContentRequest" },
        },
      },
    },
  },
});
const convertedDoc = parseOpenApi(discoveryJson);
assert(convertedDoc.openapi === "3.0.0", "Detects discovery document and converts to OpenAPI");
assert(Boolean(convertedDoc.paths?.["/v1beta/models/{modelsId}:generateContent"]?.post), "Maps discovery methods to OpenAPI paths and operations");
assert(convertedDoc.components?.schemas?.GenerateContentRequest?.required?.includes("model") === true, "Maps 'Required.' annotations into required fields");
assert((convertedDoc.components?.schemas?.Content?.properties?.role as any)?.enum?.length === 2, "Preserves enum values through conversion");

// Test 18: Discovery-converted specs are diffable
console.log("\nTest 18: Discovery-converted specs are diffable");
const discoveryAfter = JSON.parse(discoveryJson);
delete discoveryAfter.resources.models.methods.generateContent;
discoveryAfter.resources.models.methods.createContent = {
  id: "generativelanguage.models.createContent",
  flatPath: "v1beta/models/{modelsId}:createContent",
  httpMethod: "POST",
};
const discoveryDiff = diffOpenApi(convertedDoc, parseOpenApi(JSON.stringify(discoveryAfter)));
assert(discoveryDiff.some((c) => c.kind === "endpoint-removed" && c.severity === "breaking"), "Detects breaking endpoint removal across discovery snapshots");

// Test 19: Stainless .stats.yml spec URL indirection
console.log("\nTest 19: Stainless .stats.yml spec URL indirection");
const statsYml = "configured_endpoints: 144\nopenapi_spec_url: https://example.com/spec.yml\nopenapi_spec_hash: abc\n";
assert(resolveSpecIndirection(statsYml) === "https://example.com/spec.yml", "Extracts openapi_spec_url from Stainless stats file");
assert(resolveSpecIndirection("openapi: 3.0.0\ninfo:\n  title: X\n") === null, "Does not treat a real OpenAPI document as indirection");
assert(resolveSpecIndirection('{"openapi": "3.0.0"}') === null, "Does not treat JSON OpenAPI as indirection");

// Test 20: Removed endpoint impact via URL path matching
console.log("\nTest 20: Removed endpoint impact via URL path matching");
const endpointChange = [
  {
    id: "chg_020",
    kind: "endpoint-removed" as const,
    severity: "breaking" as const,
    path: "/pet/findByStatus",
    operation: "get",
    summary: "Removed GET /pet/findByStatus",
  },
];
const fetchCode = 'const res = await fetch("https://petstore3.swagger.io/api/v3/pet/findByStatus?status=sold");\n';
const endpointImpacts = findImpactedCode(endpointChange, [{ path: "src/pets.ts", content: fetchCode }]);
assert(endpointImpacts.some((i) => i.confidence === "high"), "Flags fetch calls to removed endpoint URLs as high-confidence impact");
const templatedChange = [{ ...endpointChange[0], path: "/v1/apps/{appId}/keys" }];
const templatedImpacts = findImpactedCode(templatedChange, [
  { path: "src/keys.ts", content: 'await api.get("/v1/apps/" + id + "/keys");\n' },
]);
assert(templatedImpacts.length > 0, "Matches literal prefix of templated endpoint paths");

// Test 21: Cross-domain generality regression test — a second, independently-designed
// fixture (a Shipping API) with no naming overlap with the payments fixture at all, to
// prove the engine repairs codebases generically rather than being tuned to one demo.
console.log("\nTest 21: Cross-domain generality regression test (Shipping API fixture)");
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

// Test 22: Ambiguous-enum baseline regression test — 2 removed / 2 added values for the
// same field, with no agent resolution supplied at all. Locks in today's exact behavior:
// both removed values are flagged for manual review, and the source is left untouched.
console.log("\nTest 22: Ambiguous-enum baseline regression test");
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

// Test 23: No-key no-op test — resolveAmbiguousEnums must never attempt a network call (and
// must return an empty map) when ANTHROPIC_API_KEY isn't set, even if the caller explicitly
// opted in via `enabled: true`. The resulting repair output must be identical to the baseline.
console.log("\nTest 23: No-key no-op test");
const savedApiKey13 = process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
const noKeyMap = await resolveAmbiguousEnums(ambiguousEnumChanges, { enabled: true });
assert(noKeyMap.size === 0, "resolveAmbiguousEnums returns an empty map with no network attempt when ANTHROPIC_API_KEY is unset");
const noKeyTransform = applyAstTransforms(ambiguousEnumCode, ambiguousEnumChanges, "src/orders.ts", [], noKeyMap);
assert(noKeyTransform.content === baselineResult.content, "Output is identical to the baseline when no key is present (flag-off path is byte-for-byte unchanged)");
if (savedApiKey13 !== undefined) process.env.ANTHROPIC_API_KEY = savedApiKey13;

// Test 24: Agent-proposed pairing flows through the real deterministic AST-rename path —
// this tests the seam (a hand-built resolution map), not the live API integration.
console.log("\nTest 24: Agent-proposed pairing flows through the deterministic path");
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

// Test 25: validateProposal unit tests (pure, network-free).
console.log("\nTest 25: validateProposal unit tests");
const candidates15 = ["queued", "in_progress"];
assert(validateProposal({ target: "queued", confidence: 0.8, reasoning: "clear mapping" }, candidates15) !== null, "Valid proposal is accepted");
assert(validateProposal({ target: "cancelled", confidence: 0.9, reasoning: "x" }, candidates15) === null, "Out-of-candidate target is rejected");
assert(validateProposal({ target: "queued", confidence: 0.3, reasoning: "x" }, candidates15) === null, "Below-threshold confidence is rejected");
assert(validateProposal({ target: "queued", confidence: 0.9, reasoning: "" }, candidates15) === null, "Empty reasoning is rejected");
assert(validateProposal({ target: "queued", confidence: 0.9 } as any, candidates15) === null, "Missing reasoning is rejected");

// Confidence bounds — validateProposal must enforce Number.isFinite(confidence) &&
// confidence >= minConfidence && confidence <= 1. Default minConfidence is 0.6.
assert(validateProposal({ target: "queued", confidence: 1.0, reasoning: "x" }, candidates15) !== null, "Confidence of exactly 1.0 is accepted");
assert(validateProposal({ target: "queued", confidence: 0.99, reasoning: "x" }, candidates15) !== null, "Confidence of 0.99 is accepted");
assert(validateProposal({ target: "queued", confidence: 0.6, reasoning: "x" }, candidates15) !== null, "Confidence exactly at the default threshold (0.6) is accepted");
assert(validateProposal({ target: "queued", confidence: 0.59, reasoning: "x" }, candidates15) === null, "Confidence of 0.59 (just below the default threshold) is rejected");
assert(validateProposal({ target: "queued", confidence: 1.01, reasoning: "x" }, candidates15) === null, "Confidence of 1.01 (just above the upper bound) is rejected");
assert(validateProposal({ target: "queued", confidence: 5, reasoning: "x" }, candidates15) === null, "Confidence of 5 is rejected");
assert(validateProposal({ target: "queued", confidence: -1, reasoning: "x" }, candidates15) === null, "Negative confidence (-1) is rejected");
assert(validateProposal({ target: "queued", confidence: NaN, reasoning: "x" }, candidates15) === null, "NaN confidence is rejected");
assert(validateProposal({ target: "queued", confidence: Infinity, reasoning: "x" }, candidates15) === null, "Infinity confidence is rejected");

// normalizeMaxAgentResolutions unit tests — the exact policy the cap-bypass bug requires.
console.log("\nTest 26: normalizeMaxAgentResolutions unit tests");
assert(normalizeMaxAgentResolutions(undefined) === 20, "Missing value falls back to the default (20)");
assert(normalizeMaxAgentResolutions(NaN) === 20, "NaN falls back to the default — never disables the cap");
assert(normalizeMaxAgentResolutions(Infinity) === 20, "Infinity falls back to the default");
assert(normalizeMaxAgentResolutions(-Infinity) === 20, "-Infinity falls back to the default");
assert(normalizeMaxAgentResolutions(-1) === 20, "Negative value falls back to the default");
assert(normalizeMaxAgentResolutions(-5) === 20, "Negative value falls back to the default");
assert(normalizeMaxAgentResolutions(2.5) === 20, "Non-integer (decimal) value falls back to the default");
assert(normalizeMaxAgentResolutions(0) === 0, "0 is honored as-is (explicit 'resolve nothing')");
assert(normalizeMaxAgentResolutions(5) === 5, "A valid positive integer is honored as-is");
assert(normalizeMaxAgentResolutions(1_000_000) === 1_000_000, "An extremely large valid integer is honored as-is (an explicit, informed choice)");

// Test 27: maxAgentResolutions cap / fail-closed test — 5 independent ambiguous cases with
// a cap of 2. No real network call: global fetch is monkey-patched for the duration of this
// test only, to return a canned successful tool_use response (the standard no-mocking-
// framework approach already used implicitly elsewhere in this suite).
console.log("\nTest 27: maxAgentResolutions cap / fail-closed test");
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

// Test 28: Duplicate-target conflict fail-closed test — two removed values in the SAME
// ambiguous group independently proposed to map to the SAME target. Neither proposal
// should be applied; the whole group must fall back to the existing ambiguous/manual-
// review path, with no source mutation and no guessing which one to keep.
console.log("\nTest 28: Duplicate-target conflict fail-closed test");
const dupCode = `
export interface Ticket {
  status: "alpha" | "beta" | "gamma" | "delta";
}
const t1: Ticket = { status: "alpha" };
const t2: Ticket = { status: "beta" };
`;
const dupChanges: ApiChange[] = [
  { id: "dup_rm_1", kind: "enum-value-removed", severity: "breaking", path: "/v1/tickets", operation: "post", field: "status", before: "alpha", summary: 'Enum value "alpha" removed' },
  { id: "dup_rm_2", kind: "enum-value-removed", severity: "breaking", path: "/v1/tickets", operation: "post", field: "status", before: "beta", summary: 'Enum value "beta" removed' },
  { id: "dup_add_1", kind: "enum-value-added", severity: "additive", path: "/v1/tickets", operation: "post", field: "status", after: "gamma", summary: 'Enum value "gamma" added' },
  { id: "dup_add_2", kind: "enum-value-added", severity: "additive", path: "/v1/tickets", operation: "post", field: "status", after: "delta", summary: 'Enum value "delta" added' },
];

const savedApiKey17 = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "test-key-for-mock";
const originalFetch17 = globalThis.fetch;
globalThis.fetch = (async (_input: any, init?: any) => {
  const body = init?.body ? JSON.parse(init.body) : {};
  const candidatesFromRequest: string[] = body.tools?.[0]?.input_schema?.properties?.target?.enum ?? [];
  // Deliberately always proposes the SAME candidate regardless of which removed value is
  // being asked about, reproducing two independent model calls colliding on one target.
  const responseBody = {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: body.model ?? "claude-opus-5",
    content: [
      { type: "tool_use", id: "toolu_test", name: "propose_enum_mapping", input: { target: candidatesFromRequest[0], confidence: 0.9, reasoning: "mocked, always picks the first candidate" } },
    ],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  };
  return new Response(JSON.stringify(responseBody), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

let dupMap: Map<string, { target: string; confidence: number; reasoning: string }>;
try {
  dupMap = await resolveAmbiguousEnums(dupChanges, { enabled: true });
} finally {
  globalThis.fetch = originalFetch17;
  if (savedApiKey17 !== undefined) process.env.ANTHROPIC_API_KEY = savedApiKey17;
  else delete process.env.ANTHROPIC_API_KEY;
}

assert(dupMap.size === 0, "Conflicting proposals (both independently mapped to the same target) result in zero resolutions for the whole group — fail closed, never a guess");

const dupTransform = applyAstTransforms(dupCode, dupChanges, "src/tickets.ts", [], dupMap);
assert(dupTransform.content === dupCode, "No source mutation occurs when the group's proposals conflict");
const dupFix1 = dupTransform.fixes.find((f) => f.changeId === "dup_rm_1");
const dupFix2 = dupTransform.fixes.find((f) => f.changeId === "dup_rm_2");
assert(dupFix1?.safe === false, "Removed value 'alpha' remains eligible for the existing ambiguous/manual-review path");
assert(dupFix2?.safe === false, "Removed value 'beta' remains eligible for the existing ambiguous/manual-review path");
assert(dupFix1?.origin === undefined && dupFix2?.origin === undefined, "Neither conflicting case is ever labeled agent-proposed");

// Test 29: autoMergeEligible must be false whenever any fix in the PR is agent-proposed,
// and the PR body must clearly separate and label AI-proposed fixes — end to end through
// the real buildPullRequest function (not just inferred from the origin field in isolation).
console.log("\nTest 29: autoMergeEligible=false and PR body labeling for agent-proposed fixes");
const amOriginalFiles = [{ path: "src/orders.ts", content: ambiguousEnumCode }];
const amUpdatedFiles = [{ path: "src/orders.ts", content: agentResult.content }];
const amFixes = agentResult.fixes.map((f) => ({ ...f, file: "src/orders.ts" }));
const amPr = buildPullRequest(ambiguousEnumChanges, amFixes, amOriginalFiles, amUpdatedFiles, { fromVersion: "1.0.0", toVersion: "1.1.0" });
assert(amPr.autoMergeEligible === false, "A PR containing any agent-proposed fix is never auto-merge eligible, regardless of safety score");
assert(amPr.body.includes("AI-proposed, compile-verified fixes"), "PR body contains a distinct heading for AI-proposed fixes, separate from deterministic ones");
assert(amPr.body.includes("0.87"), "PR body displays the agent-proposed fix's confidence");
assert(amPr.body.includes(agentFix1!.agentReasoning!), "PR body displays the agent-proposed fix's reasoning");
assert(amPr.body.includes("manual review"), "PR body explicitly calls out manual review for agent-proposed fixes");

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
