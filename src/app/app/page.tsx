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
    <div className="unkey-canvas min-h-screen">
      <SiteHeader active="app" />
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8">
        <AppWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
