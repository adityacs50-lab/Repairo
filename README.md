# Repairo CLI

> **Repairo detects breaking changes in third-party APIs, maps their impact across your codebase, and generates validated code repairs.**

Repairo is a developer tool built for Node.js / TypeScript codebases. It ingests OpenAPI 3.0/3.1 specifications, performs structural spec diffing, maps impacted AST nodes across your repository using `ts-morph`, executes deterministic repairs, validates changes via TypeScript compilation & unit tests, and generates reviewable diffs or GitHub Pull Requests.

---

## 🛠️ Installation & Usage

### Local Development / Quickstart

Execute CLI directly using `npx`:

```bash
# 1. Scan codebase for API SDK dependencies (Stripe, OpenAI, Supabase, fetch, etc.)
npx tsx src/cli/index.ts scan ./src --vendors stripe,openai,supabase

# 2. Initialize local .repairo configuration workspace
npx tsx src/cli/index.ts init --repo owner/repository

# 3. Compare OpenAPI contract against baseline snapshot & view AST impact
npx tsx src/cli/index.ts diff --spec ./specs/new-openapi.json

# 4. Preview validated AST repairs without modifying files (--dry-run)
npx tsx src/cli/index.ts repair --dry-run

# 5. Apply validated AST repairs to working tree (--apply)
npx tsx src/cli/index.ts repair --apply

# 6. Create GitHub Pull Request (--create-pr)
npx tsx src/cli/index.ts repair --create-pr
```

Or via global npm package:

```bash
npm install -g @repairo/cli
repairo scan ./src
```

---

## 🚀 End-to-End Demo Workflow

Repairo ships with a real, reproducible fixture in `fixtures/breaking-api-demo/`.

### Step 1: Scan Repository
```bash
npx tsx src/cli/index.ts scan ./fixtures/breaking-api-demo/src
```
*Outputs real file counts, detected vendors (OpenAI), and call site counts.*

### Step 2: Save Baseline Spec Snapshot
```bash
npx tsx src/cli/index.ts diff --spec ./fixtures/breaking-api-demo/specs/old-openapi.json
```
*Saves baseline snapshot to `.repairo/snapshots/openapi.json`.*

### Step 3: Compute Contract Changes & Impact
```bash
npx tsx src/cli/index.ts diff --spec ./fixtures/breaking-api-demo/specs/new-openapi.json --target ./fixtures/breaking-api-demo/src
```
*Detects parameter removal (`max_tokens` → `max_output_tokens`) and maps affected call sites.*

### Step 4: Dry-Run AST Repair & Validation
```bash
npx tsx src/cli/index.ts repair --dry-run --target ./fixtures/breaking-api-demo/src
```
*Generates deterministic AST transformation, runs `tsc` compilation check, displays unified code diff, and preserves files.*

### Step 5: Apply Validated Repair
```bash
npx tsx src/cli/index.ts repair --apply --target ./fixtures/breaking-api-demo/src
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

---

## 📄 License

Repairo is open-source software under the [Apache-2.0 License](./LICENSE).
