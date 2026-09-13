import { eq } from "drizzle-orm";
import { firstRow, getDb } from "./index";
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

  const existing = await firstRow(
    db.select().from(users).where(eq(users.githubId, input.githubId)).limit(1),
  );

  let user: User;
  if (existing) {
    const updated = await db
      .update(users)
      .set({
        login: input.login,
        name: input.name ?? null,
        avatarUrl: input.avatarUrl,
        encryptedAccessToken: encrypted,
        updatedAt: now,
      })
      .where(eq(users.id, existing.id))
      .returning();
    user = updated[0];
  } else {
    const userId = randomUUID();
    const inserted = await db
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
      .returning();
    user = inserted[0];

    const workspaceId = randomUUID();
    const [workspace] = await db
      .insert(workspaces)
      .values({
        id: workspaceId,
        name: `${input.login}'s workspace`,
        ownerUserId: user.id,
        plan: "free",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await db.insert(workspaceMembers).values({
      id: randomUUID(),
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
      createdAt: now,
    });

    await acceptPendingInvitesForLogin(user.id, input.login);
    await writeAudit({
      workspaceId: workspace.id,
      userId: user.id,
      action: "user.signup",
      meta: { login: input.login },
    });

    return { user, workspace };
  }

  const membership = await firstRow(
    db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, user.id)).limit(1),
  );

  let workspace: Workspace;
  if (membership) {
    workspace = (await firstRow(
      db.select().from(workspaces).where(eq(workspaces.id, membership.workspaceId)).limit(1),
    ))!;
  } else {
    const [created] = await db
      .insert(workspaces)
      .values({
        id: randomUUID(),
        name: `${input.login}'s workspace`,
        ownerUserId: user.id,
        plan: "free",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    workspace = created;

    await db.insert(workspaceMembers).values({
      id: randomUUID(),
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
      createdAt: now,
    });
  }

  await acceptPendingInvitesForLogin(user.id, input.login);

  return { user, workspace };
}

export async function getUserById(id: string) {
  return (
    (await firstRow(getDb().select().from(users).where(eq(users.id, id)).limit(1))) ?? null
  );
}

export async function getWorkspaceForUser(userId: string) {
  const db = getDb();
  const membership = await firstRow(
    db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, userId)).limit(1),
  );
  if (!membership) return null;
  return (
    (await firstRow(
      db.select().from(workspaces).where(eq(workspaces.id, membership.workspaceId)).limit(1),
    )) ?? null
  );
}
