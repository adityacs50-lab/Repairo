import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { pendingInvites, workspaceMembers } from "@/lib/db/schema";
import { getPlanLimits } from "@/lib/billing/plans";
import { AuthError } from "@/lib/auth/session";
import { writeAudit } from "@/lib/db/audit";
import type { Workspace } from "@/lib/db/schema";

export function countSeats(workspaceId: string) {
  return getDb()
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .all().length;
}

export function assertCanInvite(workspace: Workspace) {
  const limits = getPlanLimits(workspace.plan);
  const seats = countSeats(workspace.id);
  const pending = getDb()
    .select()
    .from(pendingInvites)
    .where(
      and(
        eq(pendingInvites.workspaceId, workspace.id),
        eq(pendingInvites.status, "pending"),
      ),
    )
    .all().length;
  if (seats + pending >= limits.seats) {
    throw new AuthError(
      `${limits.name} plan allows ${limits.seats} seats. Upgrade to add more.`,
      402,
    );
  }
}

export function createPendingInvite(input: {
  workspace: Workspace;
  githubLogin: string;
  invitedByUserId: string;
}) {
  assertCanInvite(input.workspace);
  const login = input.githubLogin.trim().replace(/^@/, "").toLowerCase();
  if (!login) throw new AuthError("GitHub username required", 400);

  const existing = getDb()
    .select()
    .from(pendingInvites)
    .where(
      and(
        eq(pendingInvites.workspaceId, input.workspace.id),
        eq(pendingInvites.githubLogin, login),
        eq(pendingInvites.status, "pending"),
      ),
    )
    .get();
  if (existing) return existing;

  const row = getDb()
    .insert(pendingInvites)
    .values({
      id: randomUUID(),
      workspaceId: input.workspace.id,
      githubLogin: login,
      invitedByUserId: input.invitedByUserId,
      status: "pending",
      createdAt: new Date(),
    })
    .returning()
    .get();

  writeAudit({
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
    )
    .all();
}

/** Accept any pending invites for this GitHub login after signup/login. */
export function acceptPendingInvitesForLogin(userId: string, login: string) {
  const db = getDb();
  const invites = db
    .select()
    .from(pendingInvites)
    .where(
      and(
        eq(pendingInvites.githubLogin, login.toLowerCase()),
        eq(pendingInvites.status, "pending"),
      ),
    )
    .all();

  for (const invite of invites) {
    const already = db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, invite.workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .get();
    if (!already) {
      db.insert(workspaceMembers)
        .values({
          id: randomUUID(),
          workspaceId: invite.workspaceId,
          userId,
          role: "member",
          createdAt: new Date(),
        })
        .run();
    }
    db.update(pendingInvites)
      .set({ status: "accepted" })
      .where(eq(pendingInvites.id, invite.id))
      .run();
    writeAudit({
      workspaceId: invite.workspaceId,
      userId,
      action: "invite.accepted",
      meta: { githubLogin: login },
    });
  }
}
