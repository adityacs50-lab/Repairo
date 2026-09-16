# Repairo — Technical deep dive (for technical diligence)

**Company:** Repairo AI · https://www.heyrepairo.in  
**Code:** https://github.com/adityacs50-lab/Repairo (Apache-2.0 engine + CLI on npm as `repairo-cli`)  
**Contact:** info@heyrepairo.in · https://www.heyrepairo.in/contact  
**Date:** September 2026  

This document is written for partners who passed on a shallow intro and asked for **engineering substance**. It describes what we built, how it works, how we test it, and what we deliberately do *not* claim.

---

## 1. One paragraph

Repairo is a **deterministic repair plane** between **third-party OpenAPI contracts** and **application code**. We diff vendor specs (before → after), classify breaking changes, **statically locate consumer call sites** in TypeScript/JavaScript (ts-morph), Python, and Go, apply **scoped AST/token transforms**, and gate every proposed patch with **compiler/syntax validation** before a GitHub PR is offered. Large language models are **optional** and **narrow**: they may propose a target enum value when the spec diff is ambiguous; proposals are schema-validated, capped per run, and **never** auto-merge eligible. The hosted product adds OAuth, vendor polling, and a GitHub App; the **same `runRepair()` pipeline** powers CLI, `/api/repair`, and the GitHub App.

---

## 2. Why this is a systems problem (not a chat wrapper)

| Failure mode | Dependabot / Renovate | Spec diff only (e.g. oasdiff) | LLM “fix my repo” | Repairo |
|--------------|----------------------|-------------------------------|-------------------|---------|
| Package version bumped | Yes | — | — | — |
| Call sites still wrong after SDK bump | No | No | Maybe | Yes (AST) |
| Proof patch typechecks | N/A | N/A | Rarely | Yes (tsc / syntax / optional Pyright) |
| Ambiguous enum remap | N/A | Flags only | Guesses | Flag or constrained LLM proposal |
| Sends full source to model | — | — | Often | No (agent path: field + candidates only) |
| Auto-merge | — | — | Risky | Off if any agent-assisted fix |

The hard parts are **scope** (do not rename unrelated identifiers), **soundness** (validation), and **provenance** (every line in the PR is traceable to a spec rule + transform id).

---

## 3. Architecture

```
  [before OpenAPI] ──┐
  [after OpenAPI]  ──┼──► parseOpenApi ──► diffOpenApi ──► ApiChange[]
                     │
  [consumer files] ──┼──► findImpactedCode ──────────────► ImpactMatch[]
                     │
                     │     optional agentResolve
                     │              ▼
                     │     resolveAmbiguousEnums
                     │              │
                     └──────────────┼──► generateFixes
                                    ▼
                         buildPullRequest (safetyScore, auto-merge flags)
                                    ▼
                         validateInMemory (runRepair) or validateCodebase (CLI repair)
                                    ▼
                         RepairRunResult + SBOM
```

See docs/architecture.md in the repo for CLI vs hosted validation notes.

**Single orchestrator:** `runRepair()` in `src/lib/engine/index.ts` — hosted API, demo, GitHub App. CLI `repairo repair` shares generateFixes/impact; validates on disk before apply/PR.

**Deployment (hosted):** Next.js on Vercel, Neon Postgres (workspaces, integrations, run history), encrypted GitHub tokens, GitHub App webhooks for spec-touching PRs.

---

## 4. Pipeline stages (implementation map)

### 4.1 Spec ingestion

- OpenAPI 3.x YAML/JSON via `yaml` parse.
- Google Discovery documents converted to OpenAPI-shaped structures (`discovery.ts`).
- Stainless `.stats.yml` indirection for pinned `openapi_spec_url` (`fetch-spec.ts`).
- Optional **oasdiff** binary integration (`oasdiff.ts`); internal `diff.ts` + `spec-diff.ts` for repair-oriented `ApiChange` taxonomy.

