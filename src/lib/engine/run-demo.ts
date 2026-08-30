import { readFileSync } from "fs";
import { join } from "path";
import { runRepair } from "./index";

const root = process.cwd();

const beforeSpec = readFileSync(
  join(root, "fixtures/apis/payments-v1.openapi.yaml"),
  "utf8",
);
const afterSpec = readFileSync(
  join(root, "fixtures/apis/payments-v2.openapi.yaml"),
  "utf8",
);

const consumerFiles = [
  "fixtures/consumers/checkout-service/src/payments-client.ts",
  "fixtures/consumers/checkout-service/src/checkout-flow.ts",
].map((path) => ({
  path,
  content: readFileSync(join(root, path), "utf8"),
}));

const result = await runRepair({ beforeSpec, afterSpec, consumerFiles });

console.log(JSON.stringify(result.summary, null, 2));
console.log("\nPR:", result.pullRequest.title);
console.log("Branch:", result.pullRequest.branch);
console.log("Safety:", result.pullRequest.safetyScore);
console.log("Files:", result.pullRequest.files.map((f) => f.path).join(", "));
