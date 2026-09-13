/** Pricing-page FAQ. Shared plain module for UI + optional JSON-LD later. */
export type PricingFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const PRICING_FAQ: PricingFaqItem[] = [
  {
    id: "free-vs-pro",
    question: "What’s included on Free vs Pro?",
    answer:
      "Free covers one watched integration, 15 repair runs per month, and real GitHub PRs so you can evaluate the loop end-to-end. Pro raises that to 50 integrations, 500 runs per month, 15 seats, priority webhook processing, and a Stripe billing portal with invoices.",
  },
  {
    id: "cli-free",
    question: "Is the CLI free forever?",
    answer:
      "Yes. The open-source CLI (Apache-2.0 on npm as repairo-cli) stays free for local scan, check, and repair. Hosted watching, automated PRs at scale, and team seats are what the Pro plan pays for.",
  },
  {
    id: "when-upgrade",
    question: "When should we upgrade?",
    answer:
      "Stay on Free while you prove the repair path on one vendor. Upgrade when you want continuous watching across more integrations, higher monthly run volume, or more engineers in the same workspace.",
  },
  {
    id: "billing",
    question: "How does billing work?",
    answer:
      "Pro is $29/month via Stripe. You can manage payment method, invoices, and cancellation in the billing portal. Enterprise is custom — contact us for VPC, SSO, and private specs.",
  },
  {
    id: "soc2",
    question: "Do you have SOC 2?",
    answer:
      "Not yet. Formal SOC 2 / ISO programs are on the roadmap and not claimed as complete. We can work through your security questionnaire today — see /security or contact us.",
  },
];
