import { HomePage } from "@/components/HomePage";
import { FAQ_LIST } from "@/lib/faq";
import { JsonLd } from "@/components/JsonLd";
import { PUBLIC_MARKETING_ROUTES } from "@/lib/public-routes";
import {
  faqPageJsonLd,
  pageMetadata,
  SITE_DESCRIPTION,
  SITE_TAGLINE,
  softwareApplicationJsonLd,
  softwareSourceCodeJsonLd,
  siteNavigationJsonLd,
} from "@/lib/seo";

export const metadata = pageMetadata({
  title: SITE_TAGLINE,
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: ["Repairo", "heyrepairo", "API repair", "OpenAPI", "repairo-cli"],
});

// Server wrapper: structured data is computed once on the server (env-dependent
// URLs are not available in the client bundle) and never re-serialized on re-render.
export default function Page() {
  const navItems = PUBLIC_MARKETING_ROUTES.map((r) => ({
    name: r.label,
    path: r.path,
    description: r.description,
  }));

  return (
    <>
      <JsonLd
        data={[
          softwareApplicationJsonLd(),
          softwareSourceCodeJsonLd(),
          siteNavigationJsonLd(navItems),
          faqPageJsonLd(
            FAQ_LIST.map((item) => ({
              question: item.question,
              answer: item.answer,
            })),
          ),
        ]}
      />
      <HomePage />
    </>
  );
}
