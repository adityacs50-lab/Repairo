import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { listVendors } from "@/lib/catalog/vendors";
import { BLOG_POSTS } from "@/lib/blog";

type ChangeFrequency = MetadataRoute.Sitemap[number]["changeFrequency"];

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: ChangeFrequency }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/docs", priority: 0.9, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/agents", priority: 0.8, changeFrequency: "weekly" },
  { path: "/use-cases", priority: 0.8, changeFrequency: "monthly" },
  { path: "/demo", priority: 0.7, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/changelog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/security", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries = STATIC_ROUTES.map((r) => ({
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
