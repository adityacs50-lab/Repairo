/** Pricing-page FAQ. Shared plain module for UI + optional JSON-LD later. */
export type PricingFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const PRICING_FAQ: PricingFaqItem[] = [
  {
    id: "free-forever",
    question: "Is the free tier really free forever?",
    answer:
      "Yes. Public repos and 1 private repo, permanently. We grow when you grow \u2014 most teams upgrade the day their second private repo needs coverage.",
  },
  {
    id: "active-contributor",
    question: 'What counts as an "active contributor" on Team?',
    answer:
      "Anyone who opened a pull request or pushed commits in the last 30 days. People who don\u2019t touch the repos don\u2019t get billed \u2014 and you\u2019re prorated to the day.",
  },
  {
    id: "auto-merge",
    question: "Will Repairo ever auto-merge a fix into my code?",
    answer:
      "Never. Every fix PR is opened for human review with full evidence \u2014 the diff, the vendor changelog, and compiler validation. If a fix isn\u2019t 100% deterministic, we flag it instead of guessing.",
  },
  {
    id: "sixth-repo",
    question: "What happens when my 5th repo needs coverage on Pro?",
    answer:
      "You\u2019ll get a prompt at the moment you connect the 6th \u2014 upgrade to Team for unlimited repos, or manage which 5 are covered. No surprise charges, ever.",
  },
  {
    id: "code-storage",
    question: "Do you store our code?",
    answer:
      "No. Analysis runs in your CI or in volatile memory with zero disk persistence and zero retention. Security details are on our trust page.",
  },
  {
    id: "self-host",
    question: "Can I self-host?",
    answer:
      "The CLI is open source and runs fully offline today. A self-hosted enterprise license with SSO and SLAs is on the roadmap \u2014 talk to us.",
  },
];
