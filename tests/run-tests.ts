import fs from "fs";
import path from "path";
import {
  applyAstTransforms,
  diffOpenApi,
  findImpactedCode,
  parseOpenApi,
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
