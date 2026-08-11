# Repairo CLI (`repairo-cli`)

> **Repairo detects breaking changes in third-party APIs, maps their impact across your codebase, and generates validated AST repairs.**

Repairo is a developer tool built for Node.js / TypeScript codebases. It ingests OpenAPI 3.0/3.1 specifications, performs structural spec diffing, maps impacted AST nodes across your repository using `ts-morph`, executes deterministic repairs, validates changes via TypeScript compilation & unit tests, and generates reviewable diffs or GitHub Pull Requests.

---

## 🛠️ Installation & Quickstart

Run directly without installation via `npx`:

```bash
# 1. Scan your codebase for third-party API dependencies
npx repairo-cli scan ./src --vendors stripe,openai,supabase

# 2. Initialize local .repairo configuration workspace
npx repairo-cli init --repo owner/your-app

# 3. Detect API contract drift & map code impact from an OpenAPI spec
npx repairo-cli diff --spec ./specs/new-openapi.json

# 4. Preview AST repairs with tsc compiler validation
npx repairo-cli repair --dry-run

# 5. Apply validated AST repairs or open GitHub PR
npx repairo-cli repair --apply # or --create-pr
```

Or install globally via npm:

```bash
npm install -g repairo-cli

repairo scan ./src
repairo init --repo owner/your-app
repairo diff --spec ./specs/new-openapi.json
repairo repair --dry-run
repairo repair --apply
```

---

## 🚀 End-to-End Demo Workflow

Repairo ships with a reproducible fixture in `fixtures/breaking-api-demo/`.

### Step 1: Scan Repository
```bash
npx repairo-cli scan ./fixtures/breaking-api-demo/src
```
*Outputs real file counts, detected vendors (OpenAI), and call site counts.*

### Step 2: Save Baseline Spec Snapshot
```bash
npx repairo-cli diff --spec ./fixtures/breaking-api-demo/specs/old-openapi.json
```
*Saves baseline snapshot to `.repairo/snapshots/openapi.json`.*

### Step 3: Compute Contract Changes & Impact
```bash
npx repairo-cli diff --spec ./fixtures/breaking-api-demo/specs/new-openapi.json --target ./fixtures/breaking-api-demo/src
```
*Detects parameter removal (`max_tokens` → `max_output_tokens`) and maps affected call sites.*

### Step 4: Dry-Run AST Repair & Validation
```bash
npx repairo-cli repair --dry-run --spec ./fixtures/breaking-api-demo/specs/new-openapi.json --target ./fixtures/breaking-api-demo/src
```
*Generates deterministic AST transformation targeting `PropertyAssignment` request objects, runs `tsc` compilation check, displays unified code diff, and preserves interface signatures.*

### Step 5: Apply Validated Repair
```bash
npx repairo-cli repair --apply --spec ./fixtures/breaking-api-demo/specs/new-openapi.json --target ./fixtures/breaking-api-demo/src
```
*Applies validated patch to disk.*

---

## 🧪 Testing

Run the full automated integration test suite:

```bash
npm test
```

Covers:
1. OpenAPI parser test
2. OpenAPI diff test
3. Breaking parameter detection test
4. AST impact analysis test
5. AST transformation test
6. TypeScript validation test
7. CLI scan test
8. CLI diff test
9. CLI repair test
10. Interface vs Call Site AST Scope Regression Test

---

## 📄 License

Repairo is open-source software under the [Apache-2.0 License](./LICENSE).
