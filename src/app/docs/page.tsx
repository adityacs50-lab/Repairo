"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BulletList, ContentPage, Section } from "@/components/ContentPage";

const docsNav = [
  {
    title: "GETTING STARTED",
    items: [
      { href: "#overview", label: "Overview & Architecture" },
      { href: "#quickstart", label: "Quickstart Guide" },
      { href: "#cli-installation", label: "CLI Installation" },
    ],
  },
  {
    title: "CORE CONCEPTS",
    items: [
      { href: "#diffing-engine", label: "OpenAPI Diffing Engine" },
      { href: "#impact-mapping", label: "TypeScript Impact Mapping" },
      { href: "#ast-transforms", label: "Deterministic AST Transforms" },
    ],
  },
  {
    title: "INTEGRATIONS",
    items: [
      { href: "#github-app", label: "GitHub App" },
      { href: "#github-webhooks", label: "Hosted integrations" },
      { href: "#vendors", label: "Supported Vendors" },
    ],
  },
  {
    title: "SECURITY & COMPLIANCE",
    items: [
      { href: "#vault", label: "Zero-Disk Volatile RAM Vault" },
      { href: "#oauth", label: "GitHub OAuth Scopes & Permissions" },
      { href: "#soc2", label: "Enterprise Controls & Compliance" },
    ],
  },
];

function CodeSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="docs-code">
      <button
        onClick={handleCopy}
        type="button"
        className="docs-code-copy"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs-callout">
      <p className="mono-label">Info</p>
      <div>{children}</div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <ContentPage
      eyebrow="Documentation"
      title="How Repairo Works"
      description="Repairo sits as the deterministic application layer between external API contracts and your internal codebase—automating the complete detect → impact → patch loop."
      activeHref="/docs"
      customNav={docsNav}
    >
      <Section title="Overview & Architecture" id="overview">
        <p>
          Instead of manually tracking down API changes, Repairo provides a seamless pipeline from an upstream OpenAPI spec directly into your TypeScript codebase.
        </p>
      </Section>

      <Section title="Quickstart Guide" id="quickstart">
        <ol className="docs-steps">
          <li>
            <strong>Scan your repository</strong>
            <p>Run Repairo locally against any directory to discover third-party API dependencies (Stripe, OpenAI, Supabase, etc.).</p>
          </li>
          <li>
            <strong>Diff OpenAPI specs</strong>
            <p>Compare new OpenAPI 3.0/3.1 specs against baseline snapshots to calculate exact AST call site impacts.</p>
          </li>
          <li>
            <strong>Validate &amp; apply patches</strong>
            <p>
              Preview AST transformations with compiler-grade typechecking (
              <code className="docs-inline-code">tsc --noEmit</code>
              ) before applying to disk or opening a GitHub PR.
            </p>
          </li>
        </ol>
      </Section>

      <Section title="CLI Installation" id="cli-installation">
        <p>
          You can run Repairo 100% offline against any local repository without requiring a cloud backend or third-party AI keys.
        </p>
        <CodeSnippet code={`# 1. Scan any codebase for API dependencies
npx @repairo/cli scan ./src --vendors stripe,openai,supabase

# 2. Initialize local .repairo configuration workspace
repairo init --repo owner/your-app

# 3. Detect contract drift & map code impact from an OpenAPI spec
repairo diff --spec ./specs/new-openapi.json

# 4. Preview AST repairs with tsc compiler validation (--dry-run)
repairo repair --dry-run

# 5. Apply validated AST repairs to working tree (--apply)
repairo repair --apply`} />
      </Section>

      <Section title="OpenAPI Diffing Engine" id="diffing-engine">
        <p>
          Repairo parses before and after OpenAPI documents, then classifies
          changes into breaking, additive, and safe categories — path/method
          moves, required fields, enum renames, base URL / version bumps, and
          status-code shifts.
        </p>
      </Section>

      <Section title="TypeScript Impact Mapping" id="impact-mapping">
        <p>
          For each classified change, Repairo traces TypeScript call sites,
          types, and status checks in the consumer files you list. Output is a
          blast-radius summary: which files and symbols are likely affected.
        </p>
      </Section>

      <Section title="Deterministic AST Transforms" id="ast-transforms">
        <p>
          Patches are rule-based, not free-form LLM rewrites. Supported safe
          transforms include URL path bumps, required field additions where a default is unambiguous, enum rename updates in string literals, and parameter property renames.
        </p>
      </Section>

      <Section title="GitHub App" id="github-app">
        <p>
          Install the Repairo GitHub App on your repositories. When a pull request touches an OpenAPI
          spec, Repairo diffs base vs head, posts a breaking-change table on the PR, and can open a
          compile-verified fix PR when every transform is safe.
        </p>
        <p>
          <a
            className="text-link"
            href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG?.trim() || "repairo-ai"}/installations/new`}
            rel="noreferrer"
            target="_blank"
          >
            Install Repairo on GitHub ↗
          </a>
        </p>
        <p>
          Required permissions: <strong>Contents</strong> read/write, <strong>Pull requests</strong>{" "}
          read/write, <strong>Metadata</strong> read. Subscribe to <strong>Pull request</strong> and{" "}
          <strong>Installation</strong> events. Set the webhook URL to{" "}
          <code className="docs-inline-code">https://www.heyrepairo.in/api/github/webhooks</code> (or your{" "}
          <code className="docs-inline-code">APP_URL</code> + <code className="docs-inline-code">/api/github/webhooks</code>
          ).
        </p>
        <p>
          Self-hosting: set <code className="docs-inline-code">APP_ID</code>,{" "}
          <code className="docs-inline-code">PRIVATE_KEY</code>, and{" "}
          <code className="docs-inline-code">WEBHOOK_SECRET</code> on Vercel (or run{" "}
          <code className="docs-inline-code">npm run dev:github-app</code> locally with smee.io).
        </p>
      </Section>

      <Section title="Hosted integrations" id="github-webhooks">
        <p>
          In the Repairo workspace, vendor agents can register repo webhooks that trigger repair runs
          when watched OpenAPI paths change on your default branch.
        </p>
      </Section>

      <Section title="Supported Vendors" id="vendors">
        <BulletList
          items={[
            "Stripe API",
            "OpenAI (Platform & Chat APIs)",
            "Anthropic Claude",
            "Supabase Management API",
            "Google Gemini",
            "GitHub REST",
            "Custom OpenAPI 3.x / 2.0 schemas",
            "Upcoming: Clerk, private / team-pinned specs",
          ]}
        />
      </Section>

      <Section title="Zero-Disk Volatile RAM Vault" id="vault">
        <p>
          Your code's privacy and security is the core foundation of our architecture.
        </p>
        <Callout>
          Repairo never writes your proprietary code to disk. All refactoring is processed strictly inside volatile memory and wiped immediately upon completion.
        </Callout>
      </Section>

      <Section title="GitHub OAuth Scopes & Permissions" id="oauth">
        <p>
          OAuth scopes: <code className="docs-inline-code">repo</code> (read specs + open
          PRs) and <code className="docs-inline-code">read:user</code> (identity).
        </p>
      </Section>

      <Section title="Enterprise Controls & Compliance" id="soc2">
        <p>
          Enterprise plans can include an isolated VPC runner and SSO integration with Entra ID or Okta — talk to sales about your requirements. Formal SOC 2 / ISO programs are on Repairo&apos;s roadmap, not completed today; see{" "}
          <Link href="/security#compliance">
            /security
          </Link>{" "}
          for the current state and to request a security questionnaire.
        </p>
      </Section>
    </ContentPage>
  );
}