### 4.2 Breaking-change taxonomy

`spec-diff.ts` implements **nine explicit breaking rules** (endpoint removed, method removed, required param added, request field required, param removed, response field removed, type change, enum value removed, auth change) with **line-attributed** evidence in the spec.

### 4.3 Impact analysis (static, not grep)

- **TypeScript/JavaScript:** ts-morph — symbol resolution, call aliases, ignores string literals and non-call contexts.
- **Python:** tokenizer-based scan — skips comments/strings; SDK attribution (not naive `requests` grep).
- **Go:** struct tags and call patterns.
- **URL path matching** for removed endpoints (literal or templated paths).

### 4.4 Repair generation (deterministic core)

- Required field insertion scoped to API request objects (red-team: no leakage into sibling objects).
- Enum renames with 1:1 spec evidence; ambiguous removals flagged, not guessed.
- Cross-file fixtures with clean `tsc` post-repair.
- Impact-scoped repair: unimpacted files never touched.

### 4.5 Optional LLM (fail-closed)

`agent-resolve.ts`: two gates (flag + API key); hosted repair API does not enable agent resolve; `validateProposal()`; cap on resolutions per run; duplicate-target conflicts discard the group; agent-assisted PRs never auto-merge eligible.

### 4.6 Validation gate

In-memory TS program (hosted), disk `tsc --noEmit`, Python/Go syntax, optional Pyright, baseline-aware validation (ignore pre-existing errors, fail on new ones).

### 4.7 Delivery

CLI (`repairo-cli`), GitHub App (OpenAPI PR comments + fix PR), hosted workspace + vendor polling.

---

## 5. Evidence and quality bar

| Artifact | Detail |
|----------|--------|
| Integration suite | 135 assertions in `tests/run-tests.ts` (engine), plus python-repair, go-repair, github-app, web-app, otto in `npm test` |
| Red-team tests | Ambiguous enums, agent cap, conflict discard, impact scoping, PR labeling |
| Public demo | https://www.heyrepairo.in/demo |
| Repro | `git clone` → `npm ci` → `npm test` |

We do **not** claim formal verification or zero false positives. We claim deterministic transforms, explicit ambiguous flags, compiler/syntax gates, and no silent auto-merge on AI-assisted diffs.

---

## 6. Production-ready vs beta

| Component | Maturity |
|-----------|----------|
| Engine + CLI | Shipped (npm 0.4.0, Apache-2.0) |
| TS/JS repair + validation | Strong |
| Python / Go | Supported; growing transform catalog |
| Hosted workspace + Stripe Pro | Beta ($29/mo) |
| Enterprise SOC2/VPC | Roadmap |
| Distribution | Early (~258 npm downloads/month, Sep 2026) |

---

## 7. Competitive technical positioning

- **oasdiff / Spectral / Pact:** detection and governance; Repairo adds consumer impact + patch + PR.
- **mendapi / contractbot:** same category; we differentiate on open engine, fail-closed agent boundary, multi-language repair in one graph.
- **Dependabot:** complements package bumps with contract-level repairs.

---

## 8. Suggested 45-minute technical session

1. Live trace: Stripe-style fixture in demo UI (10 min).
2. Code walk: `runRepair()` + `validateProposal()` + one red-team test (15 min).
3. Failure modes: ambiguous enum, agent cap, validation fail-closed (10 min).
4. Roadmap: vendor transforms, Go depth, provider agents (10 min).

---

## 9. Verify without trusting us

```
git clone https://github.com/adityacs50-lab/Repairo.git
cd Repairo && npm ci && npm test
npm run demo:engine
npx repairo-cli scan ./fixtures
```

---

## 10. Closing

If the earlier note was “not technically deep enough to dive in,” the gap was likely **packaging**, not absence of engineering. This brief maps **claims → files → tests**.

**Repairo AI** · https://www.heyrepairo.in · https://github.com/adityacs50-lab/Repairo
