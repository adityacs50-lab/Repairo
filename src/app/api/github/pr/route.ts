import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import {
  createPullRequestFromRepair,
  getRepo,
} from "@/lib/github/client";
import type { RepairRunResult } from "@/lib/engine/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    requireGithubConfig();
    const session = await requireSession();
    const body = (await request.json()) as {
      owner?: string;
      repo?: string;
      base?: string;
      result?: RepairRunResult;
    };

    if (!body.owner || !body.repo || !body.result) {
      return NextResponse.json(
        { error: "owner, repo, and result are required" },
        { status: 400 },
      );
    }

    if (!body.result.pullRequest?.files?.length) {
      return NextResponse.json(
        { error: "Repair result has no file changes to open as a PR" },
        { status: 400 },
      );
    }

    const repo = await getRepo(session.accessToken, body.owner, body.repo);
    const base = body.base || repo.default_branch;

    const pr = await createPullRequestFromRepair({
      token: session.accessToken,
      owner: body.owner,
      repo: body.repo,
      baseBranch: base,
      result: body.result,
    });

    return NextResponse.json({ pr });
  } catch (error) {
    return jsonError(error);
  }
}
