import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { firstRow, getDb } from "@/lib/db";
import {
  integrations,
  repairRuns,
  repairFixes,
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

/**
 * Counting and filtering happen in SQL here, not in JavaScript.
 *
 * Under SQLite these helpers read whole tables and filtered with Array.filter,
 * which was survivable when the database was a local file. Two of them —
 * countRunsThisMonth and listRuns — selected from repair_runs with no
 * workspace predicate at all, so they read every run belonging to every
 * workspace and discarded the rest client-side. Against a network database
 * that is both slow and unbounded, so the predicates are now in the query.
 */

/** Ids of the integrations owned by a workspace. */
async function integrationIdsForWorkspace(workspaceId: string) {
  const rows = await getDb()
    .select({ id: integrations.id })
    .from(integrations)
    .where(eq(integrations.workspaceId, workspaceId));
  return rows.map((r) => r.id);
}

export async function requireWorkspaceAccess(userId: string, workspaceId: string) {
  const db = getDb();
  const member = await firstRow(
    db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1),
  );
  if (!member) throw new AuthError("Forbidden", 403);
  const workspace = await firstRow(
    db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1),
  );
  if (!workspace) throw new AuthError("Workspace not found", 404);
  return { workspace, member };
}

export async function requireWorkspaceOwner(userId: string, workspaceId: string) {
  const access = await requireWorkspaceAccess(userId, workspaceId);
  if (access.member.role !== "owner") throw new AuthError("Owner only", 403);
  return access;
}

export async function countIntegrations(workspaceId: string) {
  const row = await firstRow(
    getDb()
      .select({ value: count() })
      .from(integrations)
      .where(eq(integrations.workspaceId, workspaceId)),
  );
  return row?.value ?? 0;
}

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function countRunsThisMonth(workspaceId: string) {
  const db = getDb();
  const ids = await integrationIdsForWorkspace(workspaceId);
  const start = monthStart();

  const runsRow = ids.length
    ? await firstRow(
        db
          .select({ value: count() })
          .from(repairRuns)
          .where(
            and(
              inArray(repairRuns.integrationId, ids),
              gte(repairRuns.createdAt, start),
            ),
          ),
      )
    : undefined;

  // Quick repairs don't create repair_runs rows — count audit events too.
  const quickRow = await firstRow(
    db
      .select({ value: count() })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.workspaceId, workspaceId),
          eq(auditLogs.action, "repair.quick"),
          gte(auditLogs.createdAt, start),
        ),
      ),
  );

  return (runsRow?.value ?? 0) + (quickRow?.value ?? 0);
}

export async function getWorkspaceUsage(workspace: Workspace) {
  const db = getDb();
  const limits = getPlanLimits(workspace.plan);

  const [integrationsUsed, runsUsed, seatsRow, sub] = await Promise.all([
    countIntegrations(workspace.id),
    countRunsThisMonth(workspace.id),
    firstRow(
      db
        .select({ value: count() })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspace.id)),
    ),
    firstRow(
      db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.workspaceId, workspace.id))
        .limit(1),
    ),
  ]);

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
      seats: seatsRow?.value ?? 0,
    },
    subscriptionStatus: sub?.status ?? "inactive",
    paymentIssue: ["past_due", "unpaid", "incomplete"].includes(
      sub?.status ?? "",
    ),
  };
}

export async function assertCanCreateIntegration(workspace: Workspace) {
  const limits = getPlanLimits(workspace.plan);
  const used = await countIntegrations(workspace.id);
  if (used >= limits.integrations) {
    throw new AuthError(
      `${limits.name} plan allows ${limits.integrations} integration${
        limits.integrations === 1 ? "" : "s"
      }. Upgrade to Pro for more.`,
      402,
    );
  }
}

export async function assertCanRunRepair(workspace: Workspace) {
  const limits = getPlanLimits(workspace.plan);
  const used = await countRunsThisMonth(workspace.id);
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
    .where(eq(integrations.workspaceId, workspaceId));
}

