import { HomePage } from "@/components/HomePage";
import { FAQ_LIST } from "@/lib/faq";
import { JsonLd } from "@/components/JsonLd";
import { faqPageJsonLd, softwareApplicationJsonLd } from "@/lib/seo";

// Server wrapper: structured data is computed once on the server (env-dependent
// URLs are not available in the client bundle) and never re-serialized on re-render.
export default function Page() {
  return (
    <>
      <JsonLd data={[softwareApplicationJsonLd(), faqPageJsonLd(FAQ_LIST)]} />
      <HomePage />
    </>
  );
}
