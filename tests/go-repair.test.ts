import {
  applyGoTransforms,
  diffOpenApi,
  findGoImpacts,
  findImpactedCode,
  generateFixes,
  parseOpenApi,
  tokenizeGo,
  validateGoSyntax,
  validateInMemory,
} from "../src/lib/engine";
import { readFixture } from "../src/lib/read-fixture";

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
const shipmentsGo = readFixture("consumers", "logistics-service", "src", "shipments_client.go");
const orderGo = readFixture("consumers", "logistics-service", "src", "order_flow.go");

function shippingChanges() {
  return diffOpenApi(parseOpenApi(shippingBefore), parseOpenApi(shippingAfter));
}

function main() {
  console.log("\n==================================================");
  console.log("REPAIRO GO REPAIR TEST SUITE");
  console.log("==================================================");

  console.log("\nTest 1: tokenizer handles comments, strings, runes, numbers");
  const sample =
    'const BaseURL = "https://api.example.com/v1"\n' +
    "// still https://api.example.com/v1 queued\n" +
    '/* block\ncomment */\n' +
    "const Raw = `https://api.example.com/v1`\n" +
    "var r rune = 'a'\n" +
    "const n = 1_000_000\n";
  const lexed = tokenizeGo(sample);
  assert(!lexed.error, "sample Go tokenizes");
  const comments = (lexed.tokens ?? []).filter((t) => t.kind === "comment");
  assert(comments.some((c) => c.text.includes("https://api.example.com/v1")), "comment token keeps URL text");
  assert(comments.some((c) => c.text.startsWith("/*")), "block comment recognized");
  const strings = (lexed.tokens ?? []).filter((t) => t.kind === "string");
  assert(strings.length === 2, "two string literals (interpreted + raw) besides the comment");
  assert(strings.some((s) => s.raw), "raw backtick string is flagged raw");
  assert((lexed.tokens ?? []).some((t) => t.kind === "rune"), "rune literal tokenized");
  assert((lexed.tokens ?? []).some((t) => t.kind === "number" && t.text === "1_000_000"), "underscored number literal tokenized");

  console.log("\nTest 2: URL literal + raw string update");
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
  const urlSource = 'const BaseURL = "https://api.example.com/v1"\nconst Raw = `https://api.example.com/v1`\n// keep https://api.example.com/v1\n';
  const urlResult = applyGoTransforms(urlSource, urlChange, "client.go");
  assert(urlResult.content.includes('"https://api.example.com/v2"'), "interpreted string literal is updated");
  assert(urlResult.content.includes("`https://api.example.com/v2`"), "raw string literal is updated");
  assert(urlResult.content.includes("// keep https://api.example.com/v1"), "comment URL is not rewritten");
  assert(urlResult.fixes.every((f) => f.safe), "URL rewrite is marked safe");

  console.log("\nTest 3: 1:1 enum rewrite via map index and struct dot-access");
  const enumChanges = [
    {
      id: "rm", kind: "enum-value-removed" as const, severity: "breaking" as const,
      path: "/shipments", operation: "post", field: "status", before: "queued", summary: "queued removed",
    },
    {
      id: "add", kind: "enum-value-added" as const, severity: "additive" as const,
      path: "/shipments", operation: "post", field: "status", after: "pending", summary: "pending added",
    },
  ];
  const enumSource = `func IsQueued(record map[string]interface{}) bool {
	return record["status"] == "queued"
}

type Shipment struct {
	Status string
}

func IsQueuedStruct(s Shipment) bool {
	return s.Status == "queued"
}
`;
  const enumResult = applyGoTransforms(enumSource, enumChanges, "status.go");
  assert(enumResult.content.includes('record["status"] == "pending"'), "map-index comparison becomes pending");
  assert(enumResult.content.includes('s.Status == "pending"'), "struct dot-access comparison becomes pending");
  assert(!enumResult.content.includes('"queued"'), "old enum literal is gone everywhere");
  assert(enumResult.fixes.every((f) => f.safe), "both enum rewrites are safe");

  console.log("\nTest 4: required field insertion into map[string]interface{}/any literals");
  const required = [
    {
      id: "req", kind: "field-required" as const, severity: "breaking" as const,
      path: "/shipments", operation: "post", field: "recipientEmail", fieldType: "string", side: "request" as const,
      relatedFields: ["originZip", "destZip", "weightKg", "carrier", "recipientEmail"],
      summary: "recipientEmail required",
    },
  ];
  const mapSource = `func PlaceOrder() {
	request := map[string]interface{}{
		"originZip": "10001",
		"destZip":   "90001",
		"weightKg":  1.5,
		"carrier":   "ups",
	}
	SubmitShipment(request)
}
`;
  const mapResult = applyGoTransforms(mapSource, required, "order.go");
  assert(mapResult.content.includes('"recipientEmail"'), "map literal gains recipientEmail");
  assert(mapResult.fixes.some((f) => f.safe), "map insert is safe");
  assert(validateGoSyntax(mapResult.content).ok, "repaired file is still syntactically valid Go");

  console.log("\nTest 4b: critical — inserting into a gofmt-style literal (trailing comma before closing brace) must not produce a double comma");
  assert(!/,\s*,/.test(mapResult.content), "no double comma after inserting into a literal that already has a trailing comma (the common gofmt shape)");

  const noTrailingCommaSource = `func PlaceOrder() {
	request := map[string]interface{}{
		"originZip": "10001",
		"destZip":   "90001",
		"weightKg":  1.5,
		"carrier":   "ups"}
	SubmitShipment(request)
}
`;
  const noTrailingResult = applyGoTransforms(noTrailingCommaSource, required, "order2.go");
  assert(noTrailingResult.content.includes('"ups", "recipientEmail"'), "a leading comma IS still added when there was no pre-existing trailing comma");
  assert(!/,\s*,/.test(noTrailingResult.content), "no-trailing-comma case never produces a double comma either");
  assert(validateGoSyntax(noTrailingResult.content).ok, "no-trailing-comma insertion result passes the real syntax gate");

  const anySource = mapSource.replace("map[string]interface{}", "map[string]any");
  const anyResult = applyGoTransforms(anySource, required, "order_any.go");
  assert(anyResult.content.includes('"recipientEmail"'), "map[string]any literal also gains recipientEmail");

  const returnedSource = `func InventoryRecord() map[string]interface{} {
	return map[string]interface{}{
		"originZip": "10001",
		"destZip":   "90001",
		"weightKg":  1.5,
		"carrier":   "ups",
	}
}
`;
  const returnedResult = applyGoTransforms(returnedSource, required, "returned.go");
  assert(returnedResult.content.includes('"recipientEmail"'), "a directly-returned map literal is anchored and gains the field");

  console.log("\nTest 5: struct literal field-required is flagged, never guessed at");
  const structSource = `func PlaceOrder() {
	req := ShipmentRequest{
		OriginZip: "10001",
		DestZip:   "90001",
		WeightKg:  1.5,
		Carrier:   "ups",
	}
	SubmitShipment(req)
}
`;
  const structResult = applyGoTransforms(structSource, required, "struct_order.go");
  assert(!structResult.content.includes("recipientEmail") && !structResult.content.includes("RecipientEmail"), "struct literal is never mutated with a fabricated field");
  assert(structResult.fixes.some((f) => !f.safe && f.description.includes("type isn't safely editable")), "struct literal case is flagged unsafe for manual review");

  console.log("\nTest 6: struct tag JSON key rename");
  const tagChanges = [
    {
      id: "rn", kind: "field-added" as const, severity: "breaking" as const,
      path: "/shipments", operation: "post", field: "status", before: "status", after: "state", summary: "renamed",
    },
  ];
  const tagSource = 'type Request struct {\n\tStatus string `json:"status,omitempty"`\n\tOther  string `json:"other" xml:"Other"`\n}\n';
  const tagResult = applyGoTransforms(tagSource, tagChanges, "tags.go");
  assert(tagResult.content.includes('json:"state,omitempty"'), "json tag key renamed, option preserved");
  assert(tagResult.content.includes('xml:"Other"'), "unrelated xml tag on another field untouched");
  assert(tagResult.content.includes('json:"other"'), "unrelated json tag on another field untouched");
  assert(tagResult.content.includes("Status string"), "struct field identifier is never renamed (only the tag's JSON key)");

  console.log("\nTest 6b: endpoint-removed is flagged for manual review, never auto-repaired");
  const endpointRemovedChanges = [
    { id: "ep_rm", kind: "endpoint-removed" as const, severity: "breaking" as const, path: "/v1/shipments/{id}/cancel", operation: "post", summary: "endpoint removed" },
  ];
  const endpointSource = `func CancelShipment(id string) {
	http.Post("https://api.acme-shipping.com/v1/shipments/"+id+"/cancel", "application/json", nil)
}
`;
  const endpointImpacts = findGoImpacts(endpointRemovedChanges, "client.go", endpointSource);
  assert(endpointImpacts.length === 1, "exactly one impact found for the call site referencing the removed endpoint");
  assert(endpointImpacts[0]?.confidence === "high", "removed-endpoint impact is high confidence");
  assert(endpointImpacts[0]?.reason.includes("POST /v1/shipments/{id}/cancel"), "impact reason names the removed operation and path");
  const endpointTransform = applyGoTransforms(endpointSource, endpointRemovedChanges, "client.go");
  assert(endpointTransform.fixes.length === 0, "no auto-fix is ever attempted for a removed endpoint — there is no safe default replacement");
  assert(endpointTransform.content === endpointSource, "file is byte-for-byte unchanged");

  console.log("\nTest 7: ambiguous enum is not auto-applied, but agent-resolve can unblock it");
  const ambiguous = [
    { id: "rm1", kind: "enum-value-removed" as const, severity: "breaking" as const, path: "/charges", operation: "post", field: "status", before: "failed", summary: "x" },
    { id: "add1", kind: "enum-value-added" as const, severity: "additive" as const, path: "/charges", operation: "post", field: "status", after: "canceled", summary: "y" },
    { id: "add2", kind: "enum-value-added" as const, severity: "additive" as const, path: "/charges", operation: "post", field: "status", after: "declined", summary: "z" },
  ];
  const ambSource = 'func Check(c map[string]interface{}) bool {\n\treturn c["status"] == "failed"\n}\n';
  const ambResult = applyGoTransforms(ambSource, ambiguous, "pay.go");
  assert(ambResult.content.includes('"failed"'), "ambiguous enum literal is left in place");
  assert(ambResult.fixes.some((f) => !f.safe), "ambiguous enum is flagged unsafe");

  const agentResolutions = new Map([
    ["rm1", { target: "canceled", confidence: 0.9, reasoning: "vendor changelog: failed split into canceled/declined" }],
  ]);
  const agentResult = applyGoTransforms(ambSource, ambiguous, "pay.go", [], agentResolutions);
  assert(agentResult.content.includes('"canceled"'), "agent-resolved enum is rewritten to the proposed target");
  const agentFix = agentResult.fixes.find((f) => f.changeId === "rm1");
  assert(agentFix?.origin === "agent-proposed", "fix is labeled agent-proposed");
  assert(agentFix?.agentConfidence === 0.9, "fix carries the model's confidence");

  const badTarget = new Map([["rm1", { target: "not-a-real-candidate", confidence: 0.9, reasoning: "hallucinated" }]]);
  const badResult = applyGoTransforms(ambSource, ambiguous, "pay.go", [], badTarget);
  assert(badResult.content.includes('"failed"'), "a proposal outside the group's real candidates is rejected");

  console.log("\nTest 8: red-team — bare variables unrelated to the API are never touched");
  const unrelatedSource = `func WorkerStatus() string {
	status := "queued"
	if status == "queued" {
		processJob()
	}
	return status
}
`;
  const unrelatedResult = applyGoTransforms(unrelatedSource, enumChanges, "worker.go");
  assert(unrelatedResult.fixes.length === 0, "no fix fires for a same-named local variable with no traceable API origin");
  assert(unrelatedResult.content === unrelatedSource, "file is byte-for-byte unchanged");

  const tracedSource = `func Check(shipment map[string]interface{}) bool {
	status := shipment["status"].(string)
	return status == "queued"
}
`;
  const tracedResult = applyGoTransforms(tracedSource, enumChanges, "traced.go");
  assert(tracedResult.content.includes('== "pending"'), "a bare variable IS rewritten once traced back to a matching map-index access");

  console.log("\nTest 9: red-team — a map literal never used in a call is left alone");
  const unanchoredSource = `func unused() {
	record := map[string]interface{}{
		"originZip": "10001",
		"destZip":   "90001",
		"weightKg":  12.5,
		"carrier":   "ups",
	}
	_ = record
}
`;
  const unanchoredResult = applyGoTransforms(unanchoredSource, required, "inventory.go");
  assert(unanchoredResult.fixes.length === 0, "no fix is fabricated for a map literal that never flows to a call");
  assert(unanchoredResult.content === unanchoredSource, "file is byte-for-byte unchanged");

  console.log("\nTest 10: red-team — if/for/switch blocks are never misread as composite literals");
  const blockSource = `func Run(status string) {
	if status == "queued" {
		fmt.Println("queued")
	}
	for status == "queued" {
		poll()
	}
	switch status {
	case "queued":
		fmt.Println("case")
	}
}
`;
  const blockResult = applyGoTransforms(blockSource, enumChanges, "flow.go");
  assert(blockResult.fixes.length === 0, "bare-condition if/for/switch never match without a traceable origin");
  assert(blockResult.content === blockSource, "file is byte-for-byte unchanged");

  console.log("\nTest 11: red-team — a function returning map[string]interface{} doesn't confuse its own body for a literal");
  const funcReturnSource = `func InventoryRecord() map[string]interface{} {
	if true {
		return nil
	}
	return map[string]interface{}{"originZip": "1", "destZip": "2", "weightKg": 1.0, "carrier": "ups"}
}
`;
  const funcReturnResult = applyGoTransforms(funcReturnSource, required, "func_return.go");
  assert(validateGoSyntax(funcReturnResult.content).ok, "output stays syntactically valid Go");
  assert(funcReturnResult.content.includes("recipientEmail"), "the actual returned literal still gets the required field");

  console.log("\nTest 12: iota-based const enums are never touched (no string literal to match)");
  const iotaSource = "type Status int\n\nconst (\n\tStatusQueued Status = iota\n\tStatusShipped\n\tStatusDelivered\n)\n";
  const iotaResult = applyGoTransforms(iotaSource, enumChanges, "iota.go");
  assert(iotaResult.fixes.length === 0, "no string literal exists, so nothing is (mis)matched");
  assert(iotaResult.content === iotaSource, "file is byte-for-byte unchanged");

  console.log("\nTest 13: idempotency — running repair twice makes no further changes");
  const idemSource = `const BaseURL = "https://api.example.com/v1"

func IsQueued(record map[string]interface{}) bool {
	return record["status"] == "queued"
}
`;
  const allChanges = [...urlChange, ...enumChanges];
  const once = applyGoTransforms(idemSource, allChanges, "idem.go");
  const twice = applyGoTransforms(once.content, allChanges, "idem.go");
  assert(once.content === twice.content, "second pass produces no further edits");
  assert(twice.fixes.length === 0, "second pass reports no fixes");

  console.log("\nTest 14: shipping v2 Go consumers + validateInMemory");
  const changes = shippingChanges();
  const files = [
    { path: "fixtures/consumers/logistics-service/src/shipments_client.go", content: shipmentsGo },
    { path: "fixtures/consumers/logistics-service/src/order_flow.go", content: orderGo },
  ];
  const impacts = findImpactedCode(changes, files);
  assert(impacts.length > 0, "Go shipping consumers are impacted");

  const { fixes, updatedFiles } = generateFixes(changes, files, impacts);
  assert(fixes.every((f) => f.safe), "all generated Go fixes are safe");

  const updatedShipments = updatedFiles.find((f) => f.path.endsWith("shipments_client.go"))!;
  const updatedOrder = updatedFiles.find((f) => f.path.endsWith("order_flow.go"))!;
  assert(updatedShipments.content.includes("https://api.acme-shipping.com/v2"), "shipping base URL bumped to v2");
  assert(updatedShipments.content.includes('"pending"') && !updatedShipments.content.includes('"queued"'), "queued enum rewritten in Go client");
  assert(updatedOrder.content.includes("recipientEmail"), "required recipientEmail inserted into request map literal");
  assert(validateGoSyntax(updatedOrder.content).ok, "repaired order_flow.go still tokenizes as balanced Go");
  assert(validateGoSyntax(updatedShipments.content).ok, "repaired shipments_client.go still tokenizes as balanced Go");

  const inMemory = validateInMemory(updatedFiles);
  assert(inMemory.passed, "validateInMemory accepts repaired Go files");

  const brokenFiles = [{ path: "broken.go", content: 'const s = "unterminated\n' }];
  const brokenValidation = validateInMemory(brokenFiles);
  assert(!brokenValidation.passed, "unclosed Go string fails in-memory validation");

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
  console.log("==================================================\n");

  if (passedTests !== totalTests) process.exit(1);
}

main();
