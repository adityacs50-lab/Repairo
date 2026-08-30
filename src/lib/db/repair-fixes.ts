import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { repairFixes, type RepairFix } from "@/lib/db/schema";
import type { SuggestedFix } from "@/lib/engine";

/**
 * Persists the full set of fixes a repair run produced — including fixes flagged unsafe
 * or ambiguous and never applied — as a permanent, queryable audit trail. This is the
 * only durable record of *why* a specific decision was made once the run's in-memory
 * SuggestedFix[] and the GitHub PR description (free-text, not queryable, editable,
 * deletable) are the only other place it ever existed. A no-op for an empty fix list.
 * Never throws: like writeAudit, a failure to record the audit trail must never fail the
 * repair run itself.
 */
export function recordFixes(repairRunId: string, fixes: SuggestedFix[]): void {
  if (fixes.length === 0) return;
  try {
    getDb()
      .insert(repairFixes)
      .values(
        fixes.map((fix) => ({
          id: randomUUID(),
          repairRunId,
          changeId: fix.changeId,
          file: fix.file,
          description: fix.description,
          before: fix.before,
          after: fix.after,
          safe: fix.safe,
          origin: fix.origin ?? "deterministic",
          agentConfidence: fix.agentConfidence ?? null,
          agentReasoning: fix.agentReasoning ?? null,
          safetyNotesJson: fix.safetyNotes,
          createdAt: new Date(),
        })),
      )
      .run();
  } catch (err) {
    console.warn(
      `[repairo] recordFixes: failed to persist fix audit trail for run ${repairRunId} — ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function listFixesForRun(repairRunId: string): RepairFix[] {
  return getDb()
    .select()
    .from(repairFixes)
    .where(eq(repairFixes.repairRunId, repairRunId))
    .all();
}
