import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Documentation",
  description:
    "Repairo docs: install repairo-cli, scan your codebase for vendor SDK usage, diff OpenAPI specs to detect breaking changes, and apply compiler-validated AST repairs or open GitHub PRs.",
  path: "/docs",
  keywords: ["repairo-cli", "OpenAPI diffing", "ts-morph", "quickstart"],
});

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
