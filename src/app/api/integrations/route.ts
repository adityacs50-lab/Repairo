import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import { getWorkspaceForUser } from "@/lib/db/users";
import {
  assertCanCreateIntegration,
  createIntegration,
  listIntegrations,
  requireWorkspaceAccess,
  serializeIntegration,
} from "@/lib/db/integrations";
import { createRepoWebhook } from "@/lib/github/client";
import { getAppUrl } from "@/lib/auth/config";

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
    requireWorkspaceAccess(session.userId, workspace.id);
    const items = listIntegrations(workspace.id).map(serializeIntegration);
    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
      },
      integrations: items,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireGithubConfig();
    const session = await requireSession();
    const workspace = getWorkspaceForUser(session.userId);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }
    requireWorkspaceAccess(session.userId, workspace.id);
    assertCanCreateIntegration(workspace);

    const body = (await request.json()) as {
      name?: string;
      owner?: string;
      repo?: string;
      beforePath?: string;
      afterPath?: string;
      beforeRef?: string;
      afterRef?: string;
      consumerPaths?: string[];
      consumerRef?: string;
      baseBranch?: string;
      registerWebhook?: boolean;
    };

    if (
      !body.name ||
      !body.owner ||
      !body.repo ||
      !body.beforePath ||
      !body.afterPath ||
      !Array.isArray(body.consumerPaths) ||
      !body.consumerPaths.length
    ) {
      return NextResponse.json(
        {
          error:
            "name, owner, repo, beforePath, afterPath, and consumerPaths are required",
        },
        { status: 400 },
      );
    }

    const integration = createIntegration({
      workspaceId: workspace.id,
      name: body.name,
      owner: body.owner,
      repo: body.repo,
      beforePath: body.beforePath,
      afterPath: body.afterPath,
      beforeRef: body.beforeRef || body.baseBranch || "main",
      afterRef: body.afterRef || body.baseBranch || "main",
      consumerPaths: body.consumerPaths.map((p) => p.trim()).filter(Boolean),
      consumerRef: body.consumerRef || body.baseBranch || "main",
      baseBranch: body.baseBranch || "main",
    });

    let webhookWarning: string | null = null;
    if (body.registerWebhook !== false) {
      try {
        const hookId = await createRepoWebhook({
          token: session.accessToken,
          owner: integration.owner,
          repo: integration.repo,
          hookUrl: `${getAppUrl()}/api/webhooks/github?integrationId=${integration.id}`,
          secret: integration.webhookSecret,
        });
        const { updateIntegration } = await import("@/lib/db/integrations");
        updateIntegration(integration.id, { webhookId: hookId });
        integration.webhookId = hookId;
      } catch (err) {
        webhookWarning =
          err instanceof Error
            ? `Integration saved but webhook failed: ${err.message}`
            : "Integration saved but webhook registration failed";
      }
    }

    return NextResponse.json({
      integration: serializeIntegration(integration),
      warning: webhookWarning,
    });
  } catch (error) {
    return jsonError(error);
  }
}
