import { MarkdownDoc } from "@/components/docs/MarkdownDoc";
import { DocsShell, Section } from "@/components/docs/DocsShell";
import { loadRepoMarkdown } from "@/lib/load-repo-doc";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Engine architecture",
  description:
    "Repairo repair engine graph: runRepair orchestration, CLI vs hosted validation, and how OpenAPI diff flows into GitHub PRs.",
  path: "/docs/architecture",
  keywords: ["runRepair", "architecture", "validateInMemory", "validateCodebase"],
});

export default async function DocsArchitecturePage() {
  const markdown = await loadRepoMarkdown("docs/architecture.md");

  return (
    <DocsShell
      activePath="/docs/architecture"
      title="Engine architecture"
      description="Canonical diagram for the repair engine — shared by the CLI, hosted API, demo, and GitHub App."
      cta={{ href: "/docs", label: "Back to docs home" }}
    >
      <Section title="Reference">
        <MarkdownDoc markdown={markdown} />
      </Section>
    </DocsShell>
  );
}
