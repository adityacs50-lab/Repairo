import Link from "next/link";
import { DocsCallout } from "@/components/docs/DocsCallout";
import { DocsCodeSnippet } from "@/components/docs/DocsCodeSnippet";
import {
  DocsCommandTable,
  DocsRelatedLinks,
  DocsShell,
  Section,
} from "@/components/docs/DocsShell";
import { BulletList } from "@/components/ContentPage";
import { getAppUrl } from "@/lib/auth/config";
import { GITHUB_REPO_URL, SOCIAL } from "@/lib/seo";

const CLI_COMMANDS = [
  {
    command: "repairo scan [dir]",
    summary:
      "Discover third-party SDK and HTTP client usage. Options: --vendors stripe,openai,supabase",
  },
  {
    command: "repairo init",
    summary:
      "Create a local .repairo workspace. Options: --repo owner/name, --vendors …",
  },
  {
    command: "repairo check",
    summary:
      "Fetch live vendor OpenAPI, diff against snapshot, exit 1 on breaking changes. Options: --vendors, --target, --json, --update-snapshot",
  },
  {
    command: "repairo diff",
    summary:
      "Diff a spec file against your snapshot and map blast radius. Options: --spec, --target",
  },
  {
    command: "repairo repair",
    summary:
      "Generate compile-checked patches. Default --dry-run; use --apply or --create-pr when ready. Optional --agent-resolve for ambiguous enums (requires ANTHROPIC_API_KEY).",
  },
] as const;

