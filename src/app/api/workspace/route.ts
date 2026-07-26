import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import {
  users,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import { getWorkspaceForUser } from "@/lib/db/users";
import { requireWorkspaceAccess } from "@/lib/db/integrations";
import { randomUUID } from "crypto";
import { stripeConfigured } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    requireGithubConfig();
    const session = await requireSession();
    const workspace = getWorkspaceForUser(session.userId);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }
    const { member } = requireWorkspaceAccess(session.userId, workspace.id);
    const members = getDb()
      .select({
        id: workspaceMembers.id,
        role: workspaceMembers.role,
        userId: workspaceMembers.userId,
        login: users.login,
        avatarUrl: users.avatarUrl,
        name: users.name,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspace.id))
      .all();

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
        ownerUserId: workspace.ownerUserId,
      },
      role: member.role,
      members,
      billingConfigured: stripeConfigured(),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    requireGithubConfig();
    const session = await requireSession();
    const workspace = getWorkspaceForUser(session.userId);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }
    const { member } = requireWorkspaceAccess(session.userId, workspace.id);
    if (member.role !== "owner") {
      return NextResponse.json({ error: "Owner only" }, { status: 403 });
    }

    const body = (await request.json()) as {
      name?: string;
      inviteLogin?: string;
    };

    if (body.name?.trim()) {
      getDb()
        .update(workspaces)
        .set({ name: body.name.trim(), updatedAt: new Date() })
        .where(eq(workspaces.id, workspace.id))
        .run();
    }

    if (body.inviteLogin?.trim()) {
      const invitee = getDb()
        .select()
        .from(users)
        .where(eq(users.login, body.inviteLogin.trim()))
        .get();
      if (!invitee) {
        return NextResponse.json(
          {
            error:
              "User not found. They must sign in to Repairo with GitHub first.",
          },
          { status: 404 },
        );
      }
      const existing = getDb()
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, invitee.id))
        .get();
      // Allow invite even if in another workspace membership unique is per workspace
      const already = getDb()
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspace.id))
        .all()
        .find((m) => m.userId === invitee.id);
      if (!already) {
        getDb()
          .insert(workspaceMembers)
          .values({
            id: randomUUID(),
            workspaceId: workspace.id,
            userId: invitee.id,
            role: "member",
            createdAt: new Date(),
          })
          .run();
      }
      void existing;
    }

    const updated = getWorkspaceForUser(session.userId);
    return NextResponse.json({
      workspace: updated
        ? {
            id: updated.id,
            name: updated.name,
            plan: updated.plan,
          }
        : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
