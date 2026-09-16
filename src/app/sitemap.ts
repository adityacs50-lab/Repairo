import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { listVendors } from "@/lib/catalog/vendors";
import { BLOG_POSTS } from "@/lib/blog";
import { PUBLIC_MARKETING_ROUTES } from "@/lib/public-routes";

type ChangeFrequency = MetadataRoute.Sitemap[number]["changeFrequency"];

/** AI discovery endpoints — plain text, high crawl value for answer engines. */
const DISCOVERY_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: ChangeFrequency;
}[] = [
  { path: "/llms.txt", priority: 0.95, changeFrequency: "weekly" },
  { path: "/llms-full.txt", priority: 0.9, changeFrequency: "weekly" },
  { path: "/ai.txt", priority: 0.85, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries = [...PUBLIC_MARKETING_ROUTES, ...DISCOVERY_ROUTES].map((r) => ({
    url: absoluteUrl(r.path),
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const vendorEntries = listVendors().map((v) => ({
    url: absoluteUrl(`/agents/${v.id}`),
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const blogEntries = BLOG_POSTS.map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: new Date(p.dateModified ?? p.datePublished),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...vendorEntries, ...blogEntries];
}
