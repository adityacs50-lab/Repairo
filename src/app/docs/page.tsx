import type { Metadata } from "next";
import Link from "next/link";
import { BulletList, ContentPage, Section } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Docs — Repairo",
  description:
    "How Repairo diffs OpenAPI, maps TypeScript impact, and opens safe GitHub PRs.",
};

export default function DocsPage() {
  return (
    <ContentPage
      eyebrow="Documentation"
      title="How Repairo works"
      description="Connect GitHub, track OpenAPI before → after, map TypeScript impact, open a Dependabot-style repair PR."
      activeHref="/docs"
      cta={{ href: "/app", label: "Try on your GitHub repo" }}
    >
      <Section title="Quick start" id="quick-start">
        <p>
          Repairo is the application layer between API contracts and customer
          codebases — the{" "}
          <a
            href="https://www.ycombinator.com/rfs"
            target="_blank"
            rel="noreferrer"
            className="text-fg underline"
          >
            self-maintaining APIs
          </a>{" "}
          loop: detect → impact → apply as a PR.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li className="flex flex-col gap-3 items-start my-4">
            <span>Sign in to the dashboard to authenticate with your repository:</span>
            <Link href="/app" className="inline-flex items-center justify-center rounded-full bg-primary px-[16px] py-[8px] text-[14px] text-on-primary border border-primary hover:bg-transparent hover:text-ink transition-colors">
              Sign in with GitHub
            </Link>
            <span className="text-[13px] text-body-mid">Requires <code className="text-fg">repo</code> and <code className="text-fg">read:user</code> scopes.</span>
          </li>
          <li>
            Use <strong className="text-fg">Try your repo</strong> or create a
            watched integration with before/after OpenAPI paths (or the same
            path on two refs).
          </li>
          <li>List TypeScript consumer file paths that call the API.</li>
          <li>Run repair → review the blast radius → open a PR on GitHub.</li>
        </ol>
          <div className="flex items-center gap-3 mt-4 p-4 border border-hairline rounded-xl bg-transparent">
            <span className="text-[14px]">No OpenAPI repo handy?</span>
            <Link href="/demo" className="inline-flex items-center justify-center rounded-full bg-transparent px-[16px] py-[6px] text-[14px] text-ink border border-hairline hover:border-body-mid transition-colors">
              Try the Fixture Demo
            </Link>
          </div>
      </Section>

      <Section title="Automated Integrations (Pro/Business)" id="integrations">
        <p>
          Instead of manually uploading specs, you can configure Repairo to poll remote OpenAPI schemas (like Stripe or internal microservices) continuously in the background.
        </p>
        <BulletList
          items={[
            "Scheduled daily polling or real-time Webhook triggers",
            "Automatic discovery of TypeScript/TSX consumer files across your repository",
            "Zero-touch PR generation when upstream breaking changes are detected",
          ]}
        />
      </Section>

      <Section title="OpenAPI diffing" id="diffing">
        <p>
          Repairo parses before and after OpenAPI documents, then classifies
          changes into breaking, additive, and safe categories — path/method
          moves, required fields, enum renames, base URL / version bumps, and
          status-code shifts.
        </p>
        <p>
          The diff is the source of truth. We do not guess from runtime traffic
          or undocumented endpoints.
        </p>
      </Section>

      <Section title="Impact mapping" id="impact">
        <p>
          For each classified change, Repairo traces TypeScript call sites,
          types, and status checks in the consumer files you list. Output is a
          blast-radius summary: which files and symbols are likely affected.
        </p>
        <BulletList
          items={[
            "Supported today: TypeScript / TSX consumer sources",
            "You provide explicit file paths (no whole-monorepo crawl yet)",
            "Impact is advisory — always review before merge",
          ]}
        />
      </Section>

      <Section title="Deterministic transforms" id="transforms">
        <p>
          Patches are rule-based, not free-form LLM rewrites. Supported safe
          transforms include:
        </p>
        <BulletList
          items={[
            "URL / version path bumps (e.g. /v1 → /v2)",
            "Required field additions where a default is unambiguous",
            "Enum rename updates in string literals and unions",
            "Status-code expectation updates in checks",
          ]}
        />
        <p>
          Each run includes a safety score. Unsupported or ambiguous changes are
          left for humans — Repairo will not invent business logic.
        </p>
      </Section>

      <Section title="GitHub permissions" id="permissions">
        <p>
          OAuth scopes: <code className="text-fg">repo</code> (read specs + open
          PRs) and <code className="text-fg">read:user</code> (identity). See{" "}
          <Link href="/security" className="text-fg underline">
            Security
          </Link>{" "}
          for storage and architecture.
        </p>
      </Section>

      <Section title="Plans & limits" id="plans">
        <BulletList
          items={[
            "Free: 1 repository, manual/on-demand scans, manual fixes.",
            "Pro ($29/mo): Up to 10 repositories, scheduled daily scans, automated fix PRs.",
            "Business ($99/mo): Up to 50 repositories, real-time webhooks, auto-merge capabilities.",
            "Enterprise: Unlimited repositories, VPC/Self-hosted, SSO.",
          ]}
        />
        <p>
          Full comparison on{" "}
          <Link href="/pricing" className="text-fg underline">
            Pricing
          </Link>
          .
        </p>
      </Section>
    </ContentPage>
  );
}
