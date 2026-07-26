import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import {
  deleteIntegration,
  getIntegration,
  requireWorkspaceAccess,
  serializeIntegration,
  updateIntegration,
} from "@/lib/db/integrations";
import { deleteRepoWebhook } from "@/lib/github/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    requireGithubConfig();
    const session = await requireSession();
    const { id } = await params;
    const integration = getIntegration(id);
    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    requireWorkspaceAccess(session.userId, integration.workspaceId);
    return NextResponse.json({
      integration: serializeIntegration(integration),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireGithubConfig();
    const session = await requireSession();
    const { id } = await params;
    const integration = getIntegration(id);
    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    requireWorkspaceAccess(session.userId, integration.workspaceId);

    const body = (await request.json()) as Partial<{
      name: string;
      beforePath: string;
      afterPath: string;
      beforeRef: string;
      afterRef: string;
      consumerPaths: string[];
      consumerRef: string;
      baseBranch: string;
      enabled: boolean;
    }>;

    const updated = updateIntegration(id, {
      ...body,
      consumerPaths: body.consumerPaths
        ? body.consumerPaths.map((p) => p.trim()).filter(Boolean)
        : undefined,
    });

    return NextResponse.json({
      integration: serializeIntegration(updated),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    requireGithubConfig();
    const session = await requireSession();
    const { id } = await params;
    const integration = getIntegration(id);
    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    requireWorkspaceAccess(session.userId, integration.workspaceId);

    if (integration.webhookId) {
      await deleteRepoWebhook({
        token: session.accessToken,
        owner: integration.owner,
        repo: integration.repo,
        hookId: integration.webhookId,
      });
    }

    deleteIntegration(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
