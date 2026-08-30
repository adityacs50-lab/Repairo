import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import { getFileContent, getRepo } from "@/lib/github/client";
import { runRepair } from "@/lib/engine";
import { getWorkspaceForUser } from "@/lib/db/users";
import { assertCanRunRepair } from "@/lib/db/integrations";
import { assertRateLimit, clientIp } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/db/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    requireGithubConfig();
    assertRateLimit({
      key: `repair-gh:${clientIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });
    const session = await requireSession();
    const workspace = getWorkspaceForUser(session.userId);
    if (workspace) assertCanRunRepair(workspace);

    const body = (await request.json()) as {
      owner?: string;
      repo?: string;
      beforePath?: string;
      afterPath?: string;
      beforeRef?: string;
      afterRef?: string;
      consumerPaths?: string[];
      consumerRef?: string;
    };

    if (
      !body.owner ||
      !body.repo ||
      !body.beforePath ||
      !body.afterPath ||
      !Array.isArray(body.consumerPaths) ||
      body.consumerPaths.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "owner, repo, beforePath, afterPath, and consumerPaths[] are required",
        },
        { status: 400 },
      );
    }

    const repo = await getRepo(session.accessToken, body.owner, body.repo);
    const consumerRef = body.consumerRef || repo.default_branch;
    const beforeRef = body.beforeRef || repo.default_branch;
    const afterRef = body.afterRef || repo.default_branch;

    const before = await getFileContent(
      session.accessToken,
      body.owner,
      body.repo,
      body.beforePath,
      beforeRef,
    );
    const after = await getFileContent(
      session.accessToken,
      body.owner,
      body.repo,
      body.afterPath,
      afterRef,
    );

    const consumerFiles = [];
    for (const path of body.consumerPaths) {
      const trimmed = path.trim();
      if (!trimmed) continue;
      const file = await getFileContent(
        session.accessToken,
        body.owner,
        body.repo,
        trimmed,
        consumerRef,
      );
      consumerFiles.push({ path: file.path, content: file.content });
    }

    if (!consumerFiles.length) {
      return NextResponse.json(
        { error: "At least one consumer file is required" },
        { status: 400 },
      );
    }

    const result = await runRepair({
      beforeSpec: before.content,
      afterSpec: after.content,
      consumerFiles,
    });

    writeAudit({
      workspaceId: workspace?.id,
      userId: session.userId,
      action: "repair.quick",
      meta: { owner: body.owner, repo: body.repo },
    });

    return NextResponse.json({
      result,
      meta: {
        owner: body.owner,
        repo: body.repo,
        defaultBranch: repo.default_branch,
        beforeRef,
        afterRef,
        consumerRef,
        beforePath: before.path,
        afterPath: after.path,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
