# Repairo Technical Architecture, System Process & Workflow Documentation

**Company:** Repairo Inc. (Sarvam Startup Program Backed)  
**Document Version:** 1.0 (Engineering Architecture Release)  
**Target Audience:** Engineering Leads, Core Security Team, & Investors  

---

## 1. System Overview & Core Mission
Repairo is an automated API dependency maintenance platform built for modern engineering teams. When third-party API vendors (OpenAI, Google Gemini, Stripe, Supabase) publish breaking changes, deprecate parameters, or release new major SDK versions, Repairo automatically detects the breaking contract changes, scans customer codebases, and generates deterministic, zero-retention GitHub Pull Requests to fix the broken code.

---

## 2. End-to-End System Workflow

```
┌───────────────────────────┐      ┌───────────────────────────┐
│ 1. Vendor OpenAPI Poller  │ ───► │ 2. Repository Spec Scan   │
│ (Monitors 500+ endpoints) │      │ (Detects call-site deltas)│
└───────────────────────────┘      └─────────────┬─────────────┘
                                                 │
                                                 ▼
┌───────────────────────────┐      ┌───────────────────────────┐
│ 4. Automated PR Engine    │ ◄─── │ 3. Volatile RAM AST Engine│
│ (Opens verified GitHub PR)│      │ (~24ms purge cycle)       │
└───────────────────────────┘      └───────────────────────────┘
```

### Step 1: OpenAPI Specification Polling & Contract Diffing
- Background poller microservices running on Railway continuously fetch updated OpenAPI YAML/JSON schema definitions from vendor changefeeds (e.g., OpenAI v3 ➔ v4, Stripe API versions, Gemini 1.5).
- The **Contract Spec Differ** compares the old spec vs new spec and generates a **Breaking Change Matrix** detailing renamed methods, deprecated parameters, and structural payload shifts.

### Step 2: Repository Scanning (`@repairo/cli` & GitHub Webhooks)
- When a breaking change is registered, Repairo triggers a scan across connected user repositories.
- The scanner searches for call-site patterns matching deprecated vendor methods (e.g., `openai.ChatCompletion.create` or `stripe.charges.create`).

### Step 3: Volatile RAM AST Transformation Engine
- Repairo streams the matching source code into an isolated, volatile RAM buffer (Zero-Retention Vault).
- The Abstract Syntax Tree (AST) engine (using **TypeScript Compiler API**, **Babel**, and **Tree-sitter**) parses the AST nodes, applies deterministic AST refactoring rules, and rewrites the call-sites to the updated vendor SDK syntax.
- **Immediate Memory Purge:** The moment AST transformation completes, the buffer memory is zeroed out in ~24ms. **Zero customer code is ever written to disk.**

### Step 4: Automated Verification & GitHub PR Generation
- The refactored code is verified against syntax checks and automated test suites.
- Repairo uses the GitHub REST/GraphQL API to push a clean git branch and open an automated Pull Request containing unified git diffs, migration notes, and vendor changelog references.

---

## 3. Security & DevSecOps Architecture

As **Founding Security & DevSecOps Lead (Rehan Shaikh)**, your domain oversees the following core security pillars:

### 🛡️ 1. Zero-Retention Memory Vault
- All repository code processing occurs strictly in volatile RAM.
- **Zero Disk Persistence:** No code files, AST tokens, or temporary snippets are saved to disk storage, databases, or log files.
- **RAM Purge Verification:** Automated memory flushing routines zero out memory blocks in ~24ms.

### 🛡️ 2. SBOM CVE Dependency Scanning
- Every generated Pull Request includes an automated **Software Bill of Materials (SBOM)** security audit.
- Automated GitHub Actions workflows (`.github/workflows/sbom-scan.yml`) utilize scanners (Trivy / Grype) to ensure patched dependencies contain 0 high/critical CVE vulnerabilities.

### 🛡️ 3. Infrastructure & Cluster Hardening
- **Deployment Topology:** 
  - **Frontend & Edge API Routes:** Next.js 16 hosted on Vercel Edge Serverless Network.
  - **Background Poller & DB Workers:** Containerized Node.js/Python microservices running on Railway with isolated VPC networking.
- **Authentication & Secrets:** GitHub OAuth 2.0 with encrypted HTTP-only session cookies and AES-256 secret vaulting.

---

## 4. Primary Vendor Integrations
Repairo actively maintains automated repair transformation rules for top developer API ecosystems:
1. **OpenAI SDK:** Automatic migration from `v0.28` ➔ `v1.0+` (`openai.ChatCompletion` ➔ `openai.chat.completions`).
2. **Google Gemini API:** Automatic migration from Gemini 1.0 ➔ Gemini 1.5 Flash / Pro model specs.
3. **Stripe API:** PaymentIntent and Charge method parameter updates across API version headers.
4. **Supabase Client:** Client initialization and Auth v2 breaking change refactoring.

---

## 5. Engineering Team Contact & Support
- **Founder & CEO:** Aditya  
- **Founding Security & DevSecOps Lead:** Rehan Shaikh  
- **Repository:** `https://github.com/adityacs50-lab/Repairo`  
- **Production URL:** `https://heyrepairo.in`
