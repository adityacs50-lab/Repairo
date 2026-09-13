/**
 * Otto's product knowledge base.
 *
 * Otto is the Repairo assistant (see src/app/api/chat/route.ts). Everything Otto
 * is allowed to assert about the product lives here, in one place, as retrievable
 * sections rather than one giant system prompt — a question only pays for the
 * sections it actually needs.
 *
 * Sourcing rule: anything that can drift (pricing, vendor list, links) is DERIVED
 * from the same modules the site renders from (`PLANS`, `listVendors`, `SITE_URL`,
 * `FAQ_LIST`), never retyped. Prose facts are lifted from README.md, /docs and
 * /security. If a fact is not in this file, Otto is not allowed to state it.
 */

import { PLANS, type PlanLimits } from "@/lib/billing/plans";
import { listVendors } from "@/lib/catalog/vendors";
import { FAQ_LIST } from "@/lib/faq";
import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export interface KnowledgeSection {
  id: string;
  title: string;
  /** Lowercase retrieval keywords. Matched against the user's question. */
  keywords: string[];
  /** Always injected regardless of the question. Keep these short. */
  always?: boolean;
  content: string;
}

function planLine(plan: PlanLimits): string {
  return `${plan.name} (${plan.priceLabel}${plan.priceCents ? "/month" : ""}): ${plan.integrations} watched integration(s), ${plan.runsPerMonth} repair runs/month, ${plan.seats} seats. Includes: ${plan.features.join("; ")}.`;
}

const REAL_VENDORS = listVendors().filter((v) => v.id !== "petstore");

export const LINKS = {
  docs: `${SITE_URL}/docs`,
  pricing: `${SITE_URL}/pricing`,
  security: `${SITE_URL}/security`,
  changelog: `${SITE_URL}/changelog`,
  blog: `${SITE_URL}/blog`,
  app: `${SITE_URL}/app`,
  demo: `${SITE_URL}/demo`,
  agents: `${SITE_URL}/agents`,
  useCases: `${SITE_URL}/use-cases`,
  contact: `${SITE_URL}/contact`,
  npm: "https://www.npmjs.com/package/repairo-cli",
  github: "https://github.com/adityacs50-lab/Repairo",
  securityEmail: "info@heyrepairo.in",
} as const;

