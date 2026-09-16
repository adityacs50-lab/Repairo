import { buildLlmsTxt } from "@/lib/llms-content";

/** Extended llms.txt for AI tools that ingest longer context windows. */
export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt("full"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
