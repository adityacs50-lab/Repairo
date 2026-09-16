import { MarkdownDoc } from "@/components/docs/MarkdownDoc";
import { DocsShell, Section } from "@/components/docs/DocsShell";
import { loadRepoMarkdown } from "@/lib/load-repo-doc";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Deploy on Vercel",
  description:
    "Production deployment for heyrepairo.in: Neon Postgres, GitHub OAuth, environment variables, Stripe billing, and smoke tests.",
  path: "/docs/deploy",
  keywords: ["Vercel", "Neon", "DATABASE_URL", "self-host"],
});

export default async function DocsDeployPage() {
  const markdown = await loadRepoMarkdown("DEPLOY.md");

  return (
    <DocsShell
      activePath="/docs/deploy"
      title="Self-host on Vercel"
      description="Run the same Next.js app as production: UI, /api routes, OAuth, and webhooks on one Vercel project with Neon Postgres."
      cta={{ href: "/app", label: "Open hosted workspace" }}
    >
      <Section title="Deploy guide">
        <p>
          This page mirrors <code className="docs-inline-code">DEPLOY.md</code> in the repository.
          Update the file in git to keep production docs in sync.
        </p>
        <MarkdownDoc markdown={markdown} />
      </Section>
    </DocsShell>
  );
}
