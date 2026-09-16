import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { BLOG_POSTS, formatPostDate } from "@/lib/blog";
import { ContentPage } from "@/components/ContentPage";

export const metadata = pageMetadata({
  title: "Blog",
  description:
    "Engineering writing from Repairo on ASTs, OpenAPI diffing, SDK migrations, and automating breaking API changes.",
  path: "/blog",
});

const POSTS = BLOG_POSTS.map((p) => ({
  title: p.title,
  slug: p.slug,
  date: formatPostDate(p),
  excerpt: p.description,
}));

export default function BlogIndex() {
  return (
    <ContentPage
      eyebrow="Blog"
      title="Engineering notes."
      description="Notes on API drift, AST repairs, and keeping client code in sync with OpenAPI."
      cta={{ href: "/docs", label: "Read the docs" }}
    >
      <ul className="blog-index-list">
        {POSTS.map((post) => (
          <li key={post.slug} className="blog-index-item">
            <time className="blog-index-date" dateTime={post.date}>{post.date}</time>
            <h2 className="blog-index-title">
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p className="blog-index-excerpt">{post.excerpt}</p>
            <Link className="text-link blog-index-read" href={`/blog/${post.slug}`}>
              Read post <span className="arrow-mark" aria-hidden="true">↗</span>
            </Link>
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}
