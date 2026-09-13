import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";
import { SiteFooter } from "@/components/SiteFooter";
import { DemoWorkspace } from "@/components/DemoWorkspace";

export const metadata = pageMetadata({
  title: "Interactive demo",
  description:
    "Try Repairo in the browser: diff a breaking OpenAPI change, see the impacted TypeScript call sites, and preview the compiler-validated AST repair diff.",
  path: "/demo",
  keywords: ["demo", "playground"],
});

export default function DemoPage() {
  return (
    <div className="site-shell">
      <SiteHeader active="demo" />
      <main className="demo-page-main">
        <div className="demo-page-intro">
          <p className="eyebrow">INTERACTIVE DEMO</p>
          <h1>See a breaking change become a repair.</h1>
          <p>
            Diff a fixture OpenAPI change, inspect impacted TypeScript call sites, and preview the compiler-validated AST patch.
          </p>
        </div>
        <DemoWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
