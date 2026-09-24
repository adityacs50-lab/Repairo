"use client";

import Link from "next/link";
import { useState } from "react";
import { PLANS } from "@/lib/billing/plans";
import { PRICING_FAQ } from "@/lib/pricing-faq";

const ENTERPRISE_FEATURES = [
  "Private API specs & custom vendors",
  "Isolated VPC / self-hosted runner",
  "SSO / RBAC (Entra ID or Okta)",
  "Security questionnaire support",
  "Custom SLAs & dedicated channel",
];

type PlanBlock = {
  id: string;
  name: string;
  badge?: string;
  for: string;
  price: string;
  annualPrice?: string;
  priceNote?: string;
  tagline: string;
  teamNote?: string;
  ctaMonthly: { href: string; label: string };
  ctaAnnual?: { href: string; label: string };
  ctaFootnote?: string;
  features: string[];
  highlighted?: boolean;
};

const PLANS_UI: PlanBlock[] = [
  {
    id: "free",
    name: PLANS.free.name,
    for: PLANS.free.for,
    price: PLANS.free.priceLabel,
    annualPrice: PLANS.free.annualPriceLabel,
    priceNote: " forever",
    tagline: PLANS.free.tagline,
    ctaMonthly: { href: "/docs", label: "Get started for free" },
    ctaFootnote: "No credit card. Install in under 5 minutes.",
    features: PLANS.free.features,
  },
  {
    id: "pro",
    name: PLANS.pro.name,
    badge: "Popular",
    for: PLANS.pro.for,
    price: PLANS.pro.priceLabel,
    annualPrice: PLANS.pro.annualPriceLabel,
    priceNote: "/mo per org",
    tagline: PLANS.pro.tagline,
    ctaMonthly: { href: "/#demo", label: "Start 14-day Pro trial" },
    ctaAnnual: { href: "/#demo", label: "Start 14-day Pro trial" },
    ctaFootnote: "No credit card required. One-click upgrade from Free.",
    features: PLANS.pro.features,
    highlighted: true,
  },
  {
    id: "team",
    name: PLANS.team.name,
    for: PLANS.team.for,
    price: PLANS.team.priceLabel,
    annualPrice: PLANS.team.annualPriceLabel,
    priceNote: "/mo per org",
    tagline: PLANS.team.tagline,
    teamNote:
      "Teams with more than 15 active contributors (a PR in the last 30 days) add \u00a410 per active dev/month. Dormant teammates never count.",
    ctaMonthly: { href: "/#demo", label: "Start 14-day Team trial" },
    ctaAnnual: { href: "/#demo", label: "Start 14-day Team trial" },
    features: PLANS.team.features,
  },
];

export function PricingToggle({
  annual,
  onToggle,
}: {
  annual: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="pricing-toggle" role="group" aria-label="Billing period">
      <button
        className={`pricing-toggle-btn${!annual ? " pricing-toggle-active" : ""}`}
        onClick={() => annual && onToggle()}
        aria-pressed={!annual}
      >
        Monthly
      </button>
      <button
        className={`pricing-toggle-btn${annual ? " pricing-toggle-active" : ""}`}
        onClick={() => !annual && onToggle()}
        aria-pressed={annual}
      >
        Annual&nbsp;
        <span className="pricing-toggle-save">save 17%</span>
      </button>
    </div>
  );
}

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="pricing-board-inner">
      <PricingToggle annual={annual} onToggle={() => setAnnual((a) => !a)} />

      <div className="plan-grid">
        {PLANS_UI.map((plan) => {
          const cta = annual && plan.ctaAnnual ? plan.ctaAnnual : plan.ctaMonthly;
          const displayPrice = annual && plan.annualPrice ? plan.annualPrice : plan.price;
          const displayNote = annual && plan.annualPrice ? "" : plan.priceNote;

          return (
            <article
              key={plan.id}
              className={`plan-tier${plan.highlighted ? " plan-tier-featured" : ""}`}
            >
              <header className="plan-tier-head">
                <div className="plan-tier-title-row">
                  <p className="mono-label">{plan.name}</p>
                  {plan.badge && <span className="plan-badge">{plan.badge}</span>}
                </div>
                <p className="plan-for">For: {plan.for}</p>
                <p className="plan-price">
                  {displayPrice}
                  {displayNote ? (
                    <span className="plan-price-note">{displayNote}</span>
                  ) : null}
                </p>
                {annual && plan.annualPrice && plan.id !== "free" && (
                  <p className="plan-annual-equiv">
                    {plan.priceNote?.includes("per org") ? plan.annualPrice : null}
                  </p>
                )}
                <p className="plan-tagline">{plan.tagline}</p>
              </header>

              <Link
                href={cta.href}
                className={`button ${plan.highlighted ? "button-dark" : "button-light"} plan-cta`}
              >
                {cta.label}
                <span aria-hidden="true" className="arrow-mark">
                  ↗
                </span>
              </Link>

              {plan.ctaFootnote && (
                <p className="plan-cta-footnote">{plan.ctaFootnote}</p>
              )}

              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span className="plan-check" aria-hidden="true">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.teamNote && (
                <p className="plan-team-note">{plan.teamNote}</p>
              )}
            </article>
          );
        })}
      </div>

      <BillingStrip />
    </div>
  );
}

function BillingStrip() {
  return (
    <div className="billing-strip">
      <p className="billing-strip-copy">
        <strong>Billed through GitHub Marketplace.</strong> One click from
        inside GitHub, added to your existing org invoice, cancel anytime. We
        never see your card. Your code never leaves your CI \u2014 detection
        runs on your infrastructure, not ours.
      </p>
    </div>
  );
}

export function PricingFaq() {
  return (
    <div className="pricing-faq">
      <div className="section-intro pricing-faq-intro">
        <p className="eyebrow">FAQ</p>
        <h2>Pricing questions, answered.</h2>
        <p>Clear limits, honest compliance status, and when Free is enough.</p>
      </div>
      <div className="pricing-faq-list">
        {PRICING_FAQ.map((item) => (
          <details key={item.id} className="pricing-faq-item">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
