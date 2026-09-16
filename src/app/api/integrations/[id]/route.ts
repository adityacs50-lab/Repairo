import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import {
  deleteIntegration,
  getIntegration,
  pickClientIntegrationPatch,
  requireWorkspaceAccess,
  requireWorkspaceOwner,
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
    const integration = await getIntegration(id);
    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await requireWorkspaceAccess(session.userId, integration.workspaceId);
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
    const integration = await getIntegration(id);
    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await requireWorkspaceOwner(session.userId, integration.workspaceId);

    const raw = (await request.json()) as Record<string, unknown>;
    const patch = pickClientIntegrationPatch(raw);
    const updated = await updateIntegration(id, patch);

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
    const integration = await getIntegration(id);
    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await requireWorkspaceOwner(session.userId, integration.workspaceId);

    if (integration.webhookId) {
      await deleteRepoWebhook({
        token: session.accessToken,
        owner: integration.owner,
        repo: integration.repo,
        hookId: integration.webhookId,
      });
    }

    await deleteIntegration(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