export async function getIntegration(id: string) {
  return (
    (await firstRow(
      getDb().select().from(integrations).where(eq(integrations.id, id)).limit(1),
    )) ?? null
  );
}

export async function createIntegration(input: {
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
}): Promise<Integration> {
  const now = new Date();
  const [row] = await getDb()
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
    .returning();

  await writeAudit({
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

export type IntegrationPatch = Partial<{
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
}>;

const CLIENT_PATCH_KEYS = [
  "name",
  "beforePath",
  "afterPath",
  "beforeRef",
  "afterRef",
  "consumerPaths",
  "consumerRef",
  "baseBranch",
  "enabled",
] as const satisfies ReadonlyArray<keyof IntegrationPatch>;

/** Strip unknown JSON keys so a client cannot mass-assign workspaceId / webhookSecret. */
export function pickClientIntegrationPatch(input: Record<string, unknown>): IntegrationPatch {
  const patch: IntegrationPatch = {};
  for (const key of CLIENT_PATCH_KEYS) {
    if (!(key in input) || input[key] === undefined) continue;
    if (key === "consumerPaths") {
      if (!Array.isArray(input.consumerPaths)) continue;
      patch.consumerPaths = input.consumerPaths
        .filter((p): p is string => typeof p === "string")
        .map((p) => p.trim())
        .filter(Boolean);
      continue;
    }
    if (key === "enabled") {
      if (typeof input.enabled === "boolean") patch.enabled = input.enabled;
      continue;
    }
    if (typeof input[key] === "string") {
      (patch as Record<string, string>)[key] = (input[key] as string).trim();
    }
  }
  return patch;
}

export async function updateIntegration(id: string, patch: IntegrationPatch) {
  const allowed: IntegrationPatch = {};
  const serverKeys: Array<keyof IntegrationPatch> = [
    ...CLIENT_PATCH_KEYS,
    "webhookId",
    "lastCheckedAt",
    "baselineSpec",
    "vendorSpecUrl",
  ];
  for (const key of serverKeys) {
    if (patch[key] !== undefined) {
      (allowed as Record<string, unknown>)[key] = patch[key];
    }
  }
  const [row] = await getDb()
    .update(integrations)
    .set({ ...allowed, updatedAt: new Date() })
    .where(eq(integrations.id, id))
    .returning();
  return row;
}

export async function deleteIntegration(id: string) {
  const db = getDb();
  const existing = await getIntegration(id);

  // repair_fixes references repair_runs, which references integrations, so the
  // children go first. SQLite only enforced this because foreign_keys was
  // switched on at connection time; Postgres always does, and deleting the
  // runs first would fail outright on any integration that had recorded fixes.
  const runIds = (
    await db
      .select({ id: repairRuns.id })
      .from(repairRuns)
      .where(eq(repairRuns.integrationId, id))
  ).map((r) => r.id);

  if (runIds.length) {
    await db.delete(repairFixes).where(inArray(repairFixes.repairRunId, runIds));
  }
  await db.delete(repairRuns).where(eq(repairRuns.integrationId, id));
  await db.delete(integrations).where(eq(integrations.id, id));

  if (existing) {
    await writeAudit({
      workspaceId: existing.workspaceId,
      action: "integration.deleted",
      meta: { id },
    });
  }
}

export async function listRuns(workspaceId: string, limit = 50) {
  const db = getDb();
  const ints = await db
    .select()
    .from(integrations)
    .where(eq(integrations.workspaceId, workspaceId));
  if (ints.length === 0) return [];

  const runs = await db
    .select()
    .from(repairRuns)
    .where(
      inArray(
        repairRuns.integrationId,
        ints.map((i) => i.id),
      ),
    )
    .orderBy(desc(repairRuns.createdAt))
    .limit(limit);

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
    .limit(limit);
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
