import { buildLlmsTxt } from "@/lib/llms-content";

/**
 * llms.txt — answer-engine-friendly product summary (https://llmstxt.org).
 * Also linked from robots.txt, sitemap, and site footer for discovery.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt("standard"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