export default function DocsPage() {
  const appUrl = getAppUrl();
  const githubAppSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG?.trim() || "repairo-ai";
  const webhookUrl = `${appUrl}/api/github/webhooks`;

  return (
    <DocsShell
      title="How Repairo works"
      description="Install the CLI, diff OpenAPI contracts, map impact into TypeScript, JavaScript, Python, and Go, then open a reviewable PR — or run the same engine in the hosted workspace."
    >
      <Section title="Overview & architecture" id="overview">
        <p>
          Repairo sits between vendor OpenAPI contracts and your application code. It classifies
          breaking changes, traces call sites, applies deterministic transforms where the spec
          change is unambiguous, and validates before anything merges.
        </p>
        <p>
          The hosted product, demo, and GitHub App flows call{" "}
          <code className="docs-inline-code">runRepair()</code> in{" "}
          <code className="docs-inline-code">src/lib/engine/index.ts</code>. The{" "}
          <code className="docs-inline-code">repairo repair</code> CLI uses the same diff → impact →{" "}
          <code className="docs-inline-code">generateFixes</code> pipeline, then runs full-tree{" "}
          <code className="docs-inline-code">validateCodebase</code> before{" "}
          <code className="docs-inline-code">--apply</code> or{" "}
          <code className="docs-inline-code">--create-pr</code>.
        </p>
        <DocsCodeSnippet
          code={`before/after OpenAPI → parseOpenApi → diffOpenApi → ApiChange[]
consumer files       → findImpactedCode → ImpactMatch[]
optional agentResolve → resolveAmbiguousEnums
                      → generateFixes
                      → buildPullRequest (safetyScore)
                      → validateInMemory (hosted) / validateCodebase (CLI)
                      → RepairRunResult + SBOM`}
        />
        <DocsRelatedLinks
          links={[
            { href: "/docs/architecture", label: "Engine architecture (full diagram)" },
            { href: `${GITHUB_REPO_URL}/blob/main/docs/architecture.md`, label: "architecture.md on GitHub", external: true },
            { href: "/demo", label: "Live demo — no install" },
          ]}
        />
      </Section>

      <Section title="Quickstart" id="quickstart">
        <ol className="docs-steps">
          <li>
            <strong>Try the browser demo</strong>
            <p>
              Open{" "}
              <Link href="/demo" className="text-link">
                /demo
              </Link>{" "}
              to run OpenAPI diff → impact → patch → validation on bundled scenarios (no API keys).
            </p>
          </li>
          <li>
            <strong>Scan a repo locally</strong>
            <p>Discover Stripe, OpenAI, Supabase, and other vendor usage in seconds.</p>
          </li>
          <li>
            <strong>Diff and repair</strong>
            <p>
              Point at a new OpenAPI file, preview AST changes with compiler validation, then apply
              locally or open a GitHub PR.
            </p>
          </li>
        </ol>
        <DocsCodeSnippet
          title="Fixture walkthrough (clone this repo)"
          code={`git clone ${GITHUB_REPO_URL}.git && cd Repairo
npm install
npx repairo-cli scan ./fixtures/consumers --vendors stripe
cp fixtures/breaking-api-demo/specs/old-openapi.json .repairo/snapshots/openapi.json
npx repairo-cli diff --spec ./fixtures/breaking-api-demo/specs/new-openapi.json --target ./fixtures/breaking-api-demo`}
        />
      </Section>

      <Section title="CLI installation" id="cli">
        <p>
          Requires <strong>Node.js 22+</strong>. No cloud account required for local scan, diff, and
          dry-run repair.
        </p>
        <DocsCodeSnippet
          code={`# One-off (no global install)
npx repairo-cli scan ./src --vendors stripe,openai,supabase

# Global install
npm install -g repairo-cli

repairo init --repo owner/your-app --vendors stripe,openai
repairo scan ./src
repairo check --vendors stripe,openai --target ./src
repairo repair --dry-run --target ./src
repairo repair --create-pr   # git + GitHub token for PR creation`}
        />
        <p>
          Package on npm:{" "}
          <a href={SOCIAL.npm} className="text-link" rel="noreferrer" target="_blank">
            repairo-cli
          </a>
          . Current engine version matches the site build.
        </p>
      </Section>

      <Section title="Command reference" id="commands">
        <p>Run <code className="docs-inline-code">repairo --help</code> for the full flag list.</p>
        <DocsCommandTable rows={[...CLI_COMMANDS]} />
        <DocsCallout variant="warn">
          <p>
            <code className="docs-inline-code">--agent-resolve</code> is opt-in. It proposes enum
            mappings only when the diff is ambiguous; proposals still pass through deterministic
            transforms and compile checks. Repairo never auto-merges agent-assisted PRs.
          </p>
        </DocsCallout>
      </Section>

      <Section title="OpenAPI diffing engine" id="diffing-engine">
        <p>
          Repairo parses before and after OpenAPI 3.x documents (and common 2.0 shapes), then
          classifies changes as breaking, additive, or safe — including path/method moves, required
          fields, enum renames, base URL / version bumps, and status-code shifts.
        </p>
      </Section>

      <Section title="Impact mapping" id="impact-mapping">
        <p>
          For each classified change, Repairo traces likely call sites in TypeScript and JavaScript
          (ts-morph), Python, and Go (tokenizer-based, skipping comments and string literals). Output
          is a blast-radius summary: files, symbols, and severity.
        </p>
      </Section>

      <Section title="Deterministic AST transforms" id="ast-transforms">
        <p>
          Patches are rule-based, not free-form LLM rewrites. Supported safe transforms include URL /
          base-path bumps, required field additions when a default is unambiguous, enum rename updates
          in string literals, and field or struct-tag renames. Ambiguous enum cases are flagged for
          human review unless <code className="docs-inline-code">--agent-resolve</code> is enabled.
        </p>
      </Section>

      <Section title="GitHub App" id="github-app">
        <p>
          Install the Repairo GitHub App on repositories that store OpenAPI specs. On pull requests
          that touch a watched spec, Repairo diffs base vs head, posts a breaking-change summary, and
          can open a compile-verified fix PR when every transform is safe.
        </p>
        <p>
          <a
            className="text-link"
            href={`https://github.com/apps/${githubAppSlug}/installations/new`}
            rel="noreferrer"
            target="_blank"
          >
            Install Repairo on GitHub ↗
          </a>
        </p>
        <BulletList
          items={[
            "Permissions: Contents read/write, Pull requests read/write, Metadata read",
            "Webhook events: Pull request, Installation",
            `Webhook URL: ${webhookUrl}`,
            "Self-host: set APP_ID, PRIVATE_KEY, WEBHOOK_SECRET (see Deploy docs)",
          ]}
        />
      </Section>

      <Section title="Hosted integrations" id="hosted-integrations">
        <p>
          In the{" "}
          <Link href="/app" className="text-link">
            Repairo workspace
          </Link>
          , connect GitHub OAuth, pin vendor OpenAPI sources, and register repo webhooks that trigger
          repair runs when watched spec paths change on your default branch.
        </p>
      </Section>

      <Section title="Supported vendors" id="vendors">
        <BulletList
          items={[
            "Stripe, OpenAI, Anthropic, Supabase, Google Gemini, GitHub REST",
            "Any custom OpenAPI 3.x / 2.0 schema via diff and snapshots",
            "Languages: TypeScript, JavaScript, Python, Go — same deterministic repair set",
            "Browse per-vendor agents at /agents",
          ]}
        />
      </Section>

      <Section title="Code & data handling" id="data-handling">
        <p>
          Security expectations differ by surface — we document both honestly.
        </p>
        <DocsCallout>
          <p>
            <strong>Hosted /demo and /app:</strong> Spec and consumer files are fetched for a repair
            job, transformed in memory for that run, and not sold or used to train third-party models.
            See{" "}
            <Link href="/security" className="text-link">
              Security & trust
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-link">
              Privacy
            </Link>
            .
          </p>
        </DocsCallout>
        <DocsCallout variant="warn">
          <p>
            <strong>Local CLI:</strong> <code className="docs-inline-code">repairo repair --apply</code>{" "}
            and <code className="docs-inline-code">--create-pr</code> write to your working tree or
            remote — by design. Use <code className="docs-inline-code">--dry-run</code> to preview
            without touching disk.
          </p>
        </DocsCallout>
      </Section>

      <Section title="GitHub OAuth scopes" id="oauth">
        <p>
          The hosted workspace uses a GitHub OAuth App (not the GitHub App installation above).
          Scopes: <code className="docs-inline-code">repo</code> (read specs, open PRs you request) and{" "}
          <code className="docs-inline-code">read:user</code> (identity). Revoke anytime in GitHub →
          Settings → Applications.
        </p>
      </Section>

      <Section title="Enterprise & compliance" id="compliance">
        <p>
          Enterprise plans can include isolated runners and SSO (Entra ID, Okta). Formal SOC 2 / ISO
          programs are on the roadmap — see{" "}
          <Link href="/security#compliance" className="text-link">
            compliance roadmap
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="text-link">
            contact sales
          </Link>{" "}
          for a questionnaire.
        </p>
        <DocsRelatedLinks
          links={[
            { href: "/docs/deploy", label: "Self-host on Vercel" },
            { href: "/pricing", label: "Pricing" },
          ]}
        />
      </Section>
    </DocsShell>
  );
}
