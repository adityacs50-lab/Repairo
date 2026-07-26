import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DemoWorkspace } from "@/components/DemoWorkspace";

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
