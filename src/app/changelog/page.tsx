import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Changelog — Repairo",
  description: "Product updates, fixes, and shipping notes for Repairo.",
};

const entries = [
  {
    date: "2026-07-26",
    title: "Vendor poll cron + multi-language patches + agent marketplace",
    items: [
      "Secured /api/cron/poll-vendors + optional VENDOR_POLL_MS in-process poller",
      "Python/Go-aware URL and enum string repairs",
      "Public /agents and /agents/[vendor] install pages",
    ],
  },
  {
    date: "2026-07-26",
    title: "Vendor agents + repo discovery",
    items: [
      "Catalog agents (Stripe, GitHub REST, Petstore) with remote OpenAPI fetch",
      "Scan repo for OpenAPI + client files (TS/JS + Python discovery)",
      "Install agent → watched integration with baseline polling",
      "Quick Repair “Scan repo” autofill",
    ],
  },
  {
    date: "2026-07-26",
    title: "SaaS billing essentials",
    items: [
      "Free / Pro plan limits (integrations, monthly runs, seats)",
      "Usage meters and payment-failed state in the app",
      "Pending team invites by GitHub username",
      "Audit log + API rate limits",
      "Public /pricing page",
    ],
  },
  {
    date: "2026-07-26",
    title: "Landing motion + clearer repair errors",
    items: [
      "Animated silver mesh gradients on the home hero",
      "File-not-found errors name the missing OpenAPI/consumer path",
      "Removed marketing LinkedIn phrasing from the funnel",
    ],
  },
  {
    date: "2026-07-25",
    title: "Production OAuth on Vercel + Railway",
    items: [
      "Signed OAuth state for proxy-safe GitHub login",
      "Vercel UI proxies /api/* to Railway (SQLite + repairs)",
      "Hardened callback errors and auth status diagnostics",
    ],
  },
  {
    date: "2026-07-24",
    title: "GitHub MVP",
    items: [
      "Connect repo → repair from OpenAPI paths → open real PRs",
      "Watched integrations + GitHub push webhooks",
      "Quick Repair one-shot flow for first-time users",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <ContentPage
      eyebrow="Updates"
      title="Changelog"
      description="Shipped work for Repairo — early access moves fast."
      activeHref="/changelog"
      cta={{ href: "/app", label: "Open the app" }}
    >
      {entries.map((entry) => (
        <Section key={`${entry.date}-${entry.title}`} title={entry.title}>
          <p className="font-mono text-xs text-muted-dim">{entry.date}</p>
          <ul className="mt-3 space-y-2">
            {entry.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 bg-fg" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </ContentPage>
  );
}
