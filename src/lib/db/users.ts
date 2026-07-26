import { eq } from "drizzle-orm";
import { getDb } from "./index";
import {
  users,
  workspaces,
  workspaceMembers,
  type User,
  type Workspace,
} from "./schema";
import { encryptToken } from "@/lib/crypto/token";
import { randomUUID } from "crypto";
import { acceptPendingInvitesForLogin } from "@/lib/db/invites";
import { writeAudit } from "@/lib/db/audit";

export async function upsertGithubUser(input: {
  githubId: string;
  login: string;
  name?: string | null;
  avatarUrl: string;
  accessToken: string;
}): Promise<{ user: User; workspace: Workspace }> {
  const db = getDb();
  const now = new Date();
  const encrypted = encryptToken(input.accessToken);

  const existing = db
    .select()
    .from(users)
    .where(eq(users.githubId, input.githubId))
    .get();

  let user: User;
  if (existing) {
    user = db
      .update(users)
      .set({
        login: input.login,
        name: input.name ?? null,
        avatarUrl: input.avatarUrl,
        encryptedAccessToken: encrypted,
        updatedAt: now,
      })
      .where(eq(users.id, existing.id))
      .returning()
      .get();
  } else {
    const userId = randomUUID();
    user = db
      .insert(users)
      .values({
        id: userId,
        githubId: input.githubId,
        login: input.login,
        name: input.name ?? null,
        avatarUrl: input.avatarUrl,
        encryptedAccessToken: encrypted,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    const workspaceId = randomUUID();
    const workspace = db
      .insert(workspaces)
      .values({
        id: workspaceId,
        name: `${input.login}'s workspace`,
        ownerUserId: user.id,
        plan: "free",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    db.insert(workspaceMembers)
      .values({
        id: randomUUID(),
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
        createdAt: now,
      })
      .run();

    acceptPendingInvitesForLogin(user.id, input.login);
    writeAudit({
      workspaceId: workspace.id,
      userId: user.id,
      action: "user.signup",
      meta: { login: input.login },
    });

    return { user, workspace };
  }

  const membership = db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id))
    .get();

  let workspace: Workspace;
  if (membership) {
    workspace = db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, membership.workspaceId))
      .get()!;
  } else {
    workspace = db
      .insert(workspaces)
      .values({
        id: randomUUID(),
        name: `${input.login}'s workspace`,
        ownerUserId: user.id,
        plan: "free",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    db.insert(workspaceMembers)
      .values({
        id: randomUUID(),
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
        createdAt: now,
      })
      .run();
  }

  acceptPendingInvitesForLogin(user.id, input.login);

  return { user, workspace };
}

export function getUserById(id: string) {
  return getDb().select().from(users).where(eq(users.id, id)).get() ?? null;
}

export function getWorkspaceForUser(userId: string) {
  const db = getDb();
  const membership = db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .get();
  if (!membership) return null;
  return (
    db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, membership.workspaceId))
      .get() ?? null
  );
}
