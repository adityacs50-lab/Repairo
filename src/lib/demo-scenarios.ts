import { readFixture } from "@/lib/fixtures";

export type DemoScenarioId = "payments-ts" | "logistics-multi";

export type DemoScenarioMeta = {
  id: DemoScenarioId;
  label: string;
  languages: string;
  description: string;
};

export const DEMO_SCENARIOS: DemoScenarioMeta[] = [
  {
    id: "payments-ts",
    label: "Payments API",
    languages: "TypeScript",
    description: "Stripe-style breaking change on checkout consumers (default).",
  },
  {
    id: "logistics-multi",
    label: "Shipping API",
    languages: "TypeScript · Python · Go",
    description: "Same contract drift repaired across three consumer languages.",
  },
];

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

export function parseScenarioId(raw: string | null | undefined): DemoScenarioId {
  if (raw === "logistics-multi") return "logistics-multi";
  return "payments-ts";
}
