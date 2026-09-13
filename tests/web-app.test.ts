// Coverage for the hosted web app's security- and money-relevant logic: session
// signing, OAuth CSRF state, access-token encryption, and the plan-limit gates
// that actually block integration/repair/invite creation once a workspace is
// over its plan. This was previously zero — see RP-05 in the readiness scan.
//
// Deliberately NOT covered here: the Next.js route handlers themselves (they
// pull `cookies()`/`headers()` from `next/headers`, which needs a request
// context this lightweight runner doesn't provide) and Stripe webhook
// signature verification (needs a live Stripe SDK object). Everything below is
// the real logic those routes call into.

import fs from "fs";
import os from "os";
import path from "path";
import { createHmac, randomUUID } from "crypto";
import { buildSessionValue, decodeSession, sessionCookieOptions, publicUser, AuthError } from "../src/lib/auth/session";
import { createOAuthState, verifyOAuthState } from "../src/lib/auth/oauth-state";
import { encryptToken, decryptToken } from "../src/lib/crypto/token";
import { getPlanLimits } from "../src/lib/billing/plans";
import { getDb } from "../src/lib/db";
import { users, workspaces, workspaceMembers, repairRuns, auditLogs } from "../src/lib/db/schema";
import { upsertGithubUser, getWorkspaceForUser } from "../src/lib/db/users";
import {
  requireWorkspaceAccess,
  assertCanCreateIntegration,
  assertCanRunRepair,
  createIntegration,
  countRunsThisMonth,
} from "../src/lib/db/integrations";
import { assertCanInvite, createPendingInvite, listPendingInvites, acceptPendingInvitesForLogin } from "../src/lib/db/invites";

// None of the imports above call getDb()/getGitHubOAuthConfig()/getKey() at their own
// module top level — those only run lazily, inside functions we call from main() below.
// So setting env here, after the (hoisted) imports but before main() runs, is enough to
// give every test an isolated on-disk DB and a real (fake) OAuth config.
const dbTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "repairo-web-app-db-"));
process.env.DATABASE_PATH = path.join(dbTmpDir, "test.db");
process.env.GITHUB_CLIENT_ID = "test-client-id";
process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
process.env.SESSION_SECRET = "a".repeat(32);

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

/** Workspaces created via upsertGithubUser get an owner membership row automatically;
 * workspaces inserted directly for test setup below need the same invariant by hand. */
function addOwnerMembership(workspaceId: string, userId: string) {
  getDb()
    .insert(workspaceMembers)
    .values({ id: randomUUID(), workspaceId, userId, role: "owner", createdAt: new Date() })
    .run();
}

function newIntegration(workspaceId: string, overrides: Partial<Parameters<typeof createIntegration>[0]> = {}) {
  return createIntegration({
    workspaceId,
    name: overrides.name ?? `integration-${randomUUID()}`,
    owner: "acme",
    repo: "widgets",
    beforePath: "specs/old.json",
    afterPath: "specs/new.json",
    beforeRef: "main",
    afterRef: "main",
    consumerPaths: ["src/client.ts"],
    consumerRef: "main",
    baseBranch: "main",
    ...overrides,
  });
}

