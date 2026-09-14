/** Client-safe demo scenario metadata (no Node fs). */

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

export function parseScenarioId(raw: string | null | undefined): DemoScenarioId {
  if (raw === "logistics-multi") return "logistics-multi";
  return "payments-ts";
}
