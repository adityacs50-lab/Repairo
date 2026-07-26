import { readFileSync } from "fs";
import { join } from "path";

/** Load fixture text with a statically scoped fixtures/ root for bundlers. */
export function readFixture(...parts: string[]): string {
  return readFileSync(join(process.cwd(), "fixtures", ...parts), "utf8");
}

export function loadDemoFixtures() {
  return {
    beforeSpec: readFixture("apis", "payments-v1.openapi.yaml"),
    afterSpec: readFixture("apis", "payments-v2.openapi.yaml"),
    consumerFiles: [
      {
        path: "fixtures/consumers/checkout-service/src/payments-client.ts",
        content: readFixture(
          "consumers",
          "checkout-service",
          "src",
          "payments-client.ts",
        ),
      },
      {
        path: "fixtures/consumers/checkout-service/src/checkout-flow.ts",
        content: readFixture(
          "consumers",
          "checkout-service",
          "src",
          "checkout-flow.ts",
        ),
      },
    ],
  };
}
