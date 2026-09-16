# Repairo — Technical deep dive (for technical diligence)

**Company:** Repairo AI · https://www.heyrepairo.in  
**Code:** https://github.com/adityacs50-lab/Repairo (Apache-2.0 engine + CLI on npm as `repairo-cli`)  
**Contact:** [your name] · [email]  
**Date:** September 2026  

This document is written for partners who passed on a shallow intro and asked for **engineering substance**. It describes what we built, how it works, how we test it, and what we deliberately do *not* claim.

---

## 1. One paragraph

Repairo is a **deterministic repair plane** between **third-party OpenAPI contracts** and **application code**. We diff vendor specs (before → after), classify breaking changes, **statically locate consumer call sites** in TypeScript/JavaScript (ts-morph), Python, and Go, apply **scoped AST/token transforms**, and gate every proposed patch with **compiler/syntax validation** before a GitHub PR is offered. Large language models are **optional** and **narrow**: they may propose a target enum value when the spec diff is ambiguous; proposals are schema-validated, capped per run, and **never** auto-merge eligible. The hosted product adds OAuth, vendor polling, and a GitHub App; the **same `runRepair()` pipeline** powers CLI, `/api/repair`, and the GitHub App.

---

## 2. Why this is a systems problem (not a chat wrapper)

| Failure mode | Dependabot / Renovate | Spec diff only (e.g. oasdiff) | LLM “fix my repo” | Repairo |
|--------------|----------------------|-------------------------------|-------------------|---------|
| Package version bumped | ✅ | — | — | — |
| **Call sites** still wrong after SDK bump | ❌ | ❌ | Maybe | ✅ (AST) |
| Proof patch typechecks | N/A | N/A | Rarely | ✅ (`tsc` / syntax / optional Pyright) |
| Ambiguous enum remap | N/A | Flags only | Guesses | **Flag** or **constrained LLM proposal** |
| Sends full source to model | — | — | Often | **No** (agent path: field + candidates only) |
| Auto-merge | — | — | Risky | **Off** if any agent-assisted fix |

The hard parts are **scope** (do not rename unrelated identifiers), **soundness** (validation), and **provenance** (every line in the PR is traceable to a spec rule + transform id).

---

## 3. Architecture

```mermaid
flowchart TB
  subgraph inputs
    B[before OpenAPI]
    A[after OpenAPI]
    C[consumer files TS/JS/Py/Go]
  end

  B --> P[parseOpenApi]
  A --> P
  P --> D[diffOpenApi / oasdiff optional]
  D --> CH[ApiChange[]]
  CH --> I[findImpactedCode]
  C --> I
  I --> IM[ImpactMatch[]]
  CH --> AR{agentResolve?}
  AR -->|optional| R[resolveAmbiguousEnums]
  AR -->|no| GF
  R --> GF[generateFixes]
  IM --> GF
  C --> GF
  GF --> V[validateInMemory / validateCodebase]
  GF --> PR[buildPullRequest + safetyScore]
  V --> PR
  PR --> OUT[RepairRunResult + SBOM]
```

**Single orchestrator:** `runRepair()` in `src/lib/engine/index.ts` — used by CLI, hosted API, and GitHub repair flows.

**Deployment (hosted):** Next.js on Vercel, Neon Postgres (workspaces, integrations, run history), encrypted GitHub tokens, GitHub App webhooks for spec-touching PRs. See `DEPLOY.md`.

---

## 4. Pipeline stages (implementation map)

### 4.1 Spec ingestion

- **OpenAPI 3.x** YAML/JSON via `yaml` parse.
- **Google Discovery documents** converted to OpenAPI-shaped structures (`discovery.ts`) for Gemini-style feeds.
- **Stainless `.stats.yml`** indirection for pinned `openapi_spec_url` (`fetch-spec.ts`, tests 19–20 in `tests/run-tests.ts`).
- Optional **oasdiff** binary integration for parity with industry diff engines (`oasdiff.ts`); internal `diff.ts` + `spec-diff.ts` for repair-oriented `ApiChange` taxonomy.

### 4.2 Breaking-change taxonomy

`spec-diff.ts` implements **nine explicit breaking rules** (endpoint removed, method removed, required param added, request field required, param removed, response field removed, type change, enum value removed, auth change) with **line-attributed** evidence in the spec.

Repair pipeline uses `diffOpenApi()` → `ApiChange[]` with severities (`breaking` / `additive` / …) consumed by impact and transforms.

### 4.3 Impact analysis (static, not grep)

- **TypeScript/JavaScript:** `ts-morph` — resolves symbols, follows call aliases, ignores string literals and non-call contexts (regression tests 4b–4c).
- **Python:** tokenizer-based reference scan (`python-syntax.ts`, `python-transformer.ts`) — skips comments/strings; no false positives from generic `requests.post` without SDK attribution (test 7c).
- **Go:** struct tags and call patterns (`go-transformer.ts`, `go-syntax.ts`).
- **URL path matching** for removed endpoints when consumers use literal or templated paths (test 20).

Output: `ImpactMatch[]` with file, line, snippet, confidence, reason.

### 4.4 Repair generation (deterministic core)

