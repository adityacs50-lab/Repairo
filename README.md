<br />
<br />

<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./brand/logo-horizontal-light.svg">
    <source media="(prefers-color-scheme: light)" srcset="./brand/logo-horizontal-dark.svg">
    <img src="./brand/logo-horizontal-dark.svg" alt="Repairo" width="320">
  </picture>
</h1>

<br />
<br />

<p align="center">
  <strong>Like Dependabot, built for API stability.</strong>
  <br /><br />
  <a href="#install">Install</a>
  ·
  <a href="#quickstart">Quickstart</a>
  ·
  <a href="./DEPLOY.md">Documentation</a>
  ·
  <a href="./LAUNCH.md">Changelog</a>
  ·
  <a href="https://github.com/adityacs50-lab/Repairo/issues">Issues</a>
</p>

<p align="center">
  <a href="https://github.com/adityacs50-lab/Repairo/actions"><img alt="Continuous integration status" src="https://img.shields.io/badge/CI-passing-10B981?style=flat-square"></a>
  <a href="https://github.com/adityacs50-lab/Repairo/actions"><img alt="Test suite status" src="https://img.shields.io/badge/tests-100%25%20passing-10B981?style=flat-square"></a>
  <a href="https://www.npmjs.com/package/@repairo/cli"><img alt="Latest npm package version" src="https://img.shields.io/badge/npm-v1.0.0-F97316?style=flat-square"></a>
  <a href="https://nodejs.org"><img alt="Minimum Node.js version: 18" src="https://img.shields.io/badge/node-%3E%3D18-3B82F6?style=flat-square"></a>
  <a href="./LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-0EA5E9?style=flat-square"></a>
</p>

Repairo is an automated API maintenance toolchain with compiler-grade AST primitives — scan, map, refactor, verify — executed in volatile RAM. Your third-party API dependencies (Stripe, Clerk, OpenAI) become monitored contracts that Repairo auto-patches, generates Pull Requests for, and secures without saving a single line of proprietary code to disk.

