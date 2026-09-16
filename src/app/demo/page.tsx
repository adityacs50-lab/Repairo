import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";
import { SiteFooter } from "@/components/SiteFooter";
import { DemoWorkspace } from "@/components/DemoWorkspace";
import { githubConfigured } from "@/lib/auth/config";

export const metadata = pageMetadata({
  title: "Interactive demo",
  description:
    "Run the repair loop on sample specs in the browser — diff, impact, patch — no login. Then point the CLI or GitHub App at your repo.",
  path: "/demo",
  keywords: ["demo", "playground", "github app"],
});

export default function DemoPage() {
  return (
    <div>
      <SiteHeader active="demo" />
      <main className="demo-page-main">
        <div className="product-page-stack">
          <div className="demo-page-intro">
            <p className="eyebrow">Demo</p>
            <h1>Break an API on purpose. Watch the repair.</h1>
            <p>
              Bundled fixtures only — nothing leaves this tab. Hook up your repo via the GitHub App
              or CLI when you are ready.
            </p>
          </div>
          <DemoWorkspace showGitHubCta oauthConfigured={githubConfigured()} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
