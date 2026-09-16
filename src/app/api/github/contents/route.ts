import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import { getFileContent } from "@/lib/github/client";
import { assertRateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    requireGithubConfig();
    assertRateLimit({
      key: `contents:${clientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
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

    if (body.paths.length > 20) {
      return NextResponse.json({ error: "At most 20 paths are allowed" }, { status: 400 });
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
