import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import {
  users,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import { getWorkspaceForUser } from "@/lib/db/users";
import {
  getWorkspaceUsage,
  requireWorkspaceAccess,
} from "@/lib/db/integrations";
import { randomUUID } from "crypto";
import { stripeConfigured } from "@/lib/billing/stripe";
import { PLANS } from "@/lib/billing/plans";
import {
  createPendingInvite,
  listPendingInvites,
} from "@/lib/db/invites";
import { listAudit } from "@/lib/db/audit";
import { writeAudit } from "@/lib/db/audit";
import { assertCanInvite } from "@/lib/db/invites";

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

    const usage = getWorkspaceUsage(workspace);
    const pending = listPendingInvites(workspace.id);
    const audit = listAudit(workspace.id, 20);

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
        ownerUserId: workspace.ownerUserId,
      },
      role: member.role,
      members,
      pendingInvites: pending.map((p) => ({
        id: p.id,
        githubLogin: p.githubLogin,
        createdAt: p.createdAt.toISOString(),
      })),
      usage,
      plans: PLANS,
      audit: audit.map((a) => ({
        id: a.id,
        action: a.action,
        meta: a.metaJson,
        createdAt: a.createdAt.toISOString(),
      })),
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
      writeAudit({
        workspaceId: workspace.id,
        userId: session.userId,
        action: "workspace.renamed",
        meta: { name: body.name.trim() },
      });
    }

    if (body.inviteLogin?.trim()) {
      const login = body.inviteLogin.trim().replace(/^@/, "");
      const invitee = getDb()
        .select()
        .from(users)
        .where(sql`lower(${users.login}) = ${login.toLowerCase()}`)
        .get();

      if (invitee) {
        assertCanInvite(workspace);
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
          writeAudit({
            workspaceId: workspace.id,
            userId: session.userId,
            action: "invite.accepted_direct",
            meta: { githubLogin: login },
          });
        }
      } else {
        createPendingInvite({
          workspace,
          githubLogin: login,
          invitedByUserId: session.userId,
        });
      }
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
      pendingInvites: updated
        ? listPendingInvites(updated.id).map((p) => ({
            id: p.id,
            githubLogin: p.githubLogin,
            createdAt: p.createdAt.toISOString(),
          }))
        : [],
    });
  } catch (error) {
    return jsonError(error);
  }
}
