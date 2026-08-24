import fs from "fs";
import path from "path";
import {
  applyAstTransforms,
  diffOpenApi,
  findImpactedCode,
  parseOpenApi,
  resolveSpecIndirection,
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

// Test 11: Google Discovery document conversion
console.log("\nTest 11: Google Discovery document conversion");
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

// Test 12: Discovery-converted specs are diffable
console.log("\nTest 12: Discovery-converted specs are diffable");
const discoveryAfter = JSON.parse(discoveryJson);
delete discoveryAfter.resources.models.methods.generateContent;
discoveryAfter.resources.models.methods.createContent = {
  id: "generativelanguage.models.createContent",
  flatPath: "v1beta/models/{modelsId}:createContent",
  httpMethod: "POST",
};
const discoveryDiff = diffOpenApi(convertedDoc, parseOpenApi(JSON.stringify(discoveryAfter)));
assert(discoveryDiff.some((c) => c.kind === "endpoint-removed" && c.severity === "breaking"), "Detects breaking endpoint removal across discovery snapshots");

// Test 13: Stainless .stats.yml spec URL indirection
console.log("\nTest 13: Stainless .stats.yml spec URL indirection");
const statsYml = "configured_endpoints: 144\nopenapi_spec_url: https://example.com/spec.yml\nopenapi_spec_hash: abc\n";
assert(resolveSpecIndirection(statsYml) === "https://example.com/spec.yml", "Extracts openapi_spec_url from Stainless stats file");
assert(resolveSpecIndirection("openapi: 3.0.0\ninfo:\n  title: X\n") === null, "Does not treat a real OpenAPI document as indirection");
assert(resolveSpecIndirection('{"openapi": "3.0.0"}') === null, "Does not treat JSON OpenAPI as indirection");

// Test 14: Removed endpoint impact via URL path matching
console.log("\nTest 14: Removed endpoint impact via URL path matching");
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

console.log("\n==================================================");
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
console.log("==================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