export const KNOWLEDGE: KnowledgeSection[] = [
  // ---------------------------------------------------------------- always-on
  {
    id: "identity",
    title: "What Repairo is",
    always: true,
    keywords: ["what", "repairo", "product", "overview", "about", "do", "explain"],
    content: `${SITE_NAME} — ${SITE_TAGLINE}.

Canonical definition (reuse this wording): Repairo is an automated API maintenance tool for TypeScript/JavaScript codebases. It detects breaking changes in third-party vendor OpenAPI specs, maps the impact to concrete call sites in the codebase, and generates compiler-validated AST repairs delivered as a reviewable diff or a GitHub pull request.

One-line positioning: "Dependabot updates your package.json. Repairo fixes the code that breaks when it does."

The problem it solves: when a vendor ships a breaking change (renamed field, removed enum value, newly required parameter), you either (a) get a Dependabot/Renovate version bump while your build still breaks, or (b) let an AI agent rewrite the code probabilistically, which can produce a fix that compiles and is still wrong. Repairo is built for the gap between those two: deterministic AST repair, with an LLM only ever proposing — never writing.`,
  },
  {
    id: "links",
    title: "Canonical links",
    always: true,
    keywords: ["link", "url", "where", "page", "site", "docs", "sign", "login"],
    content: `Use these exact URLs and never invent others:
- Docs: ${LINKS.docs}
- Pricing: ${LINKS.pricing}
- Security: ${LINKS.security}
- Changelog: ${LINKS.changelog}
- Blog: ${LINKS.blog}
- App / sign in: ${LINKS.app}
- Interactive demo: ${LINKS.demo}
- Vendor agents: ${LINKS.agents}
- Use cases: ${LINKS.useCases}
- Contact / book a demo: ${LINKS.contact}
- npm package: ${LINKS.npm}
- Source: ${LINKS.github}
- Security reports: ${LINKS.securityEmail}`,
  },

  // ------------------------------------------------------------------- engine
  {
    id: "engine",
    title: "How the engine works",
    keywords: [
      "how", "work", "works", "engine", "pipeline", "ast", "architecture", "deterministic",
      "ts-morph", "compile", "tsc", "typescript", "diff", "impact", "transform", "patch",
      "validate", "validation", "kaise", "kaam",
    ],
    content: `Pipeline, in order:
1. diffOpenApi() — structural diff of the vendor's OpenAPI spec (before -> after). Classifies every change as breaking, non-breaking, or additive: path/method moves, removed endpoints, removed or renamed parameters, newly required fields, enum renames, base URL / version bumps, status-code shifts.
2. findImpactedCode() — a ts-morph AST scan of the repository that maps each change to the concrete call sites, types, and status checks affected. Output is a blast-radius summary: which files and symbols are hit.
3. applyAstTransforms() — deterministic AST mutation on the real syntax tree (rename a parameter property, bump a URL path, insert a newly required field where the default is unambiguous, update an enum rename in string literals). This is not regex find-and-replace: an unrelated object literal with a field of the same name is left untouched.
4. validateInMemory() / tsc — the patch must actually compile (\`tsc --noEmit\`) before it is ever shown. A patch that does not compile is blocked, never committed.
5. Pull request — labeled and scored. Never auto-merged when AI-assisted.

Ingests OpenAPI 3.0 / 3.1 (and 2.0 schemas). Every step through the compile check is deterministic — no model in the loop.`,
  },
  {
    id: "llm-policy",
    title: "The one place an LLM is used",
    keywords: [
      "llm", "ai", "agent", "resolve", "agent-resolve", "anthropic", "claude", "model",
      "hallucinate", "hallucination", "probabilistic", "enum", "ambiguous", "confidence",
    ],
    content: `There is exactly one case where an LLM is involved at all: a spec diff that removes several enum values while adding several new ones. The diff alone cannot prove which old value maps to which new one, so the deterministic engine refuses and flags it for manual review.

Optionally (\`--agent-resolve\`, requiring the user's own ANTHROPIC_API_KEY) Repairo asks an LLM to propose a mapping for that one case. The constraints:
- The proposed target is constrained by a strict JSON-schema \`enum\` to the actual candidate values from the diff — the model cannot propose anything outside what the spec itself added.
- An accepted proposal is fed through the exact same deterministic AST transform used for unambiguous cases. No agent-specific code-mutation path exists.
- The patch still has to compile before it is proposed.
- A PR containing any AI-proposed fix is never auto-merge eligible, regardless of confidence. Confidence is model-self-reported, not a calibrated probability — it is for the human reviewer, not a trust signal.
- Off by default. Requires two independent opt-ins (the flag AND the user's own key); neither alone does anything. CLI-only today.
- What leaves the machine for an ambiguous case: field names, path, and candidate values only — never source code.`,
  },

  // ---------------------------------------------------------------- surfaces
  {
    id: "cli",
    title: "CLI: install and commands",
    keywords: [
      "cli", "install", "npx", "npm", "command", "terminal", "start", "started", "getting",
      "setup", "set", "init", "scan", "diff", "repair", "dry-run", "apply", "create-pr",
      "offline", "quickstart", "use", "run",
    ],
    content: `Zero-setup first run (no signup, no config file):
\`\`\`bash
npx repairo-cli scan ./src --vendors stripe,openai,supabase
\`\`\`

Global install and full loop:
\`\`\`bash
npm install -g repairo-cli

repairo init --repo owner/your-app       # link your repository (.repairo workspace)
repairo scan ./src                       # find third-party API dependencies
repairo check --vendors stripe,openai    # diff live vendor specs vs your snapshot; exits non-zero on breakage
repairo diff --spec ./specs/new-openapi.json
repairo repair --dry-run                 # preview the AST patch + tsc validation
repairo repair --apply                   # write to the working tree
repairo repair --create-pr               # open a GitHub PR instead
\`\`\`

The CLI is open source (Apache-2.0) and runs fully offline — no cloud backend and no third-party AI keys required. Package name on npm: \`repairo-cli\` (binaries: \`repairo\` and \`repairo-cli\`). Requires Node >= 22.`,
  },
  {
    id: "ci",
    title: "CI / GitHub Action",
    keywords: [
      "ci", "action", "actions", "workflow", "github action", "pipeline", "cron", "schedule",
      "yaml", "baseline", "snapshot", "fail", "build",
    ],
    content: `Run it as a GitHub Action:
\`\`\`yaml
# .github/workflows/repairo.yml
name: API contract check
on:
  schedule:
    - cron: "0 6 * * *"
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: adityacs50-lab/Repairo@main
        with:
          vendors: stripe,openai
          target: ./src
\`\`\`
The first run saves a baseline snapshot — commit it. Every run after that fails the job the moment a watched vendor's contract changes underneath you.`,
  },
  {
    id: "github-app",
    title: "GitHub App: PR comments and fix PRs",
    keywords: [
      "github", "app", "webhook", "webhooks", "pr", "pull", "request", "comment", "install",
      "permission", "permissions", "smee", "express", "octokit", "sqlite", "fork", "docker",
    ],
    content: `\`src/github-app/\` is a standalone webhook server (Express + @octokit/app) installed on your own repositories.

What it does: when a pull request touches an OpenAPI spec — \`openapi.{yaml,yml,json}\`, \`swagger.{yaml,yml,json}\`, or any YAML under an \`api/spec/\` directory — it diffs base vs head and, if the change is breaking, posts a "⚠️ Breaking API Changes Detected" comment with a rule / endpoint / details table and an action checklist. A later push to the same PR updates that comment instead of adding another. Installations and detected breaking changes are stored in SQLite (\`installations\`, \`breaking_change_events\`).

It then scans the repo at the PR's head SHA for impacted consumer code through the same deterministic engine the CLI uses. When — and only when — every generated fix is deterministic (nothing ambiguous, no AI involved) and passes an in-memory TypeScript compile, it pushes a branch, opens a second PR with the compile-verified patch, and links it from the original comment. PRs from forks are skipped (no write access to push there); anything ambiguous is left for manual review.

Setup: create a GitHub App with webhook URL ending in \`/api/github/webhooks\`, a webhook secret, repository permissions Contents: Read and write (read-only is not enough — the fix-PR push fails with 403), Pull requests: Read and write, Metadata: Read-only, and subscribe to the Pull request event. Then set \`APP_ID\`, \`PRIVATE_KEY\` (the .pem contents), and \`WEBHOOK_SECRET\` in \`.env.local\`, and run \`npm run dev:github-app\` (or \`docker compose up --build github-app\`, published on localhost:3001). \`GET /healthz\` returns \`{"ok":true}\`. For local development, forward webhooks with smee.io.

Optional: install the \`oasdiff\` CLI (or set \`OASDIFF_BIN\`) for its fuller breaking-change rule set; without it the built-in structural diff is used and needs no extra tooling.`,
  },
  {
    id: "hosted-app",
    title: "Hosted app",
    keywords: [
      "hosted", "saas", "cloud", "app", "dashboard", "workspace", "sign", "signin", "login",
      "account", "poll", "polling", "background", "automatic", "monitor", "monitoring", "watch",
    ],
    content: `The hosted app (${LINKS.app}) adds what the CLI cannot do on its own: it polls watched vendor specs in the background, receives GitHub webhooks, and opens repair PRs automatically. You sign in with GitHub, pick the repositories to protect, and add watched integrations from the vendor catalog. Setup is connect GitHub -> choose projects -> done; no config file required.

There is also a fixture playground / interactive demo at ${LINKS.demo} that runs the full detect -> impact -> patch loop on sample specs without touching a real repository.`,
  },

  // ----------------------------------------------------------------- catalog
  {
    id: "vendors",
    title: "Supported vendors and languages",
    keywords: [
      "vendor", "vendors", "support", "supported", "stripe", "openai", "gemini", "google",
      "anthropic", "supabase", "clerk", "github rest", "catalog", "language", "languages",
      "python", "java", "go", "rust", "roadmap", "custom",
    ],
    content: `Vendor agents available today:
${REAL_VENDORS.map((v) => `- ${v.name}: ${v.description} (${SITE_URL}/agents/${v.id})`).join("\n")}
Plus custom OpenAPI 3.x / 2.0 schemas of your own, and a Petstore sandbox used for demos.

Language support: TypeScript and JavaScript only today. Other languages are on the roadmap — say so plainly rather than implying support.`,
  },
  {
    id: "pricing",
    title: "Pricing",
    keywords: [
      "price", "pricing", "cost", "plan", "plans", "free", "pro", "enterprise", "billing",
      "subscription", "seat", "seats", "quota", "limit", "limits", "trial", "invoice", "stripe",
      "paisa", "kitna", "kimat",
    ],
    content: `- ${planLine(PLANS.free)}
- ${planLine(PLANS.pro)}
- Enterprise (custom pricing): private API specs, isolated VPC runner, SSO/RBAC (Entra ID or Okta), custom SLAs. Contact sales at ${LINKS.contact}.

Billing runs through Stripe, with a self-serve billing portal and invoices on Pro. Full detail: ${LINKS.pricing}.`,
  },

  // ---------------------------------------------------------------- security
  {
    id: "security",
    title: "Security and privacy",
    keywords: [
      "security", "privacy", "private", "store", "storage", "retention", "train", "training",
      "data", "vault", "ram", "memory", "disk", "oauth", "scope", "scopes", "token", "encrypt",
      "compliance", "soc", "soc2", "iso", "gdpr", "audit", "safe", "secure", "surakshit",
    ],
    content: `- Zero-Disk Volatile RAM Vault: your code is processed strictly in volatile memory for the duration of a run and wiped immediately on completion. Repairo never writes your proprietary code to disk. Only the resulting patch / PR is written to GitHub.
- Zero-retention: code is never stored and never used for training.
- The CLI is open source (Apache-2.0) and runs fully offline — nothing leaves the machine at all.
- For the one optional ambiguous-enum case (\`--agent-resolve\`), what leaves the machine is field names, the path, and candidate values only — never source code. Off by default.
- GitHub OAuth scopes: \`repo\` (read specs, open PRs) and \`read:user\` (identity). GitHub App permissions are listed in the GitHub App section.
- Stored access tokens are encrypted at rest (TOKEN_ENCRYPTION_KEY); sessions are signed (SESSION_SECRET).
- Compliance honesty: formal SOC 2 / ISO programs are on the roadmap, NOT completed today. Never state Repairo is SOC 2, ISO, or GDPR certified. Enterprise plans can include an isolated VPC runner and SSO. Point people to ${LINKS.security} for the current state and to request a security questionnaire.
- Report vulnerabilities to ${LINKS.securityEmail} rather than filing a public issue.`,
  },

  // ------------------------------------------------------------- positioning
  {
    id: "comparisons",
    title: "Repairo vs alternatives",
    keywords: [
      "vs", "versus", "compare", "comparison", "difference", "different", "alternative",
      "dependabot", "renovate", "copilot", "cursor", "devin", "codemod", "snyk", "better",
      "why", "antar", "farak",
    ],
    content: `This table is REFERENCE DATA ONLY — never reproduce it as a table in an answer, because the widget cannot render tables. Convert the relevant rows into short "• " lines.

| | Dependabot / Renovate | General AI coding agents (Copilot, Cursor, Devin) | Repairo |
|---|---|---|---|
| Fixes the version number | yes | no | yes |
| Fixes the code that calls it | no | yes (probabilistic) | yes (deterministic) |
| Guaranteed to compile before you see it | n/a | no | yes |
| Ambiguous cases | n/a | guessed silently | flagged, or LLM-proposed with mandatory review — never auto-merged |
| What leaves your machine for an ambiguous case | nothing | full file context | field names, path, candidate values only — never source code |

Framing to use: Dependabot and Renovate bump dependency versions; they do not touch the code that breaks. Copilot/Cursor/Devin generate code probabilistically and can produce a fix that compiles and is still wrong. Repairo applies deterministic AST transforms derived from the OpenAPI diff and rejects any patch that fails TypeScript compilation. Who should use which: keep Dependabot for version bumps, use an agent for open-ended feature work, use Repairo for the specific job of keeping consumer code in sync with a vendor's API contract.`,
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    keywords: [
      "error", "fail", "failed", "not working", "broken", "403", "401", "problem", "issue",
      "debug", "troubleshoot", "nothing", "empty", "no changes", "why not", "help", "fix",
      "skip", "skipped",
    ],
    content: `- "No changes detected" on a first run: the first run writes the baseline snapshot. Commit it; drift is only detectable from the second run onward.
- Fix-PR push fails with 403: the GitHub App's Contents permission is Read-only. Bump it to Read and write in the app's Permissions & events, then accept the new permissions on each installation.
- A PR from a fork is skipped by design — the installation has no write access to push a fix branch there.
- An ambiguous change was flagged instead of fixed: that is intended. The deterministic engine refuses to guess; see the ambiguous-enum case, and \`--agent-resolve\` if you want an LLM proposal you must review.
- A patch was generated but blocked: it failed \`tsc\`. Repairo never proposes a patch that does not compile.
- Chat/CLI says a key is missing: \`--agent-resolve\` needs your own ANTHROPIC_API_KEY; without it the flag is a no-op.
- Richer breaking-change rules: install the \`oasdiff\` CLI or set \`OASDIFF_BIN\`. Optional — the built-in diff works without it.
- Node >= 22 is required.`,
  },
  {
    id: "faq",
    title: "Published FAQ (site wording)",
    keywords: ["faq", "question", "common", "ask", "asked", "simple", "plain", "business"],
    content: FAQ_LIST.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"),
  },
];

