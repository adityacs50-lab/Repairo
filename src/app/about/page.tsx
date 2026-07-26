import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, Section } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "About — Repairo",
  description: "Why we built Repairo and who it’s for.",
};

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="Company"
      title="About Repairo"
      description="Self-maintaining API integrations — so OpenAPI breaks become reviewable PRs, not Friday-night outages."
      activeHref="/about"
      cta={{ href: "/app", label: "Try Repairo" }}
    >
      <Section title="The problem">
        <p>
          Producer APIs ship breaking OpenAPI changes. Consumer services — often
          TypeScript clients deep in a monorepo — lag behind. Teams discover the
          break in staging, or worse, in production. Diffing specs by hand and
          hunting call sites does not scale.
        </p>
      </Section>

      <Section title="What we’re building">
        <p>
          Repairo connects to your GitHub, diffs OpenAPI before → after, maps
          impact in the consumers you point at, and opens a deterministic repair
          PR you can review and merge. No black-box auto-merge. No sales call
          required to try it.
        </p>
      </Section>

      <Section title="Who it’s for">
        <p>
          Platform and product engineering teams that own OpenAPI contracts and
          TypeScript consumers — payments, fintech APIs, internal microservices,
          partner integrations. If you already version OpenAPI in git, you’re in
          the sweet spot.
        </p>
      </Section>

      <Section title="Early access">
        <p>
          We’re shipping in public:{" "}
          <Link href="/changelog" className="text-fg underline">
            Changelog
          </Link>
          ,{" "}
          <Link href="/docs" className="text-fg underline">
            Docs
          </Link>
          , and a live{" "}
          <Link href="/demo" className="text-fg underline">
            fixture demo
          </Link>
          . Feedback from design partners shapes the roadmap — reach out via{" "}
          <Link href="/contact" className="text-fg underline">
            Contact
          </Link>
          .
        </p>
      </Section>
    </ContentPage>
  );
}
