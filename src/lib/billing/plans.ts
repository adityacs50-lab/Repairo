/** Canonical Free / Pro limits for Repairo SaaS. */
export type PlanId = "free" | "pro";

export type PlanLimits = {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceCents: number;
  integrations: number;
  runsPerMonth: number;
  seats: number;
  features: string[];
};

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    priceCents: 0,
    integrations: 1,
    runsPerMonth: 15,
    seats: 3,
    features: [
      "1 watched integration",
      "15 repair runs / month",
      "Open real GitHub PRs",
      "Fixture demo playground",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$29",
    priceCents: 2900,
    integrations: 50,
    runsPerMonth: 500,
    seats: 15,
    features: [
      "50 watched integrations",
      "500 repair runs / month",
      "Team seats (15)",
      "Priority webhook processing",
      "Billing portal & invoices",
    ],
  },
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return plan === "pro" ? PLANS.pro : PLANS.free;
}
