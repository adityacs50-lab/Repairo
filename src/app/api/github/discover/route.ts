import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import { getRecursiveTreePaths } from "@/lib/github/client";
import { discoverFromPaths } from "@/lib/discover/repo";
import { assertRateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    requireGithubConfig();
    assertRateLimit({
      key: `discover:${clientIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });
    const session = await requireSession();
    const body = (await request.json()) as {
      owner?: string;
      repo?: string;
      ref?: string;
    };
    if (!body.owner || !body.repo) {
      return NextResponse.json(
        { error: "owner and repo are required" },
        { status: 400 },
      );
    }

    const paths = await getRecursiveTreePaths(
      session.accessToken,
      body.owner,
      body.repo,
      body.ref,
    );
    const discovered = discoverFromPaths(paths);

    return NextResponse.json({
      owner: body.owner,
      repo: body.repo,
      ref: body.ref ?? null,
      pathCount: paths.length,
      specs: discovered.specs,
      consumers: discovered.consumers,
      suggested: {
        openapiPath: discovered.specs[0]?.path ?? null,
        consumerPaths: discovered.consumers
          .filter(
            (c) =>
              c.kind === "consumer-ts" ||
              c.kind === "consumer-js" ||
              c.kind === "consumer-py",
          )
          .slice(0, 8)
          .map((c) => c.path),
        pythonConsumers: discovered.consumers
          .filter((c) => c.kind === "consumer-py")
          .slice(0, 8)
          .map((c) => c.path),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
