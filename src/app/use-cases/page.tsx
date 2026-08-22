import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { ContentPage, Section } from "@/components/ContentPage";

export const metadata = pageMetadata({
  title: "Use cases",
  description:
    "How engineering teams use Repairo to survive breaking changes in payment APIs, AI model deprecations, microservice contracts, and partner OpenAPI specs.",
  path: "/use-cases",
  keywords: ["use cases", "payment API migration", "AI model deprecation"],
});

const cases = [
  {
    title: "Payment gateways & fintech APIs",
    body: "When a processor bumps /v1 → /v2 or renames settlement enums, Repairo diffs the published OpenAPI, finds TypeScript checkout clients, and opens a PR with URL and enum updates — before card traffic fails.",
  },
  {
    title: "Breaking changes in microservices",
    body: "Internal producer services publish OpenAPI in the same monorepo or a contract repo. Point before/after at two refs (release tag → main), list consumer packages, and get a blast-radius PR for each dependent service.",
  },
  {
    title: "Partner & third-party OpenAPI",
    body: "Vendors ship new OpenAPI revisions on a schedule. Store before/after paths (or refs), watch the integration, and let webhook pushes trigger a repair run when the contract file changes.",
  },
  {
    title: "Platform teams & API governance",
    body: "Central platform groups use Repairo as a control plane: detect drift, enforce reviewable patches, and keep a run history of what changed and which PR landed — without mandating a sales-led rollout.",
  },
];

export default function UseCasesPage() {
  return (
    <ContentPage
      eyebrow="Solutions"
      title="Use cases"
      description="Same engine — different places OpenAPI drift shows up."
      activeHref="/use-cases"
      wide
      cta={{ href: "/app", label: "Run a repair on your repo" }}
    >
      <div className="grid gap-px bg-line sm:grid-cols-2">
        {cases.map((c) => (
          <article key={c.title} className="bg-bg px-5 py-6 sm:px-6">
            <h2 className="text-lg font-medium text-fg">{c.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{c.body}</p>
          </article>
        ))}
      </div>

      <Section title="Requirements">
        <p>
          You need an OpenAPI document in git and TypeScript consumers Repairo
          can read. Python-only or undocumented HTTP APIs are out of scope today
          — see{" "}
          <Link href="/docs" className="text-fg underline">
            Docs
          </Link>
          .
        </p>
      </Section>
    </ContentPage>
  );
}