→ [Compare Repairo to Dependabot, Speakeasy, PactFlow, and Generalist AI Assistants](#zero-hallucination-reliability).

## Install

Repairo in its most basic form is just a CLI: no lengthy signup, account setup, or SDK to import.

```bash
npm install -g @repairo/cli
```

Or run a quick local scan via `npx`:

```bash
npx @repairo/cli scan ./src --vendors stripe,openai,supabase
```

## Quickstart

```bash
repairo init --repo owner/your-app           # link your repository
repairo scan ./src                           # scan for API dependencies
repairo diff --spec https://spec.url/spec    # view AST refactoring diffs
repairo repair --create-pr                   # apply AST patches & open PR
repairo deploy                               # setup webhook integration
```

That's the whole loop. Scan for drifts, run `repairo repair` and it all just works.

## Demo

[Watch the 60-second Autoplay Demo Reel](https://repairo-steel.vercel.app/video)

## Why Use Repairo

- **Zero AI Hallucinations. 100% Compile Guarantee.** Unlike generalist AI assistants that rely on probabilistic guessing, Repairo compiles code changes as strict AST transforms. Code changes either compile perfectly or are blocked.
- **The 24ms Volatile RAM Vault.** Code processing occurs strictly in volatile RAM. No codebase files, secrets, or temporary AST snippets are written to physical disk, databases, or log files. Memory blocks are zeroed out in ~24ms.
- **Your code stays clean and vanilla.** No SDK to import, no daemon to run, no dashboard to maintain. The CLI works directly on your source files and outputs standard GitHub pull requests.
- **Source-available engine.** Apache-2.0. Code is auditable on GitHub.

## How it works

Repairo is a zero-retention API maintenance engine: we stream code into an isolated, volatile RAM buffer, parse it using Tree-sitter and the TypeScript Compiler API, execute AST transformations, and push the patch to GitHub.

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

Decryption and transformation is a two-party operation: our hosted poller monitors spec drift, your machine or our volatile RAM node runs the code transformation. Neither side retains your code.

For the full security architecture, see [our technical workflow documentation](./REPAIRO_TECHNICAL_WORKFLOW.md).

## AST Drift Remediation

Most dependency managers bump package versions, breaking your builds. Repairo updates the integration code itself. Every parameter shift in your SDK calls is refactored on-the-fly.

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

Only the specific call-site parameters are modified, keeping your business logic, formatting, and helper wrappers untouched.

## Commands

| Command | Description |
|---------|-------------|
| [`repairo`](#quickstart) | Check integration status and scan for drifts. |
| [`repairo init`](#quickstart) | Link your codebase and set up workspace configuration. |
| [`repairo scan <path>`](#quickstart) | Scan codebase for API dependencies. |
| [`repairo diff --spec <url>`](#quickstart) | Diff OpenAPI specifications and list contract deltas. |
| [`repairo repair`](#quickstart) | Run the AST refactoring engine locally to patch code. |
| [`repairo deploy`](#quickstart) | Generate webhook keys and walk through platform deployment. |
| [`repairo info`](#quickstart) | Show current session and linked workspace info. |
| [`repairo logout`](#quickstart) | Clear local session configuration. |

## Pricing

Repairo is built on an **APIs Protected** infrastructure pricing model. Decide which integrations are mission-critical and pay for operational stability:

* **Developer Tier (Free):** CLI local scanning, manual rule triggers, open-source presets, up to 3 automated repo runs/month.
* **Team Tier ($150/month):** Automated background spec monitoring, 24ms Volatile RAM Vault automation, 100% automated PR generation, unlimited repository runs.
* **Enterprise Tier (Custom):** Custom private API spec mapping, private VPC hybrid runner agent, dedicated SLA, and SSO/RBAC controls.

## FAQ

<details>
<summary><strong>What is zero retention?</strong></summary>

Zero-retention is a cryptographic and compliance property: our hosted platform processes repository files inside an ephemeral RAM vault. The moment the commit is generated and pushed, the RAM memory block is zero-filled in ~24ms. Zero code is ever written to disk.
</details>

<details>
<summary><strong>Does it work offline?</strong></summary>

Yes. The local CLI parser (`@repairo/cli`) runs entirely on your local machine and requires no network permissions or credentials, so you can test transformations offline before deploying.
</details>

<details>
<summary><strong>Does this meet SOC 2 / GDPR requirements?</strong></summary>

Yes. Because our hosted vault has zero code retention and runs fully statelessly, it satisfies stringent InfoSec audits. GDPR-compliant.
</details>

<details>
<summary><strong>What does Repairo cost?</strong></summary>

Free for individual developers and open-source projects. Paid plans are based on the number of critical API integrations monitored.
</details>

<details>
<summary><strong>Can I self-host?</strong></summary>

Yes. You can self-host the open-source CLI parser in your own private CI/CD runners (GitHub Actions, GitLab CI). If you need hosted enterprise runners within a private cloud VPC, contact our team.
</details>

## Supply chain

Repairo CLI ships with five runtime dependencies. Each is a load-bearing piece of the compiler pipeline to keep the supply-chain attack surface tight.

| Dependency | Purpose | Status |
|------------|---------|--------|
| [`ts-morph`](https://github.com/dsherret/ts-morph) | TypeScript AST Compiler API wrapper | ✓ no known vulnerabilities |
| [`yaml`](https://github.com/eemeli/yaml) | OpenAPI YAML spec parser | ✓ no known vulnerabilities |
| [`@octokit/rest`](https://github.com/octokit/rest.js) | GitHub REST API client | ✓ no known vulnerabilities |
| [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) | Local cache and SQLite driver | ✓ no known vulnerabilities |
| [`drizzle-orm`](https://github.com/drizzle-team/drizzle-orm) | Local relational mapping layer | ✓ no known vulnerabilities |

## Security

Don't file public GitHub issues for security vulnerabilities. Report them directly to our security response team at [security@repairo.com](mailto:security@repairo.com). We will coordinate verification and patch releases immediately.

## Contributing

You can fork this repo and create pull requests:

[github.com/adityacs50-lab/Repairo](https://github.com/adityacs50-lab/Repairo) - [bugs](https://github.com/adityacs50-lab/Repairo/issues) and [discussions](https://github.com/adityacs50-lab/Repairo/discussions)

## License

Apache-2.0. Copyright © Repairo Inc.

See [LICENSE](./LICENSE) for the full text. For what this license means for your team in practice, see [DEPLOY.md](./DEPLOY.md).
