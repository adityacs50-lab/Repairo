/** Pricing-page FAQ. Shared plain module for UI + optional JSON-LD later. */
export type PricingFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const PRICING_FAQ: PricingFaqItem[] = [
  {
    id: "free-vs-pro-vs-team",
    question: "What’s included in the different plans?",
    answer:
      "Free covers public repos plus 1 private repo, including breaking-change detection and PR previews. Pro ($79/mo) unlocks up to 5 private repos and adds compiler-validated fix PRs. Team ($249/mo) provides unlimited private repos, merge-blocking gates, and advanced audit trails.",
  },
  {
    id: "cli-free",
    question: "Is the CLI free forever?",
    answer:
      "Yes. The open-source CLI (Apache-2.0 on npm as repairo-cli) stays free for local scan, check, and repair. Hosted watching, automated PRs at scale, and team seats are what the paid plans cover.",
  },
  {
    id: "when-upgrade",
    question: "When should we upgrade?",
    answer:
      "Stay on Free while you prove the repair path on your public repos or a single private repo. Upgrade to Pro when you need to cover more private repos or want compiler-validated fix PRs.",
  },
  {
    id: "billing",
    question: "How does billing work?",
    answer:
      "We bill a flat rate per organization — predictable and transparent, with no usage spikes. Payment is handled simply through Stripe or GitHub Marketplace.",
  },
  {
    id: "soc2",
    question: "Do you have SOC 2?",
    answer:
      "Not yet. Formal SOC 2 / ISO programs are on the roadmap and not claimed as complete. We can work through your security questionnaire today — see /security or contact us.",
  },
];
