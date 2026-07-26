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
          <li>
            Sign in at <Link href="/app" className="text-fg underline">/app</Link>{" "}
            with GitHub (<code className="text-fg">repo</code> +{" "}
            <code className="text-fg">read:user</code>).
          </li>
          <li>
            Use <strong className="text-fg">Try your repo</strong> or create a
            watched integration with before/after OpenAPI paths (or the same
            path on two refs).
          </li>
          <li>List TypeScript consumer file paths that call the API.</li>
          <li>Run repair → review the blast radius → open a PR on GitHub.</li>
        </ol>
        <p>
          No OpenAPI repo handy? Use the{" "}
          <Link href="/demo" className="text-fg underline">
            fixture demo
          </Link>
          .
        </p>
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
            "Free: 1 watched integration, 15 runs/month, 3 seats",
            "Pro: 50 integrations, 500 runs/month, 15 seats",
            "A run = Quick Repair, manual Run now, or webhook repair",
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
