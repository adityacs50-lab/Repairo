import "server-only";
import type { DemoScenarioId } from "@/lib/demo-scenarios";
import { readFixture } from "@/lib/read-fixture";

export { readFixture };

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
