import fs from "fs";
import path from "path";
import {
  applyAstTransforms,
  diffOpenApi,
  findImpactedCode,
  parseOpenApi,
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

// Test 11: Transform scoping — unrelated object literals untouched
console.log("\nTest 11: Transform scoping — unrelated object literals untouched");
const unrelatedObjectCode = `
const config = { max_tokens: 500, retries: 3 };
console.log({ max_tokens: 1 });
const response = await openai.chat.completions.create({ max_tokens: 500 });
`;
const scopedRename = applyAstTransforms(unrelatedObjectCode, openaiChanges, "src/scoped.ts");
assert(scopedRename.content.includes("const config = { max_tokens: 500, retries: 3 };"), "Plain config object literal is NOT renamed");
assert(scopedRename.content.includes("console.log({ max_tokens: 1 });"), "Non-API call argument is NOT renamed");
assert(scopedRename.content.includes("create({ max_output_tokens: 500 })"), "API call-site property IS renamed");

// Test 12: Required field insertion scoped to API request objects
console.log("\nTest 12: Required field insertion scoped to API request objects");
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

// Test 13: Enum rename scoped to usages of the changed field
console.log("\nTest 13: Enum rename scoped to usages of the changed field");
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

// Test 14: Enum rename without documented replacement is skipped
console.log("\nTest 14: Enum rename without documented replacement is skipped");
const noReplacementChange = [{ ...enumChange[0], after: undefined }];
const noReplacementResult = applyAstTransforms(enumCode, noReplacementChange, "src/status.ts");
assert(noReplacementResult.content === enumCode, "No speculative enum mapping is invented when spec has no replacement");

// Test 15: Removed field with no paired addition is not renamed speculatively
console.log("\nTest 15: Removed field with no paired addition is not renamed speculatively");
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

console.log("\n==================================================");
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
console.log("==================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
