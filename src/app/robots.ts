import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

/**
 * Allow search and AI crawlers on marketing content; block API and authenticated app shells.
 * Individual pages set noindex via metadata where needed (/app, /results).
 */
export default function robots(): MetadataRoute.Robots {
  const sharedDisallow = ["/api/", "/app", "/results"];

  const aiAgents = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot",
    "anthropic-ai",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
    "Bytespider",
    "CCBot",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: sharedDisallow,
      },
      ...aiAgents.map((userAgent) => ({
        userAgent,
        allow: ["/", "/llms.txt", "/llms-full.txt", "/ai.txt", "/docs"],
        disallow: sharedDisallow,
      })),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
