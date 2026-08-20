import Link from "next/link";
import { ContentPage, Section } from "@/components/ContentPage";
import { JsonLd } from "@/components/JsonLd";
import { formatPostDate, requireBlogPost } from "@/lib/blog";
import { articleJsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

// Slug must match this route folder name.
const post = requireBlogPost("how-we-built-the-ast-engine");

export const metadata = pageMetadata({
  title: post.title,
  description: post.description,
  path: `/blog/${post.slug}`,
  type: "article",
  publishedTime: post.datePublished,
  modifiedTime: post.dateModified,
  keywords: ["AST engine", "ts-morph", "TypeScript compiler API", "codemod"],
});

export default function BlogPost() {
  return (
    <>
    <JsonLd
      data={[
        articleJsonLd({
          title: post.title,
          description: post.description,
          path: `/blog/${post.slug}`,
          datePublished: post.datePublished,
          dateModified: post.dateModified,
        }),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ]),
      ]}
    />
    <ContentPage
      eyebrow={`${formatPostDate(post)} • ${post.category}`}
      title={post.title}
      description="Building a string-replacement tool is easy. Building an Abstract Syntax Tree transformer that understands TypeScript safely is hard. Here is how we did it."
      activeHref="/blog"
    >
      <Section title="The Naive Approach: Regex">
        <p>
          When we first set out to build Repairo, the goal was simple: if an API vendor changes `client.createCharge()` to `client.charges.create()`, we should just find and replace it in the consumer's codebase.
        </p>
        <p>
          We quickly realized that regular expressions are fundamentally incapable of understanding code structure. What if the user imported the client under an alias? What if the variable was passed through three different wrapper functions? Regex would either miss the call site entirely or, worse, blindly replace a string inside a completely unrelated comment.
        </p>
      </Section>
      <Section title="Enter the Abstract Syntax Tree (AST)">
        <p>
          To manipulate code safely, you have to understand it the way the compiler does. We rebuilt the core engine using the TypeScript compiler API to parse the consumer repository into an Abstract Syntax Tree.
        </p>
        <p>
          An AST represents the hierarchical structure of the code. Instead of looking for the string `"client.createCharge"`, we look for a `CallExpression` where the `expression` is a `PropertyAccessExpression` referencing the specific imported type from the vendor's SDK.
        </p>
      </Section>
      <Section title="Diffing OpenAPI to generate AST Transforms">
        <p>
          The real magic happens in the bridge between OpenAPI and the AST. When Repairo detects a breaking change in an OpenAPI spec (e.g., a required field is added to a payload), it generates a structural patch map.
        </p>
        <p>
          We map the HTTP path and schema change to the corresponding auto-generated SDK method. Our AST engine then walks the tree, finds every `CallExpression` for that method, and structurally modifies the `ObjectLiteralExpression` representing the arguments, injecting the new required field with a `TODO` comment or a safe default.
        </p>
      </Section>
      <Section title="Why this matters">
        <p>
          Because we manipulate the AST, we guarantee that the output is syntactically valid. We preserve the user's formatting, their comments, and their scope. 
        </p>
        <p>
          By taking the hard path, Repairo doesn't just guess at refactors—it calculates them deterministically.
        </p>
      </Section>
      
      <div className="mt-[64px] pt-[32px] border-t border-hairline flex flex-col sm:flex-row justify-between items-start sm:items-center gap-[16px]">
        <Link href="/blog" className="text-ink hover:underline decoration-hairline underline-offset-4 font-medium flex items-center gap-[8px]">
          ← Back to Blog
        </Link>
        <Link href="/app" className="bg-ink text-canvas px-[16px] py-[8px] rounded-full text-[14px] font-medium hover:opacity-90 transition-opacity">
          Try Repairo for free
        </Link>
      </div>
    </ContentPage>
    </>
  );
}
