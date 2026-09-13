import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";

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
  price: string;
  priceNote?: string;
  description: string;
  cta: { href: string; label: string };
  features: string[];
  highlighted?: boolean;
};

const PLANS_UI: PlanBlock[] = [
  {
    id: "free",
    name: PLANS.free.name,
    price: PLANS.free.priceLabel,
    description: "Evaluate Repairo’s deterministic AST engine on a single repository.",
    cta: { href: "/docs", label: "Get started for free" },
    features: PLANS.free.features,
  },
  {
    id: "pro",
    name: PLANS.pro.name,
    price: PLANS.pro.priceLabel,
    priceNote: "/mo",
    description:
      "Automated API maintenance and PR generation for growing engineering teams.",
    cta: { href: "/#demo", label: "Book a demo" },
    features: PLANS.pro.features,
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description:
      "Custom deployment and compliance support for teams with strict InfoSec requirements.",
    cta: { href: "/contact", label: "Contact us" },
    features: ENTERPRISE_FEATURES,
  },
];

export function PricingSection() {
  return (
    <div className="plan-grid">
      {PLANS_UI.map((plan) => (
        <article
          key={plan.id}
          className={`plan-tier${plan.highlighted ? " plan-tier-featured" : ""}`}
        >
          <header className="plan-tier-head">
            <div className="plan-tier-title-row">
              <p className="mono-label">{plan.name}</p>
              {plan.highlighted && <span className="plan-badge">Popular</span>}
            </div>
            <p className="plan-price">
              {plan.price}
              {plan.priceNote ? (
                <span className="plan-price-note">{plan.priceNote}</span>
              ) : null}
            </p>
            <p className="plan-desc">{plan.description}</p>
          </header>

          <Link
            href={plan.cta.href}
            className={`button ${plan.highlighted ? "button-dark" : "button-light"} plan-cta`}
          >
            {plan.cta.label}
            <span aria-hidden="true" className="arrow-mark">
              ↗
            </span>
          </Link>

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
        </article>
      ))}
    </div>
  );
}
