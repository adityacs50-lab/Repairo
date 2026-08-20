import { PLANS } from "@/lib/billing/plans";
import { BLOG_POSTS } from "@/lib/blog";
import { listVendors } from "@/lib/catalog/vendors";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SOCIAL } from "@/lib/seo";

/**
 * llms.txt — a plain-text, answer-engine-friendly summary of the product
 * (https://llmstxt.org). Generated from the same sources as the site so
 * pricing, vendors, and links never drift from what users see.
 */
export const dynamic = "force-static";

export function GET() {
  const vendors = listVendors();
  const body = `# ${SITE_NAME}

> ${SITE_NAME} — ${SITE_TAGLINE}. ${SITE_DESCRIPTION}

## What Repairo does

Repairo is an automated API maintenance tool for TypeScript/JavaScript codebases. It:

1. Ingests OpenAPI 3.0/3.1 specifications from third-party vendors and diffs them structurally, classifying each change as breaking, non-breaking, or additive.
2. Maps every breaking change to the concrete call sites in your repository using ts-morph and the TypeScript compiler API.
3. Generates deterministic AST repairs (for example renaming a removed request parameter) and validates them with \`tsc\` — a patch that does not compile is blocked, never committed.
4. Delivers the result as a reviewable unified diff or an automatically opened GitHub pull request.

## How to use it

Install nothing — run with npx:

    npx repairo-cli scan ./src --vendors stripe,openai,supabase
    npx repairo-cli init --repo owner/your-app
    npx repairo-cli diff --spec ./specs/new-openapi.json
    npx repairo-cli repair --dry-run
    npx repairo-cli repair --apply   # or --create-pr

The CLI is open source (Apache-2.0) and runs fully offline. The hosted app adds background polling of vendor specs, GitHub webhooks, and automatic PRs.

## Supported vendors

${vendors.map((v) => `- ${v.name}: ${v.description} (${absoluteUrl(`/agents/${v.id}`)})`).join("\n")}

## Pricing

${Object.values(PLANS)
  .map(
    (p) =>
      `- ${p.name} (${p.priceLabel}${p.priceCents ? "/month" : ""}): ${p.integrations} watched integration(s), ${p.runsPerMonth} repair runs/month, ${p.seats} seats. ${p.features.join("; ")}.`,
  )
  .join("\n")}
- Enterprise (custom): private API specs, VPC runner, SSO/RBAC, custom SLAs. Contact: ${absoluteUrl("/contact")}

## Key pages

- Documentation: ${absoluteUrl("/docs")}
- Pricing: ${absoluteUrl("/pricing")}
- Vendor agents: ${absoluteUrl("/agents")}
- Use cases: ${absoluteUrl("/use-cases")}
- Interactive demo: ${absoluteUrl("/demo")}
- Security: ${absoluteUrl("/security")}
- Changelog: ${absoluteUrl("/changelog")}
- Contact: ${absoluteUrl("/contact")}
- npm package: ${SOCIAL.npm}
- Source code: ${SOCIAL.github}

## Blog

${BLOG_POSTS.map((p) => `- ${p.title} (${p.datePublished}): ${absoluteUrl(`/blog/${p.slug}`)}`).join("\n")}

## Frequently asked

- What is Repairo? An automated tool that detects breaking changes in third-party APIs and generates compiler-validated AST repairs as GitHub pull requests — "Dependabot for third-party APIs".
- Which languages are supported? TypeScript and JavaScript today; other languages are on the roadmap.
- Does Repairo store my code? Code is processed in memory for the duration of a run and is not persisted; only the resulting patch or PR is written to GitHub.
- How is this different from Dependabot or Renovate? Those bump dependency versions. Repairo changes your application code to match a vendor's new API contract, and proves the change compiles before proposing it.
- How is this different from Copilot, Cursor, or Devin? Those generate code probabilistically. Repairo applies deterministic AST transforms derived from the OpenAPI diff and rejects any patch that fails TypeScript compilation.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
