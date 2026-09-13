import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function writeAudit(input: {
  workspaceId?: string | null;
  userId?: string | null;
  action: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await getDb()
      .insert(auditLogs)
      .values({
        id: randomUUID(),
        workspaceId: input.workspaceId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        metaJson: input.meta ?? null,
        createdAt: new Date(),
      });
  } catch {
    /* never break product flows on audit failure */
  }
}

export async function listAudit(workspaceId: string, limit = 40) {
  // The limit is applied in SQL now. Previously this read every row for the
  // workspace and sliced in JS, which was survivable against a local SQLite
  // file and is not against a network database.
  return getDb()
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.workspaceId, workspaceId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
