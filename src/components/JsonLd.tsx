import { serializeJsonLd, type JsonLdObject } from "@/lib/seo";

/** Renders one or more schema.org JSON-LD objects. Safe in server and client components. */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
