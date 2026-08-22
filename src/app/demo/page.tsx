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
    <div className="unkey-canvas min-h-screen">
      <SiteHeader active="demo" />
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8">
        <DemoWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