const ALWAYS_SECTIONS = KNOWLEDGE.filter((s) => s.always);
const RETRIEVABLE_SECTIONS = KNOWLEDGE.filter((s) => !s.always);

/** Words too common to carry retrieval signal. */
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "and", "or", "but", "if", "of",
  "to", "in", "on", "for", "with", "it", "its", "this", "that", "these", "those", "i", "you",
  "we", "they", "me", "my", "your", "our", "can", "could", "would", "should", "will", "does",
  "do", "did", "have", "has", "had", "about", "from", "at", "as", "so", "than", "then", "there",
  "please", "tell", "know", "want", "need", "get", "give", "hi", "hello", "hey",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Score a section against the question's tokens. Title matches are weighted above
 * keyword matches, which are weighted above an incidental hit in the body — so
 * "what does it cost" lands on pricing rather than on whichever section happens
 * to say "cost" once.
 */
function scoreSection(section: KnowledgeSection, tokens: string[]): number {
  const title = section.title.toLowerCase();
  const body = section.content.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (section.keywords.includes(token)) score += 3;
    else if (section.keywords.some((k) => k.includes(token) || token.includes(k))) score += 2;
    if (title.includes(token)) score += 2;
    else if (body.includes(token)) score += 0.5;
  }
  return score;
}