`ast-transformer.ts` + language transformers apply:

- Required field insertion **scoped to API request objects** (not sibling headers/objects — red-team tests 13b).
- Enum renames with **1:1 spec evidence**; ambiguous removals **flagged**, not guessed (tests 15, 22).
- Cross-file shipping fixture with **clean `tsc`** post-repair (test 21).
- **Impact-scoped** repair: unimpacted files never touched (test 9b).

Patches are unified diff strings attached to `SuggestedFix` with `safe`, `origin` (`deterministic` vs `agent-proposed`), and safety metadata.

### 4.5 Optional LLM (fail-closed)

`agent-resolve.ts`:

- **Two gates:** CLI/host flag `agentResolve` **and** `ANTHROPIC_API_KEY`.
- **Hosted `/api/repair*` does not enable agent resolve** (by design — see `runRepair` comment).
- Proposals validated by `validateProposal()` (candidate enum ∈ allowed set, confidence bounds, reasoning required).
- **`maxAgentResolutions`** cap (default 20); overflow → manual review path.
- **Duplicate-target conflicts** → discard entire group (test 28).
- PRs with any agent-proposed fix: **`autoMergeEligible = false`**, distinct PR body section (test 29).

### 4.6 Validation gate

- **`validateInMemory`:** in-memory TS program over merged consumer files (hosted path without full checkout).
- **`validateCodebase`:** disk `tsc --noEmit`, Python syntax, Go syntax; optional **Pyright** when project config exists (test 9d).
- **JS/mjs/cjs** consumers included (test 9c).
- **Baseline-aware** validation: ignore pre-existing diagnostics, fail on new ones (test 11).

Failed validation → lowers `safetyScore`, disables auto-merge eligibility.

### 4.7 Delivery

- **CLI:** `repairo-cli` — scan, check, repair, `--create-pr`, CI baselines under `.repairo/snapshots/`.
- **GitHub App:** webhook on OpenAPI-touched PRs → breaking table + optional fix PR (`src/github-app/`).
- **Hosted:** workspace integrations, vendor catalog polling (`poll-vendors` cron), Quick Repair from OAuth.

---

## 5. Evidence & quality bar

| Artifact | Detail |
|----------|--------|
| **Integration suite** | **135** assertions in `tests/run-tests.ts` (engine), plus `python-repair`, `go-repair`, `github-app`, `web-app`, `otto` suites in `npm test` |
| **Red-team tests** | Ambiguous enums, substring field matching, enum leakage to unrelated types, agent cap, conflict discard, agent PR labeling |
| **Public demo** | https://www.heyrepairo.in/demo — same engine via `/api/repair` fixtures |
| **Repro** | `git clone` → `npm ci` → `npm test` → `npx repairo-cli scan ./fixtures` |

We do **not** claim formal verification or zero false positives. We claim **deterministic transforms + explicit ambiguous flags + compiler/syntax gates + no silent auto-merge on AI-assisted diffs**.

---

## 6. What is production-ready vs beta

| Component | Maturity |
|-----------|----------|
| Engine + CLI | **Shipped** (npm 0.4.0, Apache-2.0) |
| TS/JS repair + validation | **Strong** (largest test surface) |
| Python / Go | **Supported** with growing transform catalog |
| Hosted workspace + Stripe Pro | **Beta** ($29/mo defined; early users) |
| Enterprise SOC2/VPC | **Roadmap** (stated honestly on `/security`) |
| Distribution | **Early** (~258 npm DL/month, 2 GitHub stars as of Sep 2026) |

---

## 7. Competitive technical positioning

- **oasdiff / Spectral / Pact:** contract **detection** and governance; Repairo adds **consumer impact + patch + PR**.
- **mendapi / contractbot:** same category narrative; our differentiation is **open engine**, **fail-closed agent boundary**, and **multi-language consumer repair** in one `runRepair()` graph.
- **Dependabot:** orthogonal — we complement package bumps with **contract-level** repairs.

---

## 8. Suggested 45-minute technical session

1. **Live trace:** Stripe-style `customer.source` removal fixture — diff → impact lines → patch → `tsc` output in demo UI (10 min).
2. **Code walk:** `runRepair()` + `validateProposal()` + one red-team test (15 min).
3. **Failure modes:** ambiguous enum, agent cap, validation fail-closed (10 min).
4. **Roadmap:** transform catalog per vendor, deeper Go, provider-side agents (10 min).

We can share screen on the repo, not a slide deck.

---

## 9. Verify without trusting us

```bash
git clone https://github.com/adityacs50-lab/Repairo.git
cd Repairo && npm ci
npm test                    # full suite
npm run demo:engine         # CLI fixture run
```

OpenAPI-only diff experiment:

```bash
npx repairo-cli diff --spec path/to/new-openapi.yaml
```

---

## 10. Closing

If the earlier note was “not technically deep enough to dive in,” the gap was likely **packaging**, not absence of engineering. This brief maps **claims → files → tests**. We welcome a partner who cares about **static analysis, patch soundness, and fail-closed ML boundaries**—not another generic “AI for DevOps” pitch.

**Repairo AI** · https://www.heyrepairo.in · https://github.com/adityacs50-lab/Repairo
