import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";
import { SiteFooter } from "@/components/SiteFooter";
import { DemoWorkspace } from "@/components/DemoWorkspace";
import { githubConfigured } from "@/lib/auth/config";

export const metadata = pageMetadata({
  title: "Interactive demo",
  description:
    "Try Repairo in the browser: diff a breaking OpenAPI change, see impacted call sites in TypeScript, Python, and Go, and preview compiler-validated repair diffs — then install the GitHub App on your repo.",
  path: "/demo",
  keywords: ["demo", "playground", "github app"],
});

export default function DemoPage() {
  return (
    <div className="site-shell">
      <SiteHeader active="demo" />
      <main className="demo-page-main">
        <div className="product-page-stack">
          <div className="demo-page-intro">
            <p className="eyebrow">INTERACTIVE DEMO</p>
            <h1>See a breaking OpenAPI change become a repair.</h1>
            <p>
              Sample specs and client files — no sign-in. When you want this on your repository,
              install the GitHub App or sign in for Quick Repair from the workspace.
            </p>
          </div>
          <DemoWorkspace showGitHubCta oauthConfigured={githubConfigured()} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
