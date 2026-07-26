import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  integrations,
  repairRuns,
  workspaces,
  workspaceMembers,
  subscriptions,
  auditLogs,
  type Integration,
  type Workspace,
} from "@/lib/db/schema";
import { AuthError } from "@/lib/auth/session";
import { randomBytes, randomUUID } from "crypto";
import { getPlanLimits } from "@/lib/billing/plans";
import { writeAudit } from "@/lib/db/audit";

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

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function countRunsThisMonth(workspaceId: string) {
  const db = getDb();
  const ints = db
    .select()
    .from(integrations)
    .where(eq(integrations.workspaceId, workspaceId))
    .all();
  const ids = new Set(ints.map((i) => i.id));
  const start = monthStart();
  const integrationRuns = db
    .select()
    .from(repairRuns)
    .where(gte(repairRuns.createdAt, start))
    .all()
    .filter((r) => ids.has(r.integrationId)).length;

  // Quick repairs don't create repair_runs rows — count audit events too.
  const quick = db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.workspaceId, workspaceId))
    .all()
    .filter(
      (a) =>
        a.action === "repair.quick" &&
        a.createdAt.getTime() >= start.getTime(),
    ).length;

  return integrationRuns + quick;
}

export function getWorkspaceUsage(workspace: Workspace) {
  const limits = getPlanLimits(workspace.plan);
  const integrationsUsed = countIntegrations(workspace.id);
  const runsUsed = countRunsThisMonth(workspace.id);
  const seatsUsed = getDb()
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspace.id))
    .all().length;
  const sub = getDb()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspace.id))
    .get();

  return {
    plan: workspace.plan,
    limits: {
      integrations: limits.integrations,
      runsPerMonth: limits.runsPerMonth,
      seats: limits.seats,
    },
    used: {
      integrations: integrationsUsed,
      runsThisMonth: runsUsed,
      seats: seatsUsed,
    },
    subscriptionStatus: sub?.status ?? "inactive",
    paymentIssue: ["past_due", "unpaid", "incomplete"].includes(
      sub?.status ?? "",
    ),
  };
}

export function assertCanCreateIntegration(workspace: Workspace) {
  const limits = getPlanLimits(workspace.plan);
  const count = countIntegrations(workspace.id);
  if (count >= limits.integrations) {
    throw new AuthError(
      `${limits.name} plan allows ${limits.integrations} integration${
        limits.integrations === 1 ? "" : "s"
      }. Upgrade to Pro for more.`,
      402,
    );
  }
}

export function assertCanRunRepair(workspace: Workspace) {
  const limits = getPlanLimits(workspace.plan);
  const used = countRunsThisMonth(workspace.id);
  if (used >= limits.runsPerMonth) {
    throw new AuthError(
      `Monthly run limit reached (${limits.runsPerMonth} on ${limits.name}). Upgrade or wait until next month.`,
      402,
    );
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
  specSource?: "repo" | "remote";
  vendorId?: string | null;
  vendorSpecUrl?: string | null;
  baselineSpec?: string | null;
}): Integration {
  const now = new Date();
  const row = getDb()
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
      specSource: input.specSource ?? "repo",
      vendorId: input.vendorId ?? null,
      vendorSpecUrl: input.vendorSpecUrl ?? null,
      baselineSpec: input.baselineSpec ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  writeAudit({
    workspaceId: input.workspaceId,
    action: "integration.created",
    meta: {
      id: row.id,
      repo: `${input.owner}/${input.repo}`,
      vendorId: input.vendorId,
    },
  });

  return row;
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
    baselineSpec: string | null;
    vendorSpecUrl: string | null;
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
  const existing = getIntegration(id);
  getDb().delete(repairRuns).where(eq(repairRuns.integrationId, id)).run();
  getDb().delete(integrations).where(eq(integrations.id, id)).run();
  if (existing) {
    writeAudit({
      workspaceId: existing.workspaceId,
      action: "integration.deleted",
      meta: { id },
    });
  }
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
    specSource: i.specSource ?? "repo",
    vendorId: i.vendorId,
    vendorSpecUrl: i.vendorSpecUrl,
    hasBaseline: Boolean(i.baselineSpec),
    lastCheckedAt: i.lastCheckedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  };
}
