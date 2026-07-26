import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, Section } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "About — Repairo",
  description:
    "Building self-maintaining APIs — Dependabot for OpenAPI contracts and consumer codebases.",
};

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="Company"
      title="About Repairo"
      description="We’re building the application layer between API contracts and customer codebases — self-maintaining APIs."
      activeHref="/about"
      cta={{ href: "/app", label: "Try Repairo" }}
    >
      <Section title="The problem">
        <p>
          API communication is broken. Breaking changes ship with little
          warning. Useful features quietly launch and go unnoticed. Changelogs
          don’t get read. At scale, unnoticed external API and package changes
          still drive a large share of production downtime.
        </p>
        <p>
          That friction made sense before agentic coding tools. Developers and
          enterprises now routinely grant codebase access to tools that prove
          valuable. The infrastructure for automated code changes exists. What’s
          missing is the layer that connects API providers to their customers’
          repos.
        </p>
      </Section>

      <Section title="What we’re building">
        <p>
          Repairo is a neutral third-party service — Dependabot for APIs. Track
          OpenAPI before → after, scan TypeScript consumers for affected usages,
          and open a PR with the fix. Providers shouldn’t just announce changes;
          with Repairo, those changes get applied as reviewable pull requests.
        </p>
        <p>
          Today we ship deterministic transforms (URL bumps, required fields,
          enum renames) with a safety score — not opaque auto-merge. Human
          review stays in the loop.
        </p>
      </Section>

      <Section title="Who it’s for">
        <p>
          Consumer engineering teams that integrate third-party or internal
          OpenAPI APIs, and platform groups who want contract drift fixed in
          git — payments, fintech, microservices, partner integrations. Per-vendor
          “install our update agent” is on the roadmap; the core loop works as a
          shared repair plane across vendors you watch.
        </p>
      </Section>

      <Section title="Thesis">
        <p>
          This is the{" "}
          <a
            href="https://www.ycombinator.com/rfs"
            target="_blank"
            rel="noreferrer"
            className="text-fg underline"
          >
            YC Requests for Startups
          </a>{" "}
          problem space for Self-Maintaining APIs: connect contracts to
          codebases, identify impact, open the fix. We’re building it in public
          via{" "}
          <Link href="/changelog" className="text-fg underline">
            Changelog
          </Link>
          ,{" "}
          <Link href="/docs" className="text-fg underline">
            Docs
          </Link>
          , and a{" "}
          <Link href="/demo" className="text-fg underline">
            live demo
          </Link>
          .
        </p>
      </Section>
    </ContentPage>
  );
}
