/** Canonical Free / Pro limits for Repairo SaaS. */
export type PlanId = "free" | "pro" | "team";

export type PlanLimits = {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceCents: number;
  privateRepos: number; // For UI display
  integrations: number; // Max repos allowed
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
    privateRepos: 1,
    integrations: 1,
    runsPerMonth: 50,
    seats: 3,
    features: [
      "Public repos + 1 private repo",
      "CLI + GitHub App",
      "Breaking-change detection",
      "Inline PR annotations & fix previews",
      "Community support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$79",
    priceCents: 7900,
    privateRepos: 5,
    integrations: 5,
    runsPerMonth: 500,
    seats: 15,
    features: [
      "Up to 5 private repos",
      "Compiler-validated fix PRs",
      "Stripe, OpenAI, Supabase support",
      "Impact maps",
      "Email support",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceLabel: "$249",
    priceCents: 24900,
    privateRepos: 999999, // unlimited
    integrations: 999999,
    runsPerMonth: 999999,
    seats: 999999,
    features: [
      "Unlimited private repos",
      "Merge-blocking change gates",
      "Approval workflow & audit trail",
      "Slack integration",
      "+$10/dev/mo beyond 15 contributors",
    ],
  },
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan === "team") return PLANS.team;
  if (plan === "pro") return PLANS.pro;
  return PLANS.free;
}
