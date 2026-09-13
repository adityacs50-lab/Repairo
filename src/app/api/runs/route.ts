import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import { getWorkspaceForUser } from "@/lib/db/users";
import { listRuns, requireWorkspaceAccess } from "@/lib/db/integrations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    requireGithubConfig();
    const session = await requireSession();
    const workspace = await getWorkspaceForUser(session.userId);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }
    await requireWorkspaceAccess(session.userId, workspace.id);
    const runs = (await listRuns(workspace.id)).map((run) => ({
      id: run.id,
      integrationId: run.integrationId,
      integrationName: run.integrationName,
      status: run.status,
      trigger: run.trigger,
      summary: run.summaryJson,
      prUrl: run.prUrl,
      prNumber: run.prNumber,
      error: run.error,
      createdAt: run.createdAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
    }));
    return NextResponse.json({ runs });
  } catch (error) {
    return jsonError(error);
  }
}
