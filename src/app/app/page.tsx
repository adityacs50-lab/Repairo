import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";
import { SiteFooter } from "@/components/SiteFooter";
import { AppWorkspace } from "@/components/AppWorkspace";

export const metadata = pageMetadata({
  title: "Workspace",
  description: "Repairo workspace: connect GitHub, watch vendor APIs, and review repair runs.",
  path: "/app",
  noIndex: true,
});

export default function AppPage() {
  return (
    <div className="site-shell">
      <SiteHeader active="app" />
      <main className="product-main">
        <div className="product-page-stack">
          <AppWorkspace />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
