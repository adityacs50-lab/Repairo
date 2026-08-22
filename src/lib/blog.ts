/** Blog post registry — drives /blog, the sitemap, and Article structured data. */
export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  datePublished: string; // ISO date
  dateModified?: string;
  category: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-we-built-the-ast-engine",
    title: "How we built a deterministic AST engine to fix breaking changes",
    description:
      "Why regex can't safely migrate SDK calls, and how Repairo uses the TypeScript compiler API and ts-morph to generate compiler-validated AST repairs for breaking API changes.",
    datePublished: "2026-08-12",
    category: "Engineering",
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/** Human-readable publish date, e.g. "August 12, 2026". */
export function formatPostDate(post: BlogPost): string {
  return new Date(`${post.datePublished}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Strict lookup for pages that must correspond to a registry entry. */
export function requireBlogPost(slug: string): BlogPost {
  const post = getBlogPost(slug);
  if (!post) {
    throw new Error(
      `Blog post "${slug}" is not registered in src/lib/blog.ts (BLOG_POSTS). Add it there or fix the slug.`,
    );
  }
  return post;
}
