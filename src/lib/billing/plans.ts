/** Canonical Free / Pro limits for Repairo SaaS. */
export type PlanId = "free" | "pro" | "team";

export type PlanLimits = {
  id: PlanId;
  name: string;
  priceLabel: string;
  /** Annual equivalent label shown in the annual billing toggle. */
  annualPriceLabel: string;
  priceCents: number;
  privateRepos: number; // For UI display
  integrations: number; // Max repos allowed
  runsPerMonth: number;
  seats: number;
  /** Short "For: …" audience line shown under the plan name. */
  for: string;
  /** Italic tagline shown under the price. */
  tagline: string;
  features: string[];
};

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    annualPriceLabel: "$0",
    priceCents: 0,
    privateRepos: 1,
    integrations: 1,
    runsPerMonth: 50,
    seats: 3,
    for: "solo devs and open source",
    tagline: "Evaluate Repairo\u2019s deterministic AST engine on your own code.",
    features: [
      "All public repositories",
      "1 private repository",
      "CLI + GitHub App",
      "Breaking-change detection",
      "Inline PR annotations & fix previews",
      "Community support (GitHub Discussions)",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$79",
    annualPriceLabel: "$790/yr",
    priceCents: 7900,
    privateRepos: 5,
    integrations: 5,
    runsPerMonth: 500,
    seats: 15,
    for: "growing engineering teams",
    tagline: "Automated API maintenance with production-ready fix PRs.",
    features: [
      "Up to 5 private repositories",
      "Compiler-validated fix PRs \u2014 never merged without your review",
      "Stripe, OpenAI & Supabase coverage",
      "Full codebase impact maps",
      "Email support",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceLabel: "$249",
    annualPriceLabel: "$2,490/yr",
    priceCents: 24900,
    privateRepos: 999999, // unlimited
    integrations: 999999,
    runsPerMonth: 999999,
    seats: 999999,
    for: "professional teams that need control",
    tagline: "Workflow controls and unlimited repos.",
    features: [
      "Unlimited private repositories",
      "Merge-blocking change gates",
      "Approval workflow & audit trail",
      "Slack notifications",
      "Priority support",
    ],
  },
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan === "team") return PLANS.team;
  if (plan === "pro") return PLANS.pro;
  return PLANS.free;
}
