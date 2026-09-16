import { and, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { firstRow, getDb } from "@/lib/db";
import { integrations, workspaces } from "@/lib/db/schema";
import { runIntegrationJob } from "@/lib/jobs/run-integration";
import { writeAudit } from "@/lib/db/audit";
import { getPlanLimits } from "@/lib/billing/plans";
import { countRunsThisMonth } from "@/lib/db/integrations";

export type PollResult = {
  checked: number;
  ran: number;
  skipped: number;
  errors: Array<{ integrationId: string; error: string }>;
};

/**
 * Poll remote vendor agents whose OpenAPI may have moved.
 * Safe to call from cron — respects monthly run caps.
 */
export async function pollVendorAgents(options?: {
  limit?: number;
  /** Only poll if lastChecked older than this (ms). Default 1h. */
  minAgeMs?: number;
}): Promise<PollResult> {
  const limit = options?.limit ?? 20;
  const minAgeMs = options?.minAgeMs ?? 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - minAgeMs);
  const db = getDb();

  const candidates = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.enabled, true),
        eq(integrations.specSource, "remote"),
        isNotNull(integrations.vendorId),
        or(
          isNull(integrations.lastCheckedAt),
          lt(integrations.lastCheckedAt, cutoff),
        ),
      ),
    )
    .limit(limit);

  const result: PollResult = {
    checked: candidates.length,
    ran: 0,
    skipped: 0,
    errors: [],
  };

  for (const integration of candidates) {
    const claimed = await db
      .update(integrations)
      .set({ lastCheckedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(integrations.id, integration.id),
          or(
            isNull(integrations.lastCheckedAt),
            lt(integrations.lastCheckedAt, cutoff),
          ),
        ),
      )
      .returning({ id: integrations.id });
    if (!claimed.length) {
      result.skipped += 1;
      continue;
    }

    const workspace = await firstRow(
      db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, integration.workspaceId))
        .limit(1),
    );
    if (!workspace) {
      result.skipped += 1;
      continue;
    }

    const limits = getPlanLimits(workspace.plan);
    if (await countRunsThisMonth(workspace.id) >= limits.runsPerMonth) {
      result.skipped += 1;
      continue;
    }

    try {
      const outcome = await runIntegrationJob({
        integration,
        trigger: "webhook",
      });
      result.ran += 1;
      await writeAudit({
        workspaceId: workspace.id,
        action: "vendor.poll",
        meta: {
          integrationId: integration.id,
          vendorId: integration.vendorId,
          status: outcome.status,
        },
      });
    } catch (error) {
      result.errors.push({
        integrationId: integration.id,
        error: error instanceof Error ? error.message : "poll failed",
      });
    }
  }

  return result;
}
