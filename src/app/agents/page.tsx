import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { ContentPage } from "@/components/ContentPage";
import { listVendors } from "@/lib/catalog/vendors";

export const metadata = pageMetadata({
  title: "Vendor update agents",
  description:
    "Install Dependabot-style update agents that watch Stripe, OpenAI, Supabase, Clerk, Gemini, and Anthropic OpenAPI specs and open AST repair PRs when breaking changes ship.",
  path: "/agents",
  keywords: ["vendor agents", "Stripe API changes", "OpenAI API changes"],
});

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
      <div className="agent-grid">
        {vendors.map((v) => (
          <article key={v.id} className="agent-card">
            <p className="mono-label">{v.tags.join(" · ")}</p>
            <h2>{v.name}</h2>
            <p>{v.description}</p>
            <div className="agent-card-actions">
              <Link href={`/agents/${v.id}`} className="button button-dark button-small">
                Install {v.name}
                <span aria-hidden="true" className="arrow-mark">↗</span>
              </Link>
              <a
                href={v.homepage}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Docs <span aria-hidden="true" className="arrow-mark">↗</span>
              </a>
            </div>
          </article>
        ))}
      </div>
    </ContentPage>
  );
}
