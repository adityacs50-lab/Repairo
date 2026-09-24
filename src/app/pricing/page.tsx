import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PricingFaq, PricingSection } from "@/components/Pricing";
import Link from "next/link";

export default function PricingPage() {
  return (
    <main>
      <SiteHeader active="pricing" />

      {/* Page header */}
      <section className="pricing-hero section-rule">
        <p className="eyebrow">PRICING</p>
        <h1>Pricing that scales with your repos, not your headcount</h1>
        <p className="pricing-hero-lede">
          Repairo watches the APIs you depend on, and when Stripe, OpenAI, or
          Supabase ships a breaking change, it opens a compile-checked fix PR
          before your CI ever goes red.
        </p>
      </section>

      {/* ROI banner */}
      <section className="pricing-roi-banner section-rule">
        <p className="pricing-roi-copy">
          One 2&nbsp;a.m. incident from a vendor&rsquo;s silent breaking change
          costs more than a decade of Repairo.{" "}
          <strong>14-day trials start with your real repos and your real dependencies.</strong>
        </p>
      </section>

      {/* Plan cards + billing strip */}
      <section className="pricing-board section-rule">
        <PricingSection />
      </section>

      {/* FAQ */}
      <section className="pricing-faq-section section-rule">
        <PricingFaq />
      </section>

      {/* Fine print */}
      <section className="pricing-footnote section-rule">
        <p>
          Formal SOC 2 / ISO programs are on the roadmap — not claimed as
          complete today. Need a security questionnaire?{" "}
          <Link href="/contact" className="text-link inline-link">
            Contact us <span aria-hidden="true" className="arrow-mark">↗</span>
          </Link>
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
