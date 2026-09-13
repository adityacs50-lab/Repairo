import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PricingFaq, PricingSection } from "@/components/Pricing";
import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="site-shell">
      <SiteHeader active="pricing" />

      <section className="pricing-hero section-rule">
        <p className="eyebrow">PRICING</p>
        <h1>Simple, transparent pricing.</h1>
        <p className="pricing-hero-lede">
          Start free on the CLI. Upgrade when you need hosted watching, automated PRs, and team seats.
        </p>
      </section>

      <section className="pricing-board section-rule">
        <PricingSection />
      </section>

      <section className="pricing-faq-section section-rule">
        <PricingFaq />
      </section>

      <section className="pricing-footnote section-rule">
        <p>
          Formal SOC 2 / ISO programs are on the roadmap — not claimed as complete today.
          Need a security questionnaire?{" "}
          <Link href="/contact" className="text-link inline-link">
            Contact us <span aria-hidden="true" className="arrow-mark">↗</span>
          </Link>
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
