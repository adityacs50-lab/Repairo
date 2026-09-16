import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Documentation",
  description:
    "Production docs for Repairo: repairo-cli quickstart, command reference, OpenAPI diffing, GitHub App and OAuth, engine architecture, and Vercel self-hosting.",
  path: "/docs",
  keywords: [
    "repairo-cli",
    "OpenAPI diffing",
    "ts-morph",
    "quickstart",
    "self-host",
    "GitHub App",
  ],
});

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