export interface RetrievalOptions {
  /** Max retrieved (non-always) sections to include. */
  maxSections?: number;
  /** Hard cap on the retrieved-knowledge character budget. */
  maxChars?: number;
}

/**
 * Pick the knowledge sections relevant to a question. Always-on sections come
 * first, then the highest-scoring matches. A question that matches nothing (a
 * greeting, say) still gets the always-on sections plus a sensible default set,
 * so Otto is never answering with an empty brief.
 */
export function retrieveKnowledge(query: string, options: RetrievalOptions = {}): KnowledgeSection[] {
  const { maxSections = 4, maxChars = 9000 } = options;
  const tokens = tokenize(query);

  const ranked = RETRIEVABLE_SECTIONS.map((section) => ({ section, score: scoreSection(section, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSections)
    .map((entry) => entry.section);

  // No signal at all (greeting, gibberish, an unrecognised language): fall back to
  // the sections that answer the questions visitors actually open the widget with.
  const selected = ranked.length > 0
    ? ranked
    : RETRIEVABLE_SECTIONS.filter((s) => ["engine", "cli", "pricing"].includes(s.id));

  const out: KnowledgeSection[] = [...ALWAYS_SECTIONS];
  let budget = maxChars;
  for (const section of selected) {
    if (section.content.length > budget) continue;
    out.push(section);
    budget -= section.content.length;
  }
  return out;
}

/** Render selected sections as the "knowledge brief" block of the system prompt. */
export function renderKnowledge(sections: KnowledgeSection[]): string {
  return sections.map((s) => `### ${s.title}\n${s.content}`).join("\n\n");
}
