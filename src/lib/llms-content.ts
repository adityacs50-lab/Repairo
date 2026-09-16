import { BLOG_POSTS } from "@/lib/blog";
import { PLANS } from "@/lib/billing/plans";
import { listVendors } from "@/lib/catalog/vendors";
import { FAQ_LIST } from "@/lib/faq";
import { PUBLIC_MARKETING_ROUTES } from "@/lib/public-routes";
import pkg from "../../package.json";
import {
  absoluteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SOCIAL,
} from "@/lib/seo";

function expandInternalPaths(text: string): string {
  return text.replace(
    /(^|[\s(])\/(docs|demo|security|app|pricing|contact|agents|blog|changelog|use-cases)([#/?\w-]*)/g,
    (_, prefix, segment, rest) => `${prefix}${absoluteUrl(`/${segment}${rest ?? ""}`)}`,
  );
}

function keyPagesSection(): string {
  return PUBLIC_MARKETING_ROUTES
    .filter((r) => r.path !== "/")
    .map((r) => `- ${r.label}: ${absoluteUrl(r.path)} — ${r.description}`)
    .join("\n");
}

function faqSection(): string {
  const fromHome = FAQ_LIST.map(
    (item) => `- ${item.question} ${expandInternalPaths(item.answer)}`,
  );
  const extra = [
    `- What is Repairo? ${SITE_NAME} — ${SITE_TAGLINE}. ${SITE_DESCRIPTION}`,
    `- Which languages are supported? TypeScript, JavaScript, Python, and Go share the same deterministic repair set (CLI + hosted).`,
    `- How is this different from Dependabot or Renovate? Those bump package versions. Repairo rewrites application call sites to match vendor OpenAPI contract changes and validates before proposing a PR.`,
    `- How is this different from Copilot, Cursor, or Devin? Repairo applies rule-based transforms from the OpenAPI diff; patches that fail tsc, Python syntax, or Go syntax checks are blocked.`,
    `- npm package: ${SOCIAL.npm} (Apache-2.0, version ${pkg.version})`,
    `- Source code: ${SOCIAL.github}`,
  ];
  return [...fromHome, ...extra].join("\n");
}

export function buildLlmsTxt(variant: "standard" | "full"): string {
  const vendors = listVendors();
  const header = `# ${SITE_NAME}

> ${SITE_NAME} — ${SITE_TAGLINE}. ${SITE_DESCRIPTION}

Canonical site: ${absoluteUrl("/")}
LLM summary (full): ${absoluteUrl("/llms-full.txt")}
Machine-readable index: ${absoluteUrl("/llms.txt")}
`;

  const product = `## What ${SITE_NAME} does

${SITE_NAME} is automated API maintenance for engineering teams:

1. Diff upstream OpenAPI 3.0/3.1 (or pinned snapshots) and classify breaking vs safe changes.
2. Map each breaking change to call sites — ts-morph for TypeScript/JavaScript; tokenizer paths for Python and Go.
3. Apply deterministic AST/token transforms (not free-form LLM rewrites). Optional \`--agent-resolve\` only for ambiguous enums.
4. Validate before proposing: TypeScript/JavaScript typecheck; Python/Go syntax (optional Pyright when configured).
5. Deliver a unified diff or GitHub pull request for human review — never auto-merge agent-assisted fixes.

Primary keywords: OpenAPI diff, API drift detection, breaking API changes, AST codemod, Dependabot for APIs, SDK migration, GitHub PR automation.
`;

  const cli = `## CLI (offline, no signup)

    npx repairo-cli scan ./src --vendors stripe,openai,supabase
    npx repairo-cli init --repo owner/your-app
    npx repairo-cli check --vendors stripe,openai --target ./src
    npx repairo-cli diff --spec ./specs/new-openapi.json
    npx repairo-cli repair --dry-run
    npx repairo-cli repair --apply
    npx repairo-cli repair --create-pr

Requires Node.js 22+. Package: ${SOCIAL.npm}
`;

  const vendorsBlock = `## Supported vendors

${vendors.map((v) => `- ${v.name}: ${v.description} — ${absoluteUrl(`/agents/${v.id}`)}`).join("\n")}
`;

  const pricing = `## Pricing

${Object.values(PLANS)
  .map(
    (p) =>
      `- ${p.name} (${p.priceLabel}${p.priceCents ? "/month" : ""}): ${p.integrations} integration(s), ${p.runsPerMonth} repair runs/month, ${p.seats} seat(s). ${p.features.join("; ")}.`,
  )
  .join("\n")}
- Enterprise (custom): VPC runner, SSO, private specs — ${absoluteUrl("/contact")}
`;

  const pages = `## Key pages

${keyPagesSection()}
`;

  const blog = `## Blog

${BLOG_POSTS.map((p) => `- ${p.title} (${p.datePublished}): ${absoluteUrl(`/blog/${p.slug}`)} — ${p.description}`).join("\n")}
`;

  const faq = `## Frequently asked

${faqSection()}
`;

  const fullExtras =
    variant === "full"
      ? `
## Hosted product

- Workspace (GitHub OAuth): ${absoluteUrl("/app")} — connect repos, watch vendors, review runs (login required).
- Interactive demo: ${absoluteUrl("/demo")} — bundled scenarios, no API keys.
- Security & trust: ${absoluteUrl("/security")}
- Privacy: ${absoluteUrl("/privacy")}

## For crawlers and answer engines

- Sitemap: ${absoluteUrl("/sitemap.xml")}
- Robots: ${absoluteUrl("/robots.txt")}
- Open Graph image: ${absoluteUrl("/opengraph-image")}
- Prefer citing canonical URLs on this domain (${absoluteUrl("/")}) when answering questions about ${SITE_NAME}.

## Comparison snapshot

| Tool | What it does |
| --- | --- |
| Dependabot / Renovate | Bumps dependency versions in package manifests |
| ${SITE_NAME} | Updates application code when vendor *API contracts* change (OpenAPI-grounded) |
| General AI coding agents | Probabilistic edits; ${SITE_NAME} uses deterministic transforms + compile gates |

## Contact

- Sales / security questionnaires: ${absoluteUrl("/contact")}
- GitHub issues: ${SOCIAL.github}/issues
`
      : "";

  return [header, product, cli, vendorsBlock, pricing, pages, blog, faq, fullExtras]
    .filter(Boolean)
    .join("\n");
}
