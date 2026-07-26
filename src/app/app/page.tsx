import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AppWorkspace } from "@/components/AppWorkspace";

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
