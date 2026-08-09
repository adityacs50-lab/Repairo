<p align="center">
  <img src="public/logo.jpg" alt="Repairo Logo" width="180" style="border-radius: 12px;" />
</p>

<h1 align="center">Repairo</h1>

<p align="center">
  <strong>Like Dependabot, built for API stability.</strong>
</p>

<p align="center">
  <a href="https://github.com/adityacs50-lab/Repairo/actions"><img alt="Continuous integration status" src="https://img.shields.io/badge/CI-passing-10B981?style=flat-square"></a>
  <a href="https://github.com/adityacs50-lab/Repairo/actions"><img alt="Test suite status" src="https://img.shields.io/badge/tests-100%25%20passing-10B981?style=flat-square"></a>
  <a href="https://www.npmjs.com/package/@repairo/cli"><img alt="Latest npm package version" src="https://img.shields.io/badge/npm-v1.0.0-F97316?style=flat-square"></a>
  <a href="https://nodejs.org"><img alt="Minimum Node.js version: 18" src="https://img.shields.io/badge/node-%3E%3D18-3B82F6?style=flat-square"></a>
  <a href="./LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-0EA5E9?style=flat-square"></a>
</p>

<hr />

**Repairo** is an automated API maintenance toolchain that continuously monitors OpenAPI specifications, parses TS consumers using compiler-grade AST engines, and automatically generates verified, reviewable pull requests.

## 🚀 Key Features

*   **Deterministic Patches:** Unlike probabilistic coding assistants that guess, Repairo translates contract changes into compile-guaranteed code transformations using `ts-morph`. Patches either compile 100% correctly or are blocked before push.
*   **Stateless RAM Vault:** Files and credentials stream into an ephemeral RAM buffer, apply transformations, push code, and zero out the memory block in **~24ms**. Code never touches physical disk or logs.
*   **Fully Offline Option:** Run the open-source CLI completely locally to fit tight InfoSec, SOC 2, and GDPR policies.
*   **Otto (AI Assistant):** An interactive developer chat assistant powered by Sarvam AI to walk you through setup, architecture, and integration issues.
*   **Ambient Dev Workspace:** A sleek background music (BGM) loop with interactive play/pause controls to keep you in the zone.

---

## 🛠️ Quickstart

Install the CLI globally:
```bash
npm install -g @repairo/cli
```

Or execute a quick scan on your directory:
```bash
npx @repairo/cli scan ./src --vendors stripe,openai,supabase
```

### CLI Command Reference

```bash
repairo init --repo owner/your-app           # link your repository
repairo scan ./src                           # scan for API dependencies
repairo diff --spec https://spec.url/spec    # view AST refactoring diffs
repairo repair --create-pr                   # apply AST patches & open PR
repairo deploy                               # setup webhook integration
```

---

## 📦 How it Works

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

For a deep dive into the architecture, check out [DEPLOY.md](./DEPLOY.md) and [DESIGN.md](./DESIGN.md).

---

## 💳 Pricing Tiers

| Tier | Price | Features |
| :--- | :--- | :--- |
| **Developer (Free)** | $0 | CLI local scanning, manual triggers, open-source presets, 3 runs/month |
| **Team** | $100/mo | Background OpenAPI spec monitoring, Stateless RAM vault automation, unlimited PR runs |
| **Enterprise** | Custom | Private Spec mapping, hybrid VPC runners, SSO/RBAC controls, custom SLA |

---

## 📄 License & Contributing

Repairo is open-source under the [Apache-2.0 License](./LICENSE). Contributions are welcome!
Feel free to read [LAUNCH.md](./LAUNCH.md) to set up a dev environment or contact us at `security@repairo.com` to report vulnerabilities.
