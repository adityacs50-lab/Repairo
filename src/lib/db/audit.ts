import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export function writeAudit(input: {
  workspaceId?: string | null;
  userId?: string | null;
  action: string;
  meta?: Record<string, unknown>;
}) {
  try {
    getDb()
      .insert(auditLogs)
      .values({
        id: randomUUID(),
        workspaceId: input.workspaceId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        metaJson: input.meta ?? null,
        createdAt: new Date(),
      })
      .run();
  } catch {
    /* never break product flows on audit failure */
  }
}

export function listAudit(workspaceId: string, limit = 40) {
  return getDb()
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.workspaceId, workspaceId))
    .orderBy(desc(auditLogs.createdAt))
    .all()
    .slice(0, limit);
}
