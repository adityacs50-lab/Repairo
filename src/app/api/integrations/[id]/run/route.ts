import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import {
  assertCanRunRepair,
  getIntegration,
  requireWorkspaceAccess,
} from "@/lib/db/integrations";
import { runIntegrationJob } from "@/lib/jobs/run-integration";
import { assertRateLimit, clientIp } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/db/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireGithubConfig();
    assertRateLimit({
      key: `run:${clientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    const session = await requireSession();
    const { id } = await params;
    const integration = getIntegration(id);
    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { workspace } = requireWorkspaceAccess(
      session.userId,
      integration.workspaceId,
    );
    assertCanRunRepair(workspace);

    const outcome = await runIntegrationJob({
      integration,
      trigger: "manual",
      accessToken: session.accessToken,
    });

    writeAudit({
      workspaceId: workspace.id,
      userId: session.userId,
      action: "repair.manual",
      meta: { integrationId: id, status: outcome.status },
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
