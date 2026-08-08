# Repairo — Linear Sprint 1 Task Master Spec
**Sprint Duration:** August 3, 2026 – August 17, 2026 (2 Weeks)  
**Sprint Goal:** Launch Functional Core Beta MVP & YC-Level Landing Page

---

## 1. REP-5: OpenAPI Spec Changefeed Poller Engine
- **Assignee:** Rehan Pathan (Founding Backend / Security Lead)
- **Priority:** High (P1)
- **Labels:** `backend`, `engine`, `security`
- **Description:**
  Build the real-time background service that polls vendor OpenAPI spec repositories (OpenAI, Stripe, Google Gemini, Anthropic) every 15 minutes to catch breaking contract changes and schema deprecations.
- **Acceptance Criteria:**
  1. Cron worker set up using Next.js API route / background poller (`src/app/api/cron/poll-vendors/route.ts`).
  2. Parses JSON/YAML OpenAPI schemas and computes semantic diffs.
  3. Triggers event pipeline when breaking schema changes are detected.
  4. Fully typed TypeScript models with zero `any` types.

---

## 2. REP-6: Volatile RAM Vault & YC-Level Landing Page Polish
- **Assignee:** Sneha (Founding Full-Stack Lead)
- **Priority:** High (P1)
- **Labels:** `security`, `frontend`, `design`, `yc-tier`
- **Description:**
  Lead the security buffer layer and front-of-house UI polish for Repairo. Ensure 0% disk retention for customer code in RAM, and refine `src/app/page.tsx` into a YC P26 benchmark landing page inspired by `heyhyper.ai`, `linear.app`, and `resend.com`.
- **Acceptance Criteria:**
  1. Implement in-memory code streaming buffer with ~24ms purge cycle and zero disk persistence.
  2. Polish `src/app/page.tsx` with high-contrast brutalist design, floating header, and responsive storytelling cards.
  3. Ensure 100% Next.js static compilation & 60fps animations using Framer Motion.
  4. Pass zero-log audit verifying customer code is never written to disk or third-party servers.

---

## 3. REP-7: AST Compiler Engine & TypeScript Call-Site Parser
- **Assignee:** Jey Subhash (Founding AI / Core Engine Lead)
- **Priority:** High (P1)
- **Labels:** `engine`, `ast`, `compiler`, `core`
- **Description:**
  Build the deterministic TypeScript AST parsing engine using the official TypeScript Compiler API (`ts-morph` / `typescript`). Parse consumer repositories, locate exact call sites, and generate accurate syntax transformations for breaking API changes.
- **Acceptance Criteria:**
  1. Parse AST trees across multi-file TypeScript / Next.js codebases.
  2. Locate 100% of deprecated call sites (e.g. `openai.ChatCompletion.create` ➔ `openai.chat.completions.create`).
  3. 0% AI syntax hallucinations—transformations must be 100% deterministic.
  4. Unit test suite covering top 5 OpenAI & Stripe breaking change migrations.

---

## 4. REP-8: Automated GitHub PR Generator & Interactive IDE Showcase
- **Assignee:** Sachin (Founding Full-Stack Engineer)
- **Priority:** High (P1)
- **Labels:** `integrations`, `github`, `ui`
- **Description:**
  Build the automated GitHub Octokit integration that branches from default branch, commits AST refactored patches, and opens clean Pull Requests. Build the interactive web dashboard IDE diff preview card (`/app`).
- **Acceptance Criteria:**
  1. Octokit GitHub App integration (`src/app/api/github/pr/route.ts`).
  2. Automatically generate PR title, impact summary, and affected call site breakdown.
  3. Build interactive diff viewer component in `/app` showing red/green code diffs.
  4. Connect GitHub OAuth workflow for 1-click repository authorization.

---

## 5. REP-9: Distributed Systems High-Availability Architecture
- **Assignee:** Sanjay Nanda N J (Founding Systems & Platform Architecture Lead)
- **Priority:** High (P1)
- **Labels:** `infrastructure`, `systems`, `architecture`
- **Description:**
  Architect the enterprise-grade distributed processing pipeline for Repairo. Design queue worker fault-tolerance, worker pool auto-scaling, and SOC2-compliant encryption layer for customer repository webhooks.
- **Acceptance Criteria:**
  1. Technical Architecture RFC for high-concurrency webhook ingestion.
  2. Queue worker retry & dead-letter queue (DLQ) specification.
  3. Security & SOC2 compliance isolation blueprint.
