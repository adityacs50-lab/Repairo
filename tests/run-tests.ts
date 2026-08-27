import fs from "fs";
import os from "os";
import path from "path";
import {
  applyAstTransforms,
  collectTypeDiagnostics,
  diffOpenApi,
  findImpactedCode,
  parseOpenApi,
  resolveSpecIndirection,
  runRepair,
  scanCodebase,
  scanDirectory,
  validateCodebase,
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
const shippingResult = runRepair({
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

console.log("\n==================================================");
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
console.log("==================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
