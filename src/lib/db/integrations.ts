import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  integrations,
  repairRuns,
  workspaces,
  workspaceMembers,
  type Integration,
  type Workspace,
} from "@/lib/db/schema";
import { AuthError } from "@/lib/auth/session";
import { randomBytes, randomUUID } from "crypto";

export const FREE_INTEGRATION_LIMIT = 1;
export const PRO_INTEGRATION_CAP = 50;

export function requireWorkspaceAccess(userId: string, workspaceId: string) {
  const member = getDb()
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .get();
  if (!member) throw new AuthError("Forbidden", 403);
  const workspace = getDb()
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .get();
  if (!workspace) throw new AuthError("Workspace not found", 404);
  return { workspace, member };
}

export function countIntegrations(workspaceId: string) {
  return getDb()
    .select()
    .from(integrations)
    .where(eq(integrations.workspaceId, workspaceId))
    .all().length;
}

export function assertCanCreateIntegration(workspace: Workspace) {
  const count = countIntegrations(workspace.id);
  if (workspace.plan === "free" && count >= FREE_INTEGRATION_LIMIT) {
    throw new AuthError(
      "Free plan allows 1 integration. Upgrade to Pro to add more.",
      402,
    );
  }
  if (count >= PRO_INTEGRATION_CAP) {
    throw new AuthError("Integration limit reached", 400);
  }
}

export function listIntegrations(workspaceId: string) {
  return getDb()
    .select()
    .from(integrations)
    .where(eq(integrations.workspaceId, workspaceId))
    .all();
}

export function getIntegration(id: string) {
  return (
    getDb().select().from(integrations).where(eq(integrations.id, id)).get() ??
    null
  );
}

export function createIntegration(input: {
  workspaceId: string;
  name: string;
  owner: string;
  repo: string;
  beforePath: string;
  afterPath: string;
  beforeRef: string;
  afterRef: string;
  consumerPaths: string[];
  consumerRef: string;
  baseBranch: string;
}): Integration {
  const now = new Date();
  return getDb()
    .insert(integrations)
    .values({
      id: randomUUID(),
      workspaceId: input.workspaceId,
      name: input.name,
      owner: input.owner,
      repo: input.repo,
      beforePath: input.beforePath,
      afterPath: input.afterPath,
      beforeRef: input.beforeRef,
      afterRef: input.afterRef,
      consumerPaths: input.consumerPaths,
      consumerRef: input.consumerRef,
      baseBranch: input.baseBranch,
      enabled: true,
      webhookSecret: randomBytes(24).toString("hex"),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
}

export function updateIntegration(
  id: string,
  patch: Partial<{
    name: string;
    beforePath: string;
    afterPath: string;
    beforeRef: string;
    afterRef: string;
    consumerPaths: string[];
    consumerRef: string;
    baseBranch: string;
    enabled: boolean;
    webhookId: number | null;
    lastCheckedAt: Date | null;
  }>,
) {
  return getDb()
    .update(integrations)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(integrations.id, id))
    .returning()
    .get();
}

export function deleteIntegration(id: string) {
  getDb().delete(repairRuns).where(eq(repairRuns.integrationId, id)).run();
  getDb().delete(integrations).where(eq(integrations.id, id)).run();
}

export function listRuns(workspaceId: string, limit = 50) {
  const db = getDb();
  const ints = db
    .select()
    .from(integrations)
    .where(eq(integrations.workspaceId, workspaceId))
    .all();
  const ids = new Set(ints.map((i) => i.id));
  const runs = db
    .select()
    .from(repairRuns)
    .orderBy(desc(repairRuns.createdAt))
    .all()
    .filter((r) => ids.has(r.integrationId))
    .slice(0, limit);

  const byId = new Map(ints.map((i) => [i.id, i]));
  return runs.map((run) => ({
    ...run,
    integrationName: byId.get(run.integrationId)?.name ?? "Unknown",
  }));
}

export function listRunsForIntegration(integrationId: string, limit = 30) {
  return getDb()
    .select()
    .from(repairRuns)
    .where(eq(repairRuns.integrationId, integrationId))
    .orderBy(desc(repairRuns.createdAt))
    .all()
    .slice(0, limit);
}

export function serializeIntegration(i: Integration) {
  return {
    id: i.id,
    workspaceId: i.workspaceId,
    name: i.name,
    owner: i.owner,
    repo: i.repo,
    fullName: `${i.owner}/${i.repo}`,
    beforePath: i.beforePath,
    afterPath: i.afterPath,
    beforeRef: i.beforeRef,
    afterRef: i.afterRef,
    consumerPaths: i.consumerPaths,
    consumerRef: i.consumerRef,
    baseBranch: i.baseBranch,
    enabled: i.enabled,
    webhookId: i.webhookId,
    lastCheckedAt: i.lastCheckedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  };
}
