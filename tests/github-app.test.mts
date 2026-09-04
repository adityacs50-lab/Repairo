import { createHmac, generateKeyPairSync } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import type { AddressInfo } from "net";
import { AppDatabase } from "../src/db";
import { registerInstallationHandlers } from "../src/github-app/installations";
import { logger } from "../src/github-app/logger";
import {
  createGitHubApp,
  InstallationTokenCache,
  loadConfig,
  withRetry,
  type GitHubClient,
  type IssueComment,
  type PullRequestFile,
} from "../src/github-app/octokit";
import { createServer } from "../src/github-app/server";
import {
  COMMENT_MARKER,
  formatBreakingChangesComment,
  isOpenApiSpecPath,
  registerPullRequestHandlers,
} from "../src/github-app/webhooks";
import { runOasdiff } from "../src/oasdiff/oasdiff";

logger.level = "silent";

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_SPEC = `
openapi: 3.0.0
info: { title: Shop, version: "1.0.0" }
paths:
  /api/v1/users:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: { type: string }
                  phone_number: { type: string }
  /api/v1/orders:
    post:
      parameters:
        - name: include_metadata
          in: query
          required: false
          schema: { type: boolean }
      responses:
        "200":
          description: ok
`;

const HEAD_SPEC = `
openapi: 3.0.0
info: { title: Shop, version: "2.0.0" }
paths:
  /api/v1/users:
    get:
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: { type: string }
  /api/v1/orders:
    post:
      parameters:
        - name: include_metadata
          in: query
          required: true
          schema: { type: boolean }
      responses:
        "200":
          description: ok
`;

/** In-memory stand-in for the GitHub REST calls the handlers make. */
class FakeGitHubClient implements GitHubClient {
  files: PullRequestFile[] = [];
  contents = new Map<string, string>(); // `${ref}:${path}` -> text
  comments: Array<IssueComment & { html_url: string }> = [];
  calls: string[] = [];

  async listPullRequestFiles() {
    this.calls.push("listPullRequestFiles");
    return this.files;
  }
  async getFileText(_o: string, _r: string, filePath: string, ref: string) {
    this.calls.push(`getFileText:${ref}:${filePath}`);
    return this.contents.get(`${ref}:${filePath}`) ?? null;
  }
  async listIssueComments() {
    return this.comments;
  }
  async createIssueComment(_o: string, _r: string, _n: number, body: string) {
    const comment = { id: this.comments.length + 1, body, html_url: "https://example/c" };
    this.comments.push(comment);
    this.calls.push("createIssueComment");
    return comment;
  }
  async updateIssueComment(_o: string, _r: string, id: number, body: string) {
    const comment = this.comments.find((c) => c.id === id)!;
    comment.body = body;
    this.calls.push("updateIssueComment");
    return comment;
  }
}

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
const SECRET = "test-webhook-secret";