async function main() {
  console.log("\n==================================================");
  console.log("REPAIRO WEB APP TEST SUITE");
  console.log("==================================================\n");

  // ---------------------------------------------------------------------
  console.log("Test 1: session signing");
  const value = buildSessionValue({ userId: "u1", login: "octocat", avatarUrl: "https://x/a.png" });
  assert(/^[\w-]+\.[\w-]+$/.test(value), "buildSessionValue produces a base64url payload.signature token");
  const decoded = decodeSession(value, process.env.SESSION_SECRET!);
  assert(decoded?.userId === "u1" && decoded?.login === "octocat", "A valid session token decodes back to its payload");
  assert(decodeSession(value, "wrong-secret-wrong-secret-wrong") === null, "A token signed with a different secret is rejected");
  const [payloadB64] = value.split(".");
  assert(decodeSession(`${payloadB64}.deadbeef`, process.env.SESSION_SECRET!) === null, "A tampered signature is rejected");
  assert(decodeSession("not-a-real-token", process.env.SESSION_SECRET!) === null, "A malformed token (no payload.signature split) is rejected");
  const expiredPayload = Buffer.from(JSON.stringify({ userId: "u1", login: "x", avatarUrl: "y", exp: Date.now() - 1000 })).toString("base64url");
  const expiredSig = createHmac("sha256", process.env.SESSION_SECRET!).update(expiredPayload).digest("base64url");
  assert(decodeSession(`${expiredPayload}.${expiredSig}`, process.env.SESSION_SECRET!) === null, "An expired session (even with a valid signature) is rejected");
  const cookie = sessionCookieOptions();
  assert(cookie.httpOnly === true && cookie.sameSite === "lax" && cookie.path === "/", "Session cookie is httpOnly, SameSite=Lax, scoped to the whole site");
  assert(publicUser(decoded!).id === "u1" && !("exp" in publicUser(decoded!)), "publicUser() strips internal fields (exp) from the session payload");
  assert(new AuthError("nope", 403).status === 403, "AuthError carries the HTTP status it was constructed with");

  // ---------------------------------------------------------------------
  console.log("\nTest 2: OAuth CSRF state");
  const secret = "state-secret-state-secret-state";
  const state = createOAuthState(secret);
  assert(verifyOAuthState(state, secret), "A freshly created state verifies against the secret it was signed with");
  assert(!verifyOAuthState(state, "a-different-secret-entirely"), "State signed with one secret fails against another");
  assert(!verifyOAuthState(`${state}-tampered`, secret), "A tampered state string is rejected");
  assert(!verifyOAuthState(null, secret), "A null state is rejected outright");
  assert(!verifyOAuthState("no-dot-here", secret), "A state with no nonce.signature split is rejected");

  // ---------------------------------------------------------------------
  console.log("\nTest 3: access-token encryption");
  const encrypted = encryptToken("gho_realGitHubToken123");
  assert(encrypted.split(".").length === 3, "Encrypted token is iv.tag.ciphertext");
  assert(decryptToken(encrypted) === "gho_realGitHubToken123", "A token round-trips through encrypt/decrypt intact");
  const [iv, tag, data] = encrypted.split(".");
  let tamperThrew = false;
  try {
    decryptToken(`${iv}.${tag}.${data.slice(0, -2)}AA`);
  } catch {
    tamperThrew = true;
  }
  assert(tamperThrew, "A tampered ciphertext fails GCM auth-tag verification instead of silently decrypting garbage");
  let malformedThrew = false;
  try {
    decryptToken("not-a-valid-payload");
  } catch {
    malformedThrew = true;
  }
  assert(malformedThrew, "A malformed payload (missing iv/tag/data parts) throws instead of crashing obscurely");

  // ---------------------------------------------------------------------
  console.log("\nTest 4: plan limits");
  assert(getPlanLimits("pro").integrations === 50, "Pro plan reports the Pro integration limit");
  assert(getPlanLimits("free").integrations === 1, "Free plan reports the Free integration limit");
  assert(getPlanLimits(null).id === "free", "A null plan value defaults to Free");
  assert(getPlanLimits("enterprise-typo").id === "free", "An unrecognized plan string defaults to Free rather than throwing");

  // ---------------------------------------------------------------------
  console.log("\nTest 5: user + workspace provisioning");
  const { user: firstLogin, workspace: firstWorkspace } = await upsertGithubUser({
    githubId: "555",
    login: "acme-dev",
    avatarUrl: "https://x/a.png",
    accessToken: "gho_first",
  });
  assert(firstWorkspace.ownerUserId === firstLogin.id && firstWorkspace.plan === "free", "First login provisions a Free-plan workspace owned by the new user");
  const { user: secondLogin, workspace: secondWorkspace } = await upsertGithubUser({
    githubId: "555",
    login: "acme-dev-renamed",
    avatarUrl: "https://x/b.png",
    accessToken: "gho_second",
  });
  assert(secondLogin.id === firstLogin.id && secondLogin.login === "acme-dev-renamed", "Logging in again with the same githubId updates the existing user instead of creating a second one");
  assert(secondWorkspace.id === firstWorkspace.id, "The same workspace is reused across logins rather than provisioning a new one each time");
  assert(getWorkspaceForUser(firstLogin.id)?.id === firstWorkspace.id, "getWorkspaceForUser resolves back to the owned workspace");

  // ---------------------------------------------------------------------
  console.log("\nTest 6: workspace access control");
  const { user: outsider } = await upsertGithubUser({ githubId: "556", login: "outsider", avatarUrl: "https://x/c.png", accessToken: "gho_out" });
  const access = requireWorkspaceAccess(firstLogin.id, firstWorkspace.id);
  assert(access.workspace.id === firstWorkspace.id, "The workspace owner is granted access to their own workspace");
  let forbiddenThrew = false;
  try {
    requireWorkspaceAccess(outsider.id, firstWorkspace.id);
  } catch (e) {
    forbiddenThrew = e instanceof AuthError && e.status === 403;
  }
  assert(forbiddenThrew, "A user with no membership row gets a 403 AuthError, not silent access");
  // requireWorkspaceAccess checks membership before the workspace's own existence, so the
  // 404 branch is only reachable via a dangling membership row (e.g. a workspace deleted
  // out from under a member). Foreign keys are ON in production, so manufacturing that row
  // needs a deliberate, temporary FK bypass here — not a shortcut anything else can take.
  const rawSqlite = (getDb() as unknown as { $client: { pragma(sql: string): unknown } }).$client;
  rawSqlite.pragma("foreign_keys = OFF");
  addOwnerMembership("dangling-workspace-id", firstLogin.id);
  rawSqlite.pragma("foreign_keys = ON");
  let notFoundThrew = false;
  try {
    requireWorkspaceAccess(firstLogin.id, "dangling-workspace-id");
  } catch (e) {
    notFoundThrew = e instanceof AuthError && e.status === 404;
  }
  assert(notFoundThrew, "A membership row pointing at a deleted/nonexistent workspace gets a 404 AuthError");

  // ---------------------------------------------------------------------
  console.log("\nTest 7: integration plan-limit gate (Free = 1 integration)");
  const gateWorkspaceId = randomUUID();
  getDb().insert(users).values({ id: randomUUID(), githubId: "999", login: "gate-user", avatarUrl: "https://x/g.png", encryptedAccessToken: "e" }).run();
  const gateOwnerId = getDb().select().from(users).all().find((u) => u.login === "gate-user")!.id;
  getDb().insert(workspaces).values({ id: gateWorkspaceId, name: "Gate WS", ownerUserId: gateOwnerId, plan: "free" }).run();
  addOwnerMembership(gateWorkspaceId, gateOwnerId);
  const gateWorkspace = getDb().select().from(workspaces).all().find((w) => w.id === gateWorkspaceId)!;

  let underLimitThrew = false;
  try {
    assertCanCreateIntegration(gateWorkspace);
  } catch {
    underLimitThrew = true;
  }
  assert(!underLimitThrew, "A Free workspace with 0 integrations may create one");
  newIntegration(gateWorkspaceId);
  let atLimitThrew = false;
  let atLimitStatus = 0;
  try {
    assertCanCreateIntegration(gateWorkspace);
  } catch (e) {
    atLimitThrew = true;
    atLimitStatus = e instanceof AuthError ? e.status : 0;
  }
  assert(atLimitThrew && atLimitStatus === 402, "A Free workspace at its 1-integration limit is blocked with a 402 (payment required), not silently allowed");

  // ---------------------------------------------------------------------
  console.log("\nTest 8: repair-run plan-limit gate, including quick-repair audit events");
  const runsWorkspaceId = randomUUID();
  getDb().insert(workspaces).values({ id: runsWorkspaceId, name: "Runs WS", ownerUserId: gateOwnerId, plan: "free" }).run();
  addOwnerMembership(runsWorkspaceId, gateOwnerId);
  const runsWorkspace = getDb().select().from(workspaces).all().find((w) => w.id === runsWorkspaceId)!;
  const runsIntegration = newIntegration(runsWorkspaceId);

  assert(countRunsThisMonth(runsWorkspaceId) === 0, "A fresh workspace has 0 runs this month");
  for (let i = 0; i < 14; i++) {
    getDb().insert(repairRuns).values({ id: randomUUID(), integrationId: runsIntegration.id, status: "success" }).run();
  }
  assert(countRunsThisMonth(runsWorkspaceId) === 14, "14 of 14 inserted runs are counted");
  let underRunLimitThrew = false;
  try {
    assertCanRunRepair(runsWorkspace);
  } catch {
    underRunLimitThrew = true;
  }
  assert(!underRunLimitThrew, "A Free workspace with 14 of its 15-run limit used may still run a repair");

  // The 15th unit of usage is a quick repair (audit-log only, no repair_runs row) — proves
  // the gate counts both sources together, not just repair_runs.
  getDb().insert(auditLogs).values({ id: randomUUID(), workspaceId: runsWorkspaceId, action: "repair.quick", createdAt: new Date() }).run();
  assert(countRunsThisMonth(runsWorkspaceId) === 15, "A quick repair (audit-log only) is counted alongside integration runs");
  let atRunLimitThrew = false;
  let atRunLimitStatus = 0;
  try {
    assertCanRunRepair(runsWorkspace);
  } catch (e) {
    atRunLimitThrew = true;
    atRunLimitStatus = e instanceof AuthError ? e.status : 0;
  }
  assert(atRunLimitThrew && atRunLimitStatus === 402, "The gate is inclusive: exactly 15 of 15 used already blocks the 16th run with a 402");

  const lastMonth = new Date();
  lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
  getDb().insert(repairRuns).values({ id: randomUUID(), integrationId: runsIntegration.id, status: "success", createdAt: lastMonth }).run();
  assert(countRunsThisMonth(runsWorkspaceId) === 15, "A run from a previous calendar month doesn't inflate this month's count");

  // ---------------------------------------------------------------------
  console.log("\nTest 9: invites — seat limit and accept-on-login");
  const inviteWorkspaceId = randomUUID();
  getDb().insert(workspaces).values({ id: inviteWorkspaceId, name: "Invite WS", ownerUserId: gateOwnerId, plan: "free" }).run();
  addOwnerMembership(inviteWorkspaceId, gateOwnerId);
  const inviteWorkspace = getDb().select().from(workspaces).all().find((w) => w.id === inviteWorkspaceId)!;

  const invite = createPendingInvite({ workspace: inviteWorkspace, githubLogin: "@Future-Teammate", invitedByUserId: gateOwnerId });
  assert(invite.githubLogin === "future-teammate", "Invite login is normalized (leading @ stripped, lowercased)");
  const sameInvite = createPendingInvite({ workspace: inviteWorkspace, githubLogin: "future-teammate", invitedByUserId: gateOwnerId });
  assert(sameInvite.id === invite.id, "Inviting the same pending login twice returns the existing invite instead of duplicating it");
  assert(listPendingInvites(inviteWorkspaceId).length === 1, "Exactly one pending invite is stored");

  await upsertGithubUser({ githubId: "777", login: "future-teammate", avatarUrl: "https://x/f.png", accessToken: "gho_f" });
  assert(listPendingInvites(inviteWorkspaceId).length === 0, "Signing up under the invited login accepts the invite automatically");
  const teammateId = getDb().select().from(users).all().find((u) => u.login === "future-teammate")!.id;
  acceptPendingInvitesForLogin(teammateId, "future-teammate");
  assert(requireWorkspaceAccess(teammateId, inviteWorkspaceId).member.role === "member", "The invited user is now a member of the inviting workspace, not just their own");

  // Free plan seats = 3: owner (1) + this invited member (1) leaves exactly 1 more before the gate trips.
  createPendingInvite({ workspace: inviteWorkspace, githubLogin: "second-teammate", invitedByUserId: gateOwnerId });
  let seatLimitThrew = false;
  try {
    assertCanInvite(inviteWorkspace);
  } catch (e) {
    seatLimitThrew = e instanceof AuthError && e.status === 402;
  }
  assert(seatLimitThrew, "Free plan's 3-seat limit (members + pending invites) blocks a third invite with a 402");

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
  console.log("==================================================\n");
  if (passedTests !== totalTests) process.exit(1);
  fs.rmSync(dbTmpDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
