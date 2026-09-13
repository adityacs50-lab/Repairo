<p align="center">
  <img src="./public/brand-mark.png" alt="Repairo AI" width="180">
</p>

<h1 align="center">Repairo AI</h1>

<p align="center">
  <strong>Dependabot bumps the package. Repairo fixes the call sites that break.</strong>
</p>

<p align="center">
  Detect third-party API breaking changes · map TypeScript impact · open a compiler-verified AST repair PR
</p>

<p align="center">
  <a href="https://www.heyrepairo.in">Website</a>
  ·
  <a href="https://www.heyrepairo.in/docs">Docs</a>
  ·
  <a href="https://www.npmjs.com/package/repairo-cli">npm</a>
  ·
  <a href="https://www.heyrepairo.in/pricing">Pricing</a>
  ·
  <a href="https://www.heyrepairo.in/security">Security</a>
  ·
  <a href="https://github.com/adityacs50-lab/Repairo/issues">Issues</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/repairo-cli"><img alt="npm" src="https://img.shields.io/npm/v/repairo-cli?style=flat-square&label=repairo-cli&color=111827"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-0EA5E9?style=flat-square"></a>
  <a href="https://github.com/adityacs50-lab/Repairo/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/adityacs50-lab/Repairo?style=flat-square"></a>
  <a href="https://github.com/adityacs50-lab/Repairo/issues"><img alt="Issues" src="https://img.shields.io/github/issues/adityacs50-lab/Repairo?style=flat-square&color=64748B"></a>
</p>

---

## Why Repairo

When Stripe, OpenAI, or another vendor ships a breaking OpenAPI change, you usually find out too late:

1. **Dependabot / Renovate** bump the SDK — your build still breaks; you grep call sites by hand.
2. **AI coding agents** rewrite files — probabilistic, hard to audit, and often means sending source to a model.

Repairo fills the gap: **deterministic AST repair** grounded in an OpenAPI diff, with compile verification before you ever see a PR. An LLM may *propose* a mapping only when the spec diff is genuinely ambiguous — it never writes your files, and those PRs are never auto-merge eligible.

---

## Quick start

```bash
# No signup. No config file.
npx repairo-cli scan ./src --vendors stripe,openai,supabase
```

Install globally when you want the full CLI:

```bash
npm install -g repairo-cli

repairo init --repo owner/your-app
repairo scan ./src
repairo check --vendors stripe,openai
repairo repair --create-pr
```

Requires **Node ≥ 22**.

---

## Features

- **OpenAPI diff** — structural before → after on live vendor specs (or your own pins)
- **AST impact map** — `ts-morph` finds the real call sites, not string matches
- **Deterministic transforms** — renames, required fields, URL bumps, enum updates on the syntax tree
- **Compiler gate** — patch must typecheck before it’s proposed
- **Human review** — PRs never auto-merge when any fix was AI-assisted
- **CI check** — fail the job when a watched vendor contract drifts
- **Vendor agents** — Stripe, OpenAI, Anthropic, Supabase, Gemini, GitHub REST ([marketplace](https://www.heyrepairo.in/agents))
- **GitHub App** — breaking-change comments on OpenAPI PRs + optional compile-verified fix PRs

---

## How it works

```
OpenAPI (before → after)
        │
        ▼
  Structural diff          what changed
        │
        ▼
  AST impact scan          which call sites
        │
        ▼
  Deterministic AST patch  (+ optional LLM proposal for ambiguous enums only)
        │
        ▼
  tsc / in-memory validate must compile
        │
        ▼
  Reviewable GitHub PR     labeled · scored · human merges
```

---

## Example

```diff
- const response = await openai.chat.completions.create({
-   model: "gpt-4",
-   max_tokens: 500,
- });

+ const response = await openai.chat.completions.create({
+   model: "gpt-4",
+   max_output_tokens: 500,
+ });
```

Scoped to the real call site via AST — an unrelated object with the same field name is left alone.

---

## Repairo vs…

| | Dependabot / Renovate | AI coding agents | **Repairo** |
|---|:---:|:---:|:---:|
| Bumps the package version | ✅ | — | ✅ |
| Fixes the calling code | ❌ | ✅ (probabilistic) | ✅ (deterministic) |
| Compile-verified before you see it | N/A | ❌ | ✅ |
| Ambiguous mappings | N/A | Often guessed silently | Flagged, or LLM-proposed with **mandatory** review |
| What leaves your machine (ambiguous case) | Nothing | Broad file context | Field names + candidates only — not your source |

---

## Run in CI

```yaml
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
```

First run writes baselines under `.repairo/snapshots/` (commit them). Later runs fail when a watched contract breaks.

---

## Agent resolve (optional)

For genuinely ambiguous enum remaps only:

```bash
repairo repair --agent-resolve   # needs ANTHROPIC_API_KEY
```

- Off by default (two opt-ins: flag + your key)
- Model output constrained to candidates from the diff
- Same AST path + compile gate as every other fix
- **Any AI-touched PR is never auto-merge eligible**

Details: [docs](https://www.heyrepairo.in/docs) · [security model](https://www.heyrepairo.in/security)

---

## GitHub App

Install on your repos from [heyrepairo.in](https://www.heyrepairo.in) (when `NEXT_PUBLIC_GITHUB_APP_SLUG` is set) or self-host:

1. Create a GitHub App with webhook URL `{APP_URL}/api/github/webhooks`
2. Set `APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET`, and `NEXT_PUBLIC_GITHUB_APP_SLUG` on Vercel
3. Redeploy — `GET /api/github/webhooks` reports whether the app is configured

`src/github-app/` watches PRs that touch OpenAPI specs, comments with a breaking-change table, and can open a compile-verified fix PR when every transform is safe.

```bash
cp .env.example .env.local   # APP_ID, PRIVATE_KEY, WEBHOOK_SECRET
npm run dev                  # webhooks at http://localhost:3000/api/github/webhooks
# or standalone: npm run dev:github-app + smee.io → localhost:3001/api/github/webhooks
```

```bash
npm run test:github-app
docker compose up --build github-app   # published on localhost:3001
```

---

## Hosted product

- **Website:** [heyrepairo.in](https://www.heyrepairo.in) — demo booking, waitlist, evidence walkthrough
- **App:** connect GitHub, watch integrations, open repair PRs
- **Pricing:** [Free / Pro / Enterprise](https://www.heyrepairo.in/pricing) — CLI stays free (Apache-2.0)

---

## Development

```bash
npm install
npm run dev          # Next.js app
npm test             # engine + app + Otto suites
```

---

## Security

Report vulnerabilities to [info@heyrepairo.in](mailto:info@heyrepairo.in) — please don’t open a public issue for security reports.

---

## Contributing

Issues and PRs welcome. Start with a clear repro or a focused fix:

- [Open an issue](https://github.com/adityacs50-lab/Repairo/issues)
- Prefer small PRs that keep the deterministic path intact
- Don’t expand AI write access — proposals only, always review-gated

---

## License

[Apache-2.0](./LICENSE)
