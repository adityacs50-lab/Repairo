import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import {
  getIntegration,
  requireWorkspaceAccess,
} from "@/lib/db/integrations";
import { runIntegrationJob } from "@/lib/jobs/run-integration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    requireGithubConfig();
    const session = await requireSession();
    const { id } = await params;
    const integration = getIntegration(id);
    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    requireWorkspaceAccess(session.userId, integration.workspaceId);

    const outcome = await runIntegrationJob({
      integration,
      trigger: "manual",
      accessToken: session.accessToken,
    });

    return NextResponse.json({
      runId: outcome.runId,
      status: outcome.status,
      result: outcome.result,
      pr: outcome.pr,
    });
  } catch (error) {
    return jsonError(error);
  }
}
