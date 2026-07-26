import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import { listWritableRepos } from "@/lib/github/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    requireGithubConfig();
    const session = await requireSession();
    const repos = await listWritableRepos(session.accessToken);
    return NextResponse.json({
      repos: repos.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        name: r.name,
        owner: r.owner.login,
        defaultBranch: r.default_branch,
        private: r.private,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
