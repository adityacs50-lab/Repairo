import "server-only";
import { readFileSync } from "fs";
import { join } from "path";
import type { DemoScenarioId } from "@/lib/demo-scenarios";

/** Load fixture text with a statically scoped fixtures/ root for bundlers. */
export function readFixture(...parts: string[]): string {
  return readFileSync(join(process.cwd(), "fixtures", ...parts), "utf8");
}

export function loadScenarioFixtures(id: DemoScenarioId = "payments-ts") {
  if (id === "logistics-multi") {
    return {
      beforeSpec: readFixture("apis", "shipping-v1.openapi.yaml"),
      afterSpec: readFixture("apis", "shipping-v2.openapi.yaml"),
      consumerFiles: [
        {
          path: "fixtures/consumers/logistics-service/src/shipments-client.ts",
          content: readFixture("consumers", "logistics-service", "src", "shipments-client.ts"),
        },
        {
          path: "fixtures/consumers/logistics-service/src/shipments_client.py",
          content: readFixture("consumers", "logistics-service", "src", "shipments_client.py"),
        },
        {
          path: "fixtures/consumers/logistics-service/src/shipments_client.go",
          content: readFixture("consumers", "logistics-service", "src", "shipments_client.go"),
        },
      ],
    };
  }

  return {
    beforeSpec: readFixture("apis", "payments-v1.openapi.yaml"),
    afterSpec: readFixture("apis", "payments-v2.openapi.yaml"),
    consumerFiles: [
      {
        path: "fixtures/consumers/checkout-service/src/payments-client.ts",
        content: readFixture("consumers", "checkout-service", "src", "payments-client.ts"),
      },
      {
        path: "fixtures/consumers/checkout-service/src/checkout-flow.ts",
        content: readFixture("consumers", "checkout-service", "src", "checkout-flow.ts"),
      },
    ],
  };
}

export function loadDemoFixtures(scenario: DemoScenarioId = "payments-ts") {
  return loadScenarioFixtures(scenario);
}
