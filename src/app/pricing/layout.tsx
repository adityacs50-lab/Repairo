import { JsonLd } from "@/components/JsonLd";
import { PLANS } from "@/lib/billing/plans";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Pricing",
  description: `Repairo pricing: ${PLANS.free.name} plan at ${PLANS.free.priceLabel} for local CLI scanning and ${PLANS.free.runsPerMonth} repair runs/month; ${PLANS.pro.name} plan at ${PLANS.pro.priceLabel}/month for background OpenAPI polling, automatic repair PRs, and team seats. Enterprise plans available.`,
  path: "/pricing",
  keywords: ["pricing", "free tier", "pro plan"],
});

const offerCatalog = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: SITE_NAME,
  url: absoluteUrl("/pricing"),
  description: "Automated breaking-API-change detection and compiler-validated AST repair PRs.",
  brand: { "@type": "Brand", name: SITE_NAME },
  offers: Object.values(PLANS).map((plan) => ({
    "@type": "Offer",
    name: `${plan.name} plan`,
    price: (plan.priceCents / 100).toFixed(2),
    priceCurrency: "USD",
    url: absoluteUrl("/pricing"),
    availability: "https://schema.org/InStock",
    description: plan.features.join(". "),
  })),
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={[
          offerCatalog,
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Pricing", path: "/pricing" },
          ]),
        ]}
      />
      {children}
    </>
  );
}
