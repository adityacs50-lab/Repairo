# Repairo — Investor research brief

**Purpose:** External research + in-repo facts for traction framing, market sizing, competitive positioning, and fundraising prep.  
**Last updated:** 2026-09-25 (pricing aligned to monetization plan; public signals from 2026-09-16).  
**Not legal advice.** Cap table / entity questions need a CA/lawyer.

---

## 1. Traction & metrics (what exists vs what you must build)

### 1.1 Public signals (verified)

| Signal | Value | Source / notes |
|--------|--------|----------------|
| **npm `repairo-cli`** | v0.4.0 (published 2026-09-14) | `npm view repairo-cli` |
| **npm downloads** | **~258** in the npm “last-month” window (2026-08-13 → 2026-09-11) | `api.npmjs.org/downloads/point/last-month/repairo-cli` |
| **GitHub `adityacs50-lab/Repairo`** | **2** stars, **0** forks | GitHub API |
| **Repo activity** | Created 2026-07-26; last push 2026-09-14 | GitHub API |
| **Hosted pricing (in product)** | Free ($0), Pro **$79/org/mo**, Team **$249/org/mo**, Enterprise **$6–12K/yr** | `src/lib/billing/plans.ts` |
| **Engine tests** | 113+ integration tests (CI) | `tests/run-tests.ts` summary |
| **Website** | https://www.heyrepairo.in | README |

**Interpretation for investors:** Strong **technical proof** (engine, tests, CLI, demo, docs). **Weak distribution proof** (stars/downloads). Do **not** quote npm downloads as “users” without defining (unique IPs ≠ teams).

### 1.2 What is *not* in the repo (you must source internally)

Track these in a spreadsheet (Stripe, Postgres, GitHub, analytics)—not in git:

| Metric | Definition | Where to pull |
|--------|------------|---------------|
| **MRR / ARR** | Paid Pro subscriptions | Stripe Dashboard |
| **Paying accounts** | Workspaces on `pro` | DB `workspace.plan` + Stripe |
| **Active workspaces** | Signed in + ≥1 integration or run in 30d | DB `users`, `integrations`, `runs` |
| **Repair runs** | `/api/repair`, CLI, GitHub App | `runs` table, server logs |
| **PRs opened** | Successful GitHub PR creation | `runs.pr_url`, GitHub App metrics |
| **Activation** | % signups → first successful repair/PR | Product analytics |
| **Retention** | Week-4 / week-8 active teams | Cohort on `runs.created_at` |
| **Pipeline** | Demos booked, design partners, LOIs | CRM / Notion (FormSubmit exports) |

**Suggested north-star for seed:** *Weekly repair runs that reach “PR opened” or “compiler-verified patch”* (not page views).

### 1.3 Honest traction narrative (pre-revenue / early)

Use this until you have paying logos:

> “We shipped an Apache-2.0 repair engine with 113+ integration tests, published `repairo-cli` on npm, and run hosted beta on Vercel + Neon. Public distribution is early (~258 npm downloads in the last reported month, 2 GitHub stars). We’re converting CLI and demo interest into **design partners** on hosted watch + repair PRs; list prices are Pro **$79/org/mo** and Team **$249/org/mo**.”

### 1.4 Pipeline template (fill in weekly)

| Stage | Account | API focus | Next step | Owner |
|-------|---------|-----------|-----------|-------|
| Lead | | Stripe / OpenAI / … | Book technical demo | |
| Pilot | | Success = N merged PRs | 4-week pilot agreement | |
| Pro | | Paid or LOI | Stripe checkout | |

---

## 2. Market sizing (TAM / SAM / SOM)

Use **bottom-up** for seed credibility; top-down only as context.

### 2.1 Problem budget (bottom-up)

**Buyer:** Teams that consume **third-party or partner OpenAPI APIs** (payments, AI, identity, shipping).

**Pain proxy (cited ranges—use as “industry surveys,” not Repairo-specific):**

