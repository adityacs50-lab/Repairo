import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Blog — Repairo",
  description: "Thoughts on ASTs, OpenAPI, and automating breaking changes.",
};

const POSTS = [
  {
    title: "How we built a deterministic AST engine to fix breaking changes",
    slug: "how-we-built-the-ast-engine",
    date: "August 12, 2026",
    excerpt: "Building a string-replacement tool is easy. Building an Abstract Syntax Tree transformer that understands TypeScript safely is hard. Here is how we did it.",
  }
];

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-canvas text-body font-sans selection:bg-ink selection:text-canvas overflow-x-hidden flex flex-col">
      <SiteHeader active="resources" />

      <main className="w-full flex-grow flex flex-col items-center py-[64px] md:py-[120px]">
        <section className="px-[24px] w-full max-w-[800px] mx-auto">
          <div className="flex flex-col gap-[16px] mb-[64px]">
            <div className="font-mono text-[14px] uppercase tracking-[1.4px] text-ink">
              Blog
            </div>
            <h1 className="text-[48px] md:text-[64px] leading-[1] font-normal tracking-[-1.2px] md:tracking-[-2px] text-ink">
              Engineering Notes.
            </h1>
            <p className="text-[18px] md:text-[24px] text-body-mid leading-[1.5] max-w-[600px] mt-[16px]">
              Deep dives into API drift, Abstract Syntax Trees, and how to stop breaking production.
            </p>
          </div>

          <div className="flex flex-col border-t border-hairline">
            {POSTS.map((post) => (
              <article key={post.slug} className="py-[32px] border-b border-hairline flex flex-col gap-[12px] group">
                <div className="font-mono text-[12px] uppercase tracking-[1.2px] text-body-mid">
                  {post.date}
                </div>
                <Link href={`/blog/${post.slug}`} className="block">
                  <h2 className="text-[24px] md:text-[32px] font-medium tracking-[-0.5px] text-ink group-hover:underline decoration-hairline underline-offset-4">
                    {post.title}
                  </h2>
                </Link>
                <p className="text-[16px] text-body-mid leading-[1.6]">
                  {post.excerpt}
                </p>
                <Link href={`/blog/${post.slug}`} className="text-ink font-medium mt-[8px] flex items-center gap-[4px] hover:underline decoration-hairline underline-offset-4 w-fit">
                  Read post →
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
