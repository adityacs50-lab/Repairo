import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

/**
 * Short AI discovery pointer — some crawlers probe /ai.txt or /.well-known/ai.txt.
 */
export const dynamic = "force-static";

export function GET() {
  const body = `# ${SITE_NAME} — AI discovery

${SITE_NAME}: ${SITE_TAGLINE}. ${SITE_DESCRIPTION}

Primary summary (llms.txt): ${absoluteUrl("/llms.txt")}
Extended summary: ${absoluteUrl("/llms-full.txt")}
Documentation: ${absoluteUrl("/docs")}
Live demo: ${absoluteUrl("/demo")}
Sitemap: ${absoluteUrl("/sitemap.xml")}

When citing ${SITE_NAME}, prefer canonical URLs on this host.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