- Developers spend a large share of time on **maintenance and unplanned work**; integration-heavy stacks amplify this ([Truto](https://truto.one/blog/how-can-i-reduce-technical-debt-from-maintaining-dozens-of-third-party-api-integrations/), [86 SaaS](https://86saas.com/blog/technical-debt-of-saas) cite ~20–50% band depending on definition).
- **36%** of companies reported spending **more effort troubleshooting third-party APIs than building new features** ([Lunar.dev 2024 API consumption report](https://www.lunar.dev/report-2024)).
- Enterprise IT: **~35.5%** of time on designing/building/testing **custom integrations** (MuleSoft 2021 Connectivity Benchmark—build phase, not ongoing API drift alone).

**Simple SAM math (illustrative):**

1. **Target companies:** Software companies with ≥5 engineers integrating ≥2 external APIs (payments + AI + auth).  
   - Global: order **100k–500k** such teams (wide); narrow to **US/EU + India product companies** → **~30k–80k** (needs your own filter on LinkedIn/Apollo).
2. **Willingness to pay:** $79–249/org/mo (CLI + public/1-private free; Pro 5 private repos; Team unlimited).  
   - At **$790/yr** (Pro annual): **10k paying orgs ≈ $7.9M ARR** (SOM ambition, not a forecast).  
   - At **$2,490/yr** Team: **5k orgs ≈ $12.5M ARR**.
3. **Expansion:** Team overage (+$10/dev beyond 15 contributors), then Enterprise $6–12K/yr self-hosted license.

**TAM (narrative, not a single number):** Spend on **integration labor + incident cost** from external API change. Third-party integration maintenance is often quoted **$50k–$150k/yr per complex integration** in vendor content ([GVM 2026](https://gvmtechnologies.com/third-party-api-integration-hidden-costs/))—use only as “cost of status quo,” then show Repairo as partial automation of **detection + patch + review**.

### 2.2 Macro tailwinds (pitch bullets)

- **YC RFS “Self-Maintaining APIs”** — explicit category: neutral third-party “Dependabot for APIs,” per-provider agents, PRs with fixes ([YC RFS](https://www.ycombinator.com/rfs)).
- **More OpenAPI + AI APIs** → more contract surface (OpenAI, Anthropic, Gemini, etc.).
- **Optic archived (Jan 2026)** — gap in “spec change → developer workflow” for some teams ([DEV comparison 2026](https://dev.to/deepaksatyam/openapi-contract-testing-in-2026-oasdiff-vs-spectral-vs-pactflow-and-what-i-built-21an)).
- **Agentic coding** increases appetite for **repo access** if outcomes are **reviewable and deterministic** (aligns with Repairo positioning).

---

## 3. Competitive positioning

### 3.1 Layer map

| Layer | What it does | Examples | Repairo |
|-------|----------------|----------|---------|
| **Spec diff / CI gate** | Compare OpenAPI v1→v2; fail build | [oasdiff](https://www.oasdiff.com/) (1.3k★, 12M+ DL claimed), Spectral, Buf | Uses diff; adds **consumer impact + patch** |
| **Consumer contract testing** | Runtime / pact verification | [PactFlow](https://pactflow.io/) (~$99/mo+), BDCT, Drift | Complementary; Repairo is **spec + static consumer repair** |
| **Dependency bumps** | Package version PRs | Dependabot, Renovate | Bumps SDK; **does not fix call sites** when API contract breaks |
| **Third-party API maintenance** | Watch vendors + fix code | [mendapi](https://mendapi.com/), [contractbot](https://github.com/optimusbuilder/contractbot) | **Closest category peers** |
| **PR-time API break detection** | AST on your API changes | [BreakShield](https://github.com/vojtisprime11/BreakShield), [RiftCheck](https://www.riftcheck.dev/) | Repairo focuses on **external** vendor OpenAPI + **your** consumers |
| **General codemods** | AST migrations | Codemod.com, jscodeshift | Generic; Repairo is **OpenAPI-grounded** + compiler gate |

### 3.2 Positioning statement

**For** platform and product engineers who depend on third-party OpenAPI APIs,  
**Repairo** is a **repair plane** that diffs vendor specs, maps impact in TypeScript/JavaScript/Python/Go, and opens **compiler-checked PRs**—  
**unlike** Dependabot (package bumps only) or oasdiff alone (spec diff without consumer patches).

### 3.3 Differentiation checklist (defend in diligence)

| Claim | Evidence in Repairo |
|--------|---------------------|
| Deterministic repairs | AST transforms + test suite |
| Fail-closed AI | Agent only for ambiguous enums; no auto-merge |
| Multi-language consumers | TS/JS/Python/Go paths in engine |
| Distribution | npm CLI + GitHub App + hosted workspace |
| Honest scope | No fake SOC2; security page |

### 3.4 Competitive risks

- **mendapi / contractbot** — same narrative (“Dependabot for APIs”); may move faster on **provider feed + MCP**.
- **oasdiff + custom scripts** — “good enough” for spec-only teams.
- **GitHub / Stripe** — could ship native “API migration agent” (platform risk).
- **LLM agents** — “just ask Claude to fix it” (your counter: **evidence, tsc, PR discipline**).

---

## 4. Pitch narrative (10-slide spine)

1. **Hook:** “Your API didn’t break—your *integration* did. Stripe/OpenAI changed the contract; your repo still calls the old surface.”
2. **Problem:** External API drift → grep, incidents, 36% spend more time troubleshooting APIs than shipping (Lunar).
3. **Insight:** Dependabot updates packages; **call sites** still break. Spec diff tools stop at YAML—they don’t patch `src/`.
4. **Product:** Live demo: OpenAPI diff → impact → patch → `tsc` → PR (heyrepairo.in/demo).
5. **How it works:** [docs/architecture.md](./architecture.md) — same `runRepair()` graph as README and VC brief.
6. **Why now:** YC Self-Maintaining APIs RFS; agents normalized repo access; Optic gap.
7. **Business model:** Free CLI + App (public + 1 private) · Pro $79/org/mo (5 private repos) · Team $249/org/mo · Enterprise $6–12K/yr self-hosted.
8. **Traction:** **Honest** public numbers + design-partner pipeline (fill table §1.4).
9. **Moat:** Transform library per vendor, fail-closed repair scoring, GitHub distribution, open engine adoption.
10. **Ask:** $X for 18 months → N design partners, Y weekly PRs, Z MRR.

**One-liner:** Dependabot for third-party APIs—OpenAPI diff, impact map, reviewable repair PR.

---

## 5. Legal, cap table, and financials (checklist)

### 5.1 India (typical seed prep)

| Item | Action |
|------|--------|
| **Entity** | Pvt Ltd (or LLP if advised); confirm **India vs US holdco** if raising US VCs |
| **Cap table** | Founders %, ESOP pool **10–15%**, any angels on SAFE/notes |
| **IP** | Assign repo + brand to company; **Apache-2.0** CLI is fine; confirm contributor CLA if outsiders commit |
| **Contracts** | Pilot MSA + DPA; beta **Terms** / **Privacy** on site (review with counsel) |
| **Tax** | GST on SaaS if billing India customers; Stripe US entity vs Indian subsidiary |
| **RBI / FDI** | If US investors, understand **priced round vs SAFE** and filing norms (CA) |

### 5.2 US-style (if Delaware C-Corp or flipping)

| Item | Action |
|------|--------|
| **83(b)** | Founder stock elections if applicable |
| **SAFE / priced** | Standard YC SAFE templates |
| **Option pool** | Post-money pool sizing |
| **Data processing** | DPA for EU customers; no SOC2 claim until audit |

### 5.3 Financial model (minimal for seed)

- **Revenue:** Pro orgs × $79/mo + Team × $249/mo + enterprise licenses (manual).
- **COGS:** Vercel, Neon, Sarvam (Otto), GitHub API, Stripe fees.
- **Use of funds:** % eng (transform catalog), % GTM (design partners), % infra/compliance.

### 5.4 Data room (when investors ask)

- Incorporation docs, cap table, bank statements, Stripe revenue export, security page, architecture (DEPLOY.md), pilot agreements, roadmap/changelog.

---

## 6. Immediate actions (2 weeks)

1. **Instrument:** Plausible/PostHog + weekly export of workspaces, runs, PRs, Stripe MRR.
2. **Update deck** with §1.1 numbers and **pipeline table** (even 3 rows).
3. **Close 2–3 pilots** with written success criteria (not website quotes).
4. **Fix canonical URLs** in metadata (investors will open the site and GitHub).
5. **Competitive battlecard:** Repairo vs oasdiff vs mendapi vs Dependabot (one page).

---

## 7. Sources (external)

- YC Self-Maintaining APIs RFS: https://www.ycombinator.com/rfs  
- oasdiff: https://www.oasdiff.com/  
- mendapi: https://mendapi.com/ , https://github.com/mendapi/mendapi  
- contractbot: https://github.com/optimusbuilder/contractbot  
- BreakShield: https://github.com/vojtisprime11/BreakShield  
- RiftCheck: https://www.riftcheck.dev/  
- PactFlow Drift: https://pactflow.io/blog/schemas-can-be-contracts/  
- Lunar.dev API consumption report 2024: https://www.lunar.dev/report-2024  
- MuleSoft 2021 Connectivity Benchmark (PDF): integration time %  
- OpenAPI contract testing landscape 2026: https://dev.to/deepaksatyam/openapi-contract-testing-in-2026-oasdiff-vs-spectral-vs-pactflow-and-what-i-built-21an  
