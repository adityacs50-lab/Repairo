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
      { href: "#github-webhooks", label: "Automated GitHub Webhooks" },
      { href: "#vendors", label: "Supported Vendors" },
    ],
  },
  {
    title: "SECURITY & COMPLIANCE",
    items: [
      { href: "#vault", label: "Zero-Disk Volatile RAM Vault" },
      { href: "#oauth", label: "GitHub OAuth Scopes & Permissions" },
      { href: "#soc2", label: "SOC 2 & Enterprise Controls" },
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
    <div className="bg-surface-elevated text-ink rounded-xl p-4 font-mono text-xs border border-hairline shadow-inner shadow-canvas/50 relative my-6">
      <div className="absolute top-3 right-3">
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 bg-surface-deep hover:bg-body text-ink border border-hairline px-2 py-1 rounded-md text-[10px] transition-colors cursor-pointer"
        >
          {copied ? (
            <span className="text-emerald-400">Copied</span>
          ) : (
            <span>Copy</span>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap pr-16 text-mute leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 pl-4 py-2 border-l-2 border-hairline-strong bg-surface-card/30">
      <div className="text-sm text-mute leading-relaxed">
        <strong className="text-ink font-medium">Info:</strong> {children}
      </div>
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
        <ol className="list-decimal space-y-6 pl-5 mt-4">
          <li className="pl-2">
            <strong className="text-ink font-medium block text-base mb-2">1. Scan Your Repository</strong>
            <p>Run Repairo locally against any directory to discover third-party API dependencies (Stripe, OpenAI, Supabase, etc.).</p>
          </li>
          <li className="pl-2">
            <strong className="text-ink font-medium block text-base mb-2">2. Diff OpenAPI Specs</strong>
            <p>Compare new OpenAPI 3.0/3.1 specs against baseline snapshots to calculate exact AST call site impacts.</p>
          </li>
          <li className="pl-2">
            <strong className="text-ink font-medium block text-base mb-2">3. Validate &amp; Apply Patches</strong>
            <p>Preview AST transformations with compiler-grade typechecking (<code className="text-ink bg-surface-elevated px-1.5 py-0.5 rounded font-mono text-xs border border-hairline">tsc --noEmit</code>) before applying to disk or opening a GitHub PR.</p>
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

      <Section title="Automated GitHub Webhooks" id="github-webhooks">
        <p>
          Configure Repairo to poll remote schemas continuously. We integrate directly with GitHub Webhooks to push branch updates immediately when a dependency drifts.
        </p>
      </Section>

      <Section title="Supported Vendors" id="vendors">
        <BulletList
          items={[
            "Stripe API",
            "OpenAI (Platform & Chat APIs)",
            "Supabase",
            "Custom OpenAPI 3.x / 2.0 schemas",
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
          OAuth scopes: <code className="text-ink bg-surface-elevated px-1.5 py-0.5 rounded font-mono text-xs border border-hairline">repo</code> (read specs + open
          PRs) and <code className="text-ink bg-surface-elevated px-1.5 py-0.5 rounded font-mono text-xs border border-hairline">read:user</code> (identity).
        </p>
      </Section>

      <Section title="SOC 2 & Enterprise Controls" id="soc2">
        <p>
          Enterprise customers get isolated VPC runners, explicit SSO integration with Entra ID or Okta, and comprehensive SOC 2 Type II compliance reports available upon request.
        </p>
      </Section>
    </ContentPage>
  );
}