function sign(body: string, secret = SECRET) {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

async function main() {
  console.log("\n==================================================");
  console.log("REPAIRO GITHUB APP TEST SUITE");
  console.log("==================================================\n");

  // Test 1: spec path matching
  console.log("Test 1: OpenAPI spec path detection");
  assert(isOpenApiSpecPath("openapi.yaml"), "openapi.yaml at repo root matches");
  assert(isOpenApiSpecPath("docs/OpenAPI.json"), "openapi.json in a subdirectory matches (case-insensitive)");
  assert(isOpenApiSpecPath("swagger.yml"), "swagger.yml matches");
  assert(isOpenApiSpecPath("services/billing/api/spec/orders.yaml"), "any YAML under api/spec/ matches");
  assert(isOpenApiSpecPath("api/spec/users.yml"), "api/spec/*.yml at root matches");
  assert(!isOpenApiSpecPath("api/spec/nested/users.yaml"), "YAML nested deeper than api/spec/ does not match");
  assert(!isOpenApiSpecPath("api/spec/README.md"), "non-YAML in api/spec/ does not match");
  assert(!isOpenApiSpecPath("src/openapi-client.ts"), "unrelated file does not match");

  // Test 2: comment format
  console.log("\nTest 2: breaking change comment format");
  const body = formatBreakingChangesComment([
    {
      specPath: "openapi.yaml",
      changes: [
        { rule: "response-field-removed", endpoint: "GET /api/v1/users", details: "Response field 'phone_number' was removed", level: "error" },
        { rule: "required-param-added", endpoint: "POST /api/v1/orders", details: "New required parameter 'include_metadata' was added", level: "error" },
      ],
    },
  ]);
  const expected = [
    COMMENT_MARKER,
    "## ⚠️ Breaking API Changes Detected",
    "",
    "| Rule | Endpoint | Details |",
    "|------|----------|---------|",
    "| response-field-removed | GET /api/v1/users | Response field 'phone_number' was removed |",
    "| required-param-added | POST /api/v1/orders | New required parameter 'include_metadata' was added |",
    "",
    "**Action required**: These changes will break downstream API consumers.",
    "- [ ] Add deprecation headers and sunset date",
    "- [ ] Notify consumer teams",
    "- [ ] Update API versioning strategy",
    "",
    "_Detected by Repairo_",
  ].join("\n");
  assert(body === expected, "Comment matches the required template exactly");
  const piped = formatBreakingChangesComment([
    { specPath: "a.yaml", changes: [{ rule: "x", endpoint: "GET /a", details: "a | b", level: "error" }] },
  ]);
  assert(piped.includes("a \\| b"), "Pipes inside table cells are escaped");

  // Test 3: oasdiff wrapper (built-in fallback)
  console.log("\nTest 3: oasdiff wrapper");
  delete process.env.OASDIFF_BIN;
  const diff = await runOasdiff({ base: BASE_SPEC, head: HEAD_SPEC });
  assert(diff.engine === "builtin", "Falls back to the built-in engine when no oasdiff binary is present");
  const rules = diff.breaking.map((c) => `${c.rule}@${c.endpoint}`).sort();
  assert(
    rules.includes("response-field-removed@GET /api/v1/users"),
    "Removed response field is reported as response-field-removed",
  );
  assert(
    rules.includes("required-param-added@POST /api/v1/orders"),
    "Newly required parameter is reported as required-param-added",
  );
  assert(
    diff.breaking.some((c) => c.details === "Response field 'phone_number' was removed"),
    "Details sentence names the removed field",
  );
  const same = await runOasdiff({ base: BASE_SPEC, head: BASE_SPEC });
  assert(same.breaking.length === 0, "Identical specs produce no breaking changes");
  const removedSpec = await runOasdiff({ base: BASE_SPEC, head: null });
  assert(
    removedSpec.breaking.filter((c) => c.rule === "endpoint-removed").length === 2,
    "Deleting the spec reports every endpoint as removed",
  );
  let invalidThrew = false;
  try {
    await runOasdiff({ base: "just a string", head: HEAD_SPEC });
  } catch {
    invalidThrew = true;
  }
  assert(invalidThrew, "A spec that is not an object throws instead of silently passing");

  // Test 4: database
  console.log("\nTest 4: SQLite database");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "repairo-gh-app-"));
  const dbErrors: string[] = [];
  const dbLog = { error: (ctx: object) => void dbErrors.push((ctx as { op: string }).op) };
  const db = new AppDatabase(path.join(tmpDir, "nested", "app.db"), dbLog);
  assert(db.upsertInstallation(42, "acme"), "Installation is stored");
  assert(db.getInstallation(42)?.org_name === "acme", "Installation can be read back by installation_id");
  assert(db.upsertInstallation(42, "acme-renamed"), "Re-inserting the same installation_id updates instead of failing UNIQUE");
  assert(db.listInstallations().length === 1 && db.listInstallations()[0].org_name === "acme-renamed", "Only one row exists after upsert");
  const eventId = db.recordBreakingChangeEvent({
    installationId: 42,
    repo: "acme/shop",
    prNumber: 7,
    headSha: "abc",
    specPath: "openapi.yaml",
    changes: [{ rule: "endpoint-removed" }],
    commentId: 1,
  });
  assert(typeof eventId === "number", "Breaking change event is recorded and returns its id");
  const events = db.listBreakingChangeEvents("acme/shop");
  assert(events.length === 1 && events[0].breaking_count === 1 && events[0].pr_number === 7, "Event row carries repo, pr and count");
  assert(db.deleteInstallation(42) === true, "Installation is deleted");
  assert(db.deleteInstallation(42) === false, "Deleting a missing installation reports false, not an error");
  db.close();
  assert(db.upsertInstallation(1, "x") === false, "After the connection is closed, writes fail soft (log and continue) instead of throwing");
  assert(db.listInstallations().length === 0, "Reads on a broken connection return an empty list instead of throwing");
  assert(dbErrors.join(",") === "upsertInstallation,listInstallations", "Swallowed database errors are reported through the injected logger");

  // Test 5: token cache
  console.log("\nTest 5: installation token cache");
  let now = 1_000_000;
  let authCalls = 0;
  const cache = new InstallationTokenCache(
    async (id) => {
      authCalls++;
      return { token: `tok-${id}-${authCalls}`, expiresAt: new Date(now + 3_600_000).toISOString() };
    },
    60_000,
    () => now,
  );
  const first = await cache.getToken(1);
  const second = await cache.getToken(1);
  assert(first === "tok-1-1" && second === first && authCalls === 1, "Second call within the hour reuses the cached token");
  await cache.getToken(2);
  assert(authCalls === 2 && cache.size === 2, "Tokens are cached per installation");
  now += 3_600_000 - 30_000; // 30s before expiry: inside the refresh skew
  const refreshed = await cache.getToken(1);
  assert(refreshed === "tok-1-3" && authCalls === 3, "Token is refreshed shortly before it expires");
  cache.invalidate(1);
  await cache.getToken(1);
  assert(authCalls === 4, "Invalidated token is fetched again");

  // Test 6: retry with backoff
  console.log("\nTest 6: retry with exponential backoff");
  let attempts = 0;
  const value = await withRetry(
    async () => {
      attempts++;
      if (attempts < 3) throw Object.assign(new Error("boom"), { status: 503 });
      return "ok";
    },
    { baseDelayMs: 1 },
  );
  assert(value === "ok" && attempts === 3, "5xx errors are retried until success");
  attempts = 0;
  let gaveUp = false;
  try {
    await withRetry(async () => { attempts++; throw Object.assign(new Error("down"), { status: 502 }); }, { baseDelayMs: 1 });
  } catch {
    gaveUp = true;
  }
  assert(gaveUp && attempts === 4, "Gives up after 3 retries (4 attempts)");
  attempts = 0;
  try {
    await withRetry(async () => { attempts++; throw Object.assign(new Error("nope"), { status: 404 }); }, { baseDelayMs: 1 });
  } catch { /* expected */ }
  assert(attempts === 1, "4xx errors are not retried");

  // Test 7: config
  console.log("\nTest 7: config loading");
  const cfg = loadConfig({ APP_ID: "12", PRIVATE_KEY: "-----BEGIN\\nabc\\n-----END", WEBHOOK_SECRET: "s", PORT: "4100" });
  assert(cfg.appId === 12 && cfg.port === 4100 && cfg.privateKey.includes("\n"), "Config parses APP_ID/PORT and unescapes \\n in PRIVATE_KEY");
  let cfgThrew = "";
  try { loadConfig({ APP_ID: "12" }); } catch (e) { cfgThrew = (e as Error).message; }
  assert(cfgThrew.includes("PRIVATE_KEY") && cfgThrew.includes("WEBHOOK_SECRET"), "Missing env vars are reported by name");

  // Test 8: webhook endpoint end-to-end
  console.log("\nTest 8: webhook endpoint");
  const db2 = new AppDatabase(path.join(tmpDir, "server.db"), dbLog);
  const app = createGitHubApp({ appId: 12345, privateKey: PEM, webhookSecret: SECRET, port: 0 });
  const fake = new FakeGitHubClient();
  const forgotten: number[] = [];
  registerInstallationHandlers(app, { db: db2, onDeleted: (id) => forgotten.push(id) });
  registerPullRequestHandlers(app, { db: db2, getClient: async () => fake });
  app.webhooks.onError(() => { /* logged by the server */ });

  const server = createServer(app).listen(0);
  const port = (server.address() as AddressInfo).port;
  const url = `http://127.0.0.1:${port}/api/github/webhooks`;

  async function deliver(event: string, payload: unknown, signature?: string) {
    const raw = JSON.stringify(payload);
    return fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": event,
        "x-github-delivery": `d-${Math.random()}`,
        ...(signature === undefined ? {} : { "x-hub-signature-256": signature }),
      },
      body: raw,
    });
  }
  const signed = (event: string, payload: unknown) => deliver(event, payload, sign(JSON.stringify(payload)));

  const installPayload = {
    action: "created",
    installation: { id: 99, account: { login: "acme" } },
    repositories: [{ full_name: "acme/shop" }],
  };
  const unsigned = await deliver("installation", installPayload);
  assert(unsigned.status === 401, "Missing signature is rejected with 401");
  const badSig = await deliver("installation", installPayload, sign(JSON.stringify(installPayload), "wrong"));
  assert(badSig.status === 401, "Wrong signature is rejected with 401");
  assert(db2.getInstallation(99) === null, "Rejected deliveries have no side effects");

  const health = await fetch(`http://127.0.0.1:${port}/healthz`);
  assert(health.ok, "GET /healthz responds ok");

  const created = await signed("installation", installPayload);
  assert(created.status === 200 && db2.getInstallation(99)?.org_name === "acme", "installation.created stores installation_id + org name");

  const ping = await signed("ping", { zen: "hi" });
  assert(ping.status === 200, "Unhandled events are acknowledged with 200");

  const prPayload = {
    action: "opened",
    number: 7,
    installation: { id: 99 },
    repository: { name: "shop", full_name: "acme/shop", owner: { login: "acme" } },
    pull_request: { number: 7, base: { sha: "base-sha" }, head: { sha: "head-sha" } },
  };
  fake.files = [{ filename: "src/index.ts", status: "modified" }];
  const noSpec = await signed("pull_request", prPayload);
  assert(noSpec.status === 200 && fake.comments.length === 0, "PR without spec changes is ignored");

  fake.files = [
    { filename: "src/index.ts", status: "modified" },
    { filename: "openapi.yaml", status: "modified" },
  ];
  fake.contents.set("base-sha:openapi.yaml", BASE_SPEC);
  fake.contents.set("head-sha:openapi.yaml", HEAD_SPEC);
  const opened = await signed("pull_request", prPayload);
  assert(opened.status === 200 && fake.comments.length === 1, "PR with a breaking spec change gets one comment");
  assert(
    fake.calls.includes("getFileText:base-sha:openapi.yaml") && fake.calls.includes("getFileText:head-sha:openapi.yaml"),
    "Base and head spec are fetched at the PR's base/head SHAs",
  );
  assert(
    fake.comments[0].body?.startsWith(`${COMMENT_MARKER}\n## ⚠️ Breaking API Changes Detected`) === true &&
      fake.comments[0].body?.includes("| response-field-removed | GET /api/v1/users | Response field 'phone_number' was removed |") === true &&
      fake.comments[0].body?.includes("| required-param-added | POST /api/v1/orders | New required parameter 'include_metadata' was added |") === true &&
      fake.comments[0].body?.endsWith("_Detected by Repairo_") === true,
    "Comment body follows the required template with one row per breaking change",
  );
  const recorded = db2.listBreakingChangeEvents("acme/shop");
  assert(recorded.length === 1 && recorded[0].breaking_count === 2 && recorded[0].comment_id === 1, "Breaking change event is stored for analytics");

  const synced = await signed("pull_request", { ...prPayload, action: "synchronize" });
  assert(
    synced.status === 200 && fake.comments.length === 1 && fake.calls.filter((c) => c === "updateIssueComment").length === 1,
    "pull_request.synchronize updates the existing comment instead of posting a second one",
  );

  fake.files = [{ filename: "openapi.yaml", status: "added" }];
  const addedOnly = await signed("pull_request", { ...prPayload, number: 8, pull_request: { ...prPayload.pull_request, number: 8 } });
  assert(addedOnly.status === 200 && fake.comments.length === 1, "A newly added spec has nothing to break, so no comment");

  const deleted = await signed("installation", { action: "deleted", installation: { id: 99, account: { login: "acme" } } });
  assert(deleted.status === 200 && db2.getInstallation(99) === null && forgotten.includes(99), "installation.deleted removes the row and drops the cached token");

  server.close();
  db2.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
  console.log("==================================================\n");
  if (passedTests !== totalTests) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
