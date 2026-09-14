import {
  applyPythonTransforms,
  diffOpenApi,
  findImpactedCode,
  generateFixes,
  parseOpenApi,
  tokenizePython,
  validateInMemory,
  validatePythonSyntax,
} from "../src/lib/engine";
import { readFixture } from "../src/lib/fixtures";

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

const shippingBefore = readFixture("apis", "shipping-v1.openapi.yaml");
const shippingAfter = readFixture("apis", "shipping-v2.openapi.yaml");
const shipmentsPy = readFixture("consumers", "logistics-service", "src", "shipments_client.py");
const orderPy = readFixture("consumers", "logistics-service", "src", "order_flow.py");

function shippingChanges() {
  return diffOpenApi(parseOpenApi(shippingBefore), parseOpenApi(shippingAfter));
}

function main() {
  console.log("\n==================================================");
  console.log("REPAIRO PYTHON REPAIR TEST SUITE");
  console.log("==================================================");

  console.log("\nTest 1: tokenizer skips comments and strings");
  const commented = 'BASE_URL = "https://api.example.com/v1"\n# still https://api.example.com/v1 queued\nstatus = "queued"\n';
  const lexed = tokenizePython(commented);
  assert(!lexed.error, "sample Python tokenizes");
  const comments = (lexed.tokens ?? []).filter((t) => t.kind === "comment");
  assert(comments.some((c) => c.text.includes("https://api.example.com/v1")), "comment token keeps URL text");
  assert((lexed.tokens ?? []).filter((t) => t.kind === "string").length === 2, "two string literals besides the comment");

  console.log("\nTest 2: URL literal + constant update");
  const urlChange = [
    {
      id: "url",
      kind: "server-url-changed" as const,
      severity: "breaking" as const,
      path: "/",
      before: "https://api.example.com/v1",
      after: "https://api.example.com/v2",
      summary: "server url changed",
    },
  ];
  const urlSource = 'BASE_URL = "https://api.example.com/v1"\n# keep https://api.example.com/v1\n';
  const urlResult = applyPythonTransforms(urlSource, urlChange, "client.py");
  assert(urlResult.content.includes("https://api.example.com/v2"), "URL string literal is updated");
  assert(urlResult.content.includes("# keep https://api.example.com/v1"), "comment URL is not rewritten");
  assert(urlResult.fixes.every((f) => f.safe), "URL rewrite is marked safe");

  console.log("\nTest 3: 1:1 enum string rewrite");
  const enumChanges = [
    {
      id: "rm",
      kind: "enum-value-removed" as const,
      severity: "breaking" as const,
      path: "/shipments",
      operation: "post",
      field: "status",
      before: "queued",
      summary: "queued removed",
    },
    {
      id: "add",
      kind: "enum-value-added" as const,
      severity: "additive" as const,
      path: "/shipments",
      operation: "post",
      field: "status",
      after: "pending",
      summary: "pending added",
    },
  ];
  const enumSource = 'def is_queued(record):\n    return record["status"] == "queued"\n';
  const enumResult = applyPythonTransforms(enumSource, enumChanges, "status.py");
  assert(enumResult.content.includes('== "pending"'), "queued comparison becomes pending");
  assert(!enumResult.content.includes('"queued"'), "old enum literal is gone");
  assert(enumResult.fixes.some((f) => f.safe && f.description.includes("queued")), "enum rewrite is safe");

  console.log("\nTest 4: required dict key + kwarg insertion");
  const required = [
    {
      id: "req",
      kind: "field-required" as const,
      severity: "breaking" as const,
      path: "/shipments",
      operation: "post",
      field: "recipientEmail",
      fieldType: "string",
      side: "request" as const,
      relatedFields: ["originZip", "destZip", "weightKg", "carrier", "recipientEmail"],
      summary: "recipientEmail required",
    },
  ];
  const dictSource = `request = {
    "originZip": origin,
    "destZip": dest,
    "weightKg": 1.5,
    "carrier": "ups",
}
`;
  const dictResult = applyPythonTransforms(dictSource, required, "order.py");
  assert(dictResult.content.includes("recipientEmail"), "camelCase dict gains recipientEmail");
  assert(dictResult.fixes.some((f) => f.safe), "dict insert is safe");

  const kwSource = 'create_shipment(origin_zip="1", dest_zip="2", weight_kg=1, carrier="ups")\n';
  const kwResult = applyPythonTransforms(kwSource, required, "sdk.py");
  assert(kwResult.content.includes("recipient_email="), "snake_case kwargs gain recipient_email");
  assert(kwResult.fixes.some((f) => f.safe && f.description.includes("keyword")), "kwarg insert is safe");

  console.log("\nTest 5: ambiguous enum is not auto-applied");
  const ambiguous = [
    {
      id: "rm1",
      kind: "enum-value-removed" as const,
      severity: "breaking" as const,
      path: "/charges",
      operation: "post",
      field: "status",
      before: "failed",
      summary: "failed removed",
    },
    {
      id: "add1",
      kind: "enum-value-added" as const,
      severity: "additive" as const,
      path: "/charges",
      operation: "post",
      field: "status",
      after: "canceled",
      summary: "canceled added",
    },
    {
      id: "add2",
      kind: "enum-value-added" as const,
      severity: "additive" as const,
      path: "/charges",
      operation: "post",
      field: "status",
      after: "declined",
      summary: "declined added",
    },
  ];
  const ambSource = 'if charge["status"] == "failed":\n    return\n';
  const ambResult = applyPythonTransforms(ambSource, ambiguous, "pay.py");
  assert(ambResult.content.includes('"failed"'), "ambiguous enum literal is left in place");
  assert(ambResult.fixes.some((f) => !f.safe), "ambiguous enum is flagged unsafe");

  console.log("\nTest 5b: agent-proposed resolution rewrites an otherwise-ambiguous enum");
  const agentResolutions = new Map([
    ["rm1", { target: "canceled", confidence: 0.87, reasoning: "Vendor changelog: failed was split into canceled/declined; this call site checks a user-initiated abort." }],
  ]);
  const agentResult = applyPythonTransforms(ambSource, ambiguous, "pay.py", [], agentResolutions);
  assert(agentResult.content.includes('"canceled"'), "agent-resolved enum is rewritten to the proposed target");
  assert(!agentResult.content.includes('"failed"'), "old enum literal is gone after agent resolution");
  const agentFix = agentResult.fixes.find((f) => f.changeId === "rm1");
  assert(agentFix?.safe === true, "agent-resolved fix is still marked safe");
  assert(agentFix?.origin === "agent-proposed", "fix is labeled agent-proposed, not deterministic");
  assert(agentFix?.agentConfidence === 0.87, "fix carries the model's reported confidence");
  assert(
    Boolean(agentFix?.safetyNotes.some((n) => n.includes("AI-proposed pairing"))),
    "safety notes flag this as an AI proposal requiring review",
  );

  const badTargetResolutions = new Map([
    ["rm1", { target: "not-a-real-candidate", confidence: 0.9, reasoning: "hallucinated" }],
  ]);
  const badTargetResult = applyPythonTransforms(ambSource, ambiguous, "pay.py", [], badTargetResolutions);
  assert(badTargetResult.content.includes('"failed"'), "a proposal outside the group's real candidates is rejected, not applied");

  console.log("\nTest 6: comments are not rewritten for enums");
  const commentEnum = applyPythonTransforms(
    '# status == "queued"\nrecord = {"status": "queued"}\n',
    enumChanges,
    "c.py",
  );
  assert(commentEnum.content.includes('# status == "queued"'), "enum in a comment is unchanged");
  assert(commentEnum.content.includes('"pending"'), "real dict value is rewritten");

  console.log("\nTest 7: shipping v2 Python consumers + validateInMemory");
  const changes = shippingChanges();
  const files = [
    { path: "src/shipments_client.py", content: shipmentsPy },
    { path: "src/order_flow.py", content: orderPy },
  ];
  const impacts = findImpactedCode(changes, files);
  assert(impacts.length > 0, "Python shipping consumers are impacted");
  const { fixes, updatedFiles } = generateFixes(changes, files, impacts);
  assert(fixes.length > 0 && fixes.every((f) => f.safe), "all generated Python fixes are safe");
  const updatedOrder = updatedFiles.find((f) => f.path.endsWith("order_flow.py"))?.content ?? "";
  const updatedShip = updatedFiles.find((f) => f.path.endsWith("shipments_client.py"))?.content ?? "";
  assert(updatedShip.includes("https://api.acme-shipping.com/v2"), "shipping base URL bumped to v2");
  assert(updatedShip.includes('"pending"') || updatedShip.includes("'pending'"), "queued enum rewritten in Python client");
  assert(updatedOrder.includes("recipientEmail"), "required recipientEmail inserted into request dict");
  const syntax = validatePythonSyntax(updatedOrder);
  assert(syntax.ok, "repaired order_flow.py still tokenizes as balanced Python");
  const typecheck = validateInMemory(updatedFiles);
  assert(typecheck.passed, "validateInMemory accepts repaired Python files");
  const broken = validateInMemory([{ path: "src/bad.py", content: 'x = "unterminated\n' }]);
  assert(!broken.passed, "unclosed Python string fails in-memory validation");

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
  console.log("==================================================\n");
  if (passedTests !== totalTests) process.exit(1);
}

main();
