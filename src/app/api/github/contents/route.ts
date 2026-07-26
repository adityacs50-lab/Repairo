import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import { getFileContent } from "@/lib/github/client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    requireGithubConfig();
    const session = await requireSession();
    const body = (await request.json()) as {
      owner?: string;
      repo?: string;
      paths?: string[];
      ref?: string;
    };

    if (!body.owner || !body.repo || !Array.isArray(body.paths) || !body.paths.length) {
      return NextResponse.json(
        { error: "owner, repo, and paths[] are required" },
        { status: 400 },
      );
    }

    const files = [];
    for (const path of body.paths) {
      const file = await getFileContent(
        session.accessToken,
        body.owner,
        body.repo,
        path,
        body.ref,
      );
      files.push(file);
    }

    return NextResponse.json({ files });
  } catch (error) {
    return jsonError(error);
  }
}
