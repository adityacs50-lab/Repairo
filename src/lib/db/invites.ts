import { and, count, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { firstRow, getDb } from "@/lib/db";
import { pendingInvites, workspaceMembers } from "@/lib/db/schema";
import { getPlanLimits } from "@/lib/billing/plans";
import { AuthError } from "@/lib/auth/session";
import { writeAudit } from "@/lib/db/audit";
import type { Workspace } from "@/lib/db/schema";

/**
 * Seat and pending-invite counts are done with SQL count() rather than by
 * reading every row and taking .length. That was cheap against a local SQLite
 * file; against Postgres it would pull a workspace's entire membership over
 * the wire on every invite check.
 */
export async function countSeats(workspaceId: string) {
  const row = await firstRow(
    getDb()
      .select({ value: count() })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId)),
  );
  return row?.value ?? 0;
}

async function countPendingInvites(workspaceId: string) {
  const row = await firstRow(
    getDb()
      .select({ value: count() })
      .from(pendingInvites)
      .where(
        and(
          eq(pendingInvites.workspaceId, workspaceId),
          eq(pendingInvites.status, "pending"),
        ),
      ),
  );
  return row?.value ?? 0;
}

export async function assertCanInvite(workspace: Workspace) {
  const limits = getPlanLimits(workspace.plan);
  const [seats, pending] = await Promise.all([
    countSeats(workspace.id),
    countPendingInvites(workspace.id),
  ]);
  if (seats + pending >= limits.seats) {
    throw new AuthError(
      `${limits.name} plan allows ${limits.seats} seats. Upgrade to add more.`,
      402,
    );
  }
}

export async function createPendingInvite(input: {
  workspace: Workspace;
  githubLogin: string;
  invitedByUserId: string;
}) {
  await assertCanInvite(input.workspace);
  const login = input.githubLogin.trim().replace(/^@/, "").toLowerCase();
  if (!login) throw new AuthError("GitHub username required", 400);

  const existing = await firstRow(
    getDb()
      .select()
      .from(pendingInvites)
      .where(
        and(
          eq(pendingInvites.workspaceId, input.workspace.id),
          eq(pendingInvites.githubLogin, login),
          eq(pendingInvites.status, "pending"),
        ),
      )
      .limit(1),
  );
  if (existing) return existing;

  const [row] = await getDb()
    .insert(pendingInvites)
    .values({
      id: randomUUID(),
      workspaceId: input.workspace.id,
      githubLogin: login,
      invitedByUserId: input.invitedByUserId,
      status: "pending",
      createdAt: new Date(),
    })
    .returning();

  await writeAudit({
    workspaceId: input.workspace.id,
    userId: input.invitedByUserId,
    action: "invite.pending",
    meta: { githubLogin: login },
  });

  return row;
}

export function listPendingInvites(workspaceId: string) {
  return getDb()
    .select()
    .from(pendingInvites)
    .where(
      and(
        eq(pendingInvites.workspaceId, workspaceId),
        eq(pendingInvites.status, "pending"),
      ),
    );
}

/** Accept any pending invites for this GitHub login after signup/login. */
export async function acceptPendingInvitesForLogin(userId: string, login: string) {
  const db = getDb();
  const invites = await db
    .select()
    .from(pendingInvites)
    .where(
      and(
        eq(pendingInvites.githubLogin, login.toLowerCase()),
        eq(pendingInvites.status, "pending"),
      ),
    );

  for (const invite of invites) {
    const already = await firstRow(
      db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, invite.workspaceId),
            eq(workspaceMembers.userId, userId),
          ),
        )
        .limit(1),
    );
    if (!already) {
      await db.insert(workspaceMembers).values({
        id: randomUUID(),
        workspaceId: invite.workspaceId,
        userId,
        role: "member",
        createdAt: new Date(),
      });
    }
    await db
      .update(pendingInvites)
      .set({ status: "accepted" })
      .where(eq(pendingInvites.id, invite.id));
    await writeAudit({
      workspaceId: invite.workspaceId,
      userId,
      action: "invite.accepted",
      meta: { githubLogin: login },
    });
  }
}
