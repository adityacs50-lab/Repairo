import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { listVendors } from "@/lib/catalog/vendors";

export const metadata: Metadata = {
  title: "Vendor agents — Repairo",
  description:
    "Install Dependabot-style update agents for Stripe, GitHub, and more.",
};

export default function AgentsIndexPage() {
  const vendors = listVendors();

  return (
    <ContentPage
      eyebrow="Marketplace"
      title="Vendor agents"
      description="Install a per-provider update agent — or use Repairo as the neutral plane across vendors. Each agent watches public OpenAPI and opens PRs in your repos."
      activeHref="/agents"
      wide
      cta={{ href: "/app?tab=agents", label: "Open app to install" }}
    >
      <div className="grid gap-px bg-line sm:grid-cols-2">
        {vendors.map((v) => (
          <article key={v.id} className="flex flex-col bg-bg px-5 py-6 sm:px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-dim">
              {v.tags.join(" · ")}
            </p>
            <h2 className="mt-2 text-lg font-medium text-fg">{v.name}</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
              {v.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/agents/${v.id}`} className="btn-primary !py-2 !text-sm">
                Install {v.name} agent
              </Link>
              <a
                href={v.homepage}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost !py-2 !text-sm"
              >
                Docs
              </a>
            </div>
          </article>
        ))}
      </div>
    </ContentPage>
  );
}
