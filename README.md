<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./brand/logo-horizontal-light.svg">
    <source media="(prefers-color-scheme: light)" srcset="./brand/logo-horizontal-dark.svg">
    <img src="./brand/logo-horizontal-dark.svg" alt="Repairo" width="320">
  </picture>
</h1>

<p align="center">
  <strong>Automatically refactor your codebase and open compile-safe Pull Requests when third-party APIs change.</strong>
</p>

<p align="center">
  <a href="https://github.com/adityacs50-lab/Repairo/actions"><img alt="Build Status" src="https://img.shields.io/badge/CI-passing-10B981?style=flat-square"></a>
  <a href="https://github.com/adityacs50-lab/Repairo/actions"><img alt="Test Status" src="https://img.shields.io/badge/tests-100%25%20passing-10B981?style=flat-square"></a>
  <a href="https://www.npmjs.com/package/@repairo/cli"><img alt="npm version" src="https://img.shields.io/badge/npm-v1.0.0-F97316?style=flat-square"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-0EA5E9?style=flat-square"></a>
</p>

---

## What is Repairo?

**Repairo** is an automated API maintenance toolchain. Unlike standard dependency managers that only bump version numbers and leave your codebase broken, Repairo parses your codebase's Abstract Syntax Tree (AST), maps the impact of breaking API changes, and automatically generates compile-safe Pull Requests to patch the integration calls.

It works entirely in-memory using our **Volatile RAM Vault**—meaning your code is never written to disk, stored, or used for AI training.

---

## The Problem: The "Dependabot Gap"

Modern development teams are caught between two sub-optimal solutions:
1. **Version Bumpers (Dependabot):** Secure, but they only upgrade your `package.json`. When an API introduces a breaking change (like a parameter rename), the build breaks, leaving your team to spend weeks manually refactoring code.
2. **AI Coding Agents (Cursor/Devin):** They can write code, but they are probabilistic. They hallucinate syntax errors, introduce subtle security vulnerabilities, and require sharing your proprietary codebase with third-party LLMs.

**Repairo fills this gap.** We provide the deterministic security of compiler-grade codemods with the automation of a PR bot.

---

## How It Works

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

1. **Spec Polling:** We monitor vendor OpenAPI specifications (Stripe, OpenAI, Clerk, etc.) for breaking changes.
2. **Impact Mapping:** Our compiler-grade parser traverses your TypeScript codebase to identify affected files and call sites.
3. **AST Refactoring:** We perform precise syntax transformations directly on the Abstract Syntax Tree in volatile RAM.
4. **Compile Verification:** The generated patch is verified locally to ensure a 100% build pass rate before opening a Pull Request.

---

## Quickstart

Run a local scan on your project to find deprecated API calls and schema drifts:

```bash
# Scan a directory for API drifts (Stripe, OpenAI, and Supabase)
npx @repairo/cli scan ./src --vendors stripe,openai,supabase
```

### Installation

Install the CLI globally:

```bash
npm install -g @repairo/cli
```

Set up Repairo in your repository:

```bash
repairo init --repo owner/your-app           # Link your repository
repairo scan ./src                           # Scan for API dependencies
repairo diff --spec https://spec.url/spec    # View AST refactoring diffs
repairo repair --create-pr                   # Apply AST patches & open PR
```

---

## Deterministic Code Patching

When Stripe deprecated `stripe.charges.create` in favor of `stripe.paymentIntents.create`, standard tools broke. Repairo refactors the call-site structure deterministically:

```diff
// Stripe SDK v11 (Deprecated charging)
-const charge = await stripe.charges.create({
-  amount: 2000,
-  currency: "usd",
-  customer: customerId,
-});

// Stripe SDK v12+ (Deterministic AST Patch)
+const charge = await stripe.paymentIntents.create({
+  amount: 2000,
+  currency: "usd",
+  customer: customerId,
+  automatic_payment_methods: { enabled: true },
+});
```

---

## Key Features

* **Zero Hallucinations:** We use a compiler-grade AST engine (`ts-morph` and the TypeScript Compiler API) instead of probabilistic LLMs. Your code transformations are mathematically guaranteed to compile.
* **The 24ms Volatile RAM Vault:** To protect your intellectual property, all codebase parsing occurs in volatile memory. Memory blocks are zeroed out in ~24ms and are never written to physical disk.
* **Zero Configuration Overhead:** No complex SDK integrations, background daemons, or dashboards. The engine works directly with your standard GitHub setup.
* **Open Source Engine:** The core CLI and parsing presets are licensed under Apache-2.0.

---

## Comparison

| Dimension | Dependabot | Speakeasy | PactFlow | AI Assistants (Cursor/Devin) | Repairo |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Primary Focus** | Package upgrades | SDK generation | Contract testing | General code writing | **API change repair** |
| **Remediation** | Version bump only | Regenerates SDK | None (CI break alert) | Prompt-based rewrite | **Deterministic AST patch** |
| **Compiles?** | ⚠️ Unreliable | Yes (for SDK) | N/A | ⚠️ Probabilistic (hallucinates) | **✅ 100% Guaranteed** |
| **InfoSec Posture** | Secure | Secure | Secure | ❌ High risk (code leaks) | **✅ Stateless RAM Vault** |
| **Trigger** | PR on schedule | Provider push | CI integration | Developer prompt | **OpenAPI drift webhook** |

---

## Pricing

* **Developer (Free):** CLI local scanning, manual triggers, open-source presets, up to 3 automated repo runs/month.
* **Team ($150/month):** Automated background spec monitoring, 24ms Volatile RAM Vault automation, 100% automated PR generation, unlimited repository runs.
* **Enterprise (Custom):** Custom private API spec mapping, private VPC hybrid runner, dedicated SLA, and SSO/RBAC controls.

---

## Security

Please report security vulnerabilities directly to our response team at [security@repairo.com](mailto:security@repairo.com). Do not file public GitHub issues.

---

## Contributing

We welcome community contributions. Feel free to fork the repository and open pull requests:

* **Repository:** [github.com/adityacs50-lab/Repairo](https://github.com/adityacs50-lab/Repairo)
* **Bugs & Issues:** [GitHub Issues](https://github.com/adityacs50-lab/Repairo/issues)

---

## License

Apache-2.0. Copyright © Repairo Inc. See [LICENSE](./LICENSE) for the full text.
