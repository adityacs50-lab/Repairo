import { NextResponse } from "next/server";
import { githubConfigured } from "@/lib/auth/config";
import { getSession, publicUser } from "@/lib/auth/session";
import { getWorkspaceForUser } from "@/lib/db/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!githubConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        user: null,
        workspace: null,
        error:
          "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and SESSION_SECRET.",
      },
      { status: 503 },
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({
      configured: true,
      user: null,
      workspace: null,
    });
  }

  const workspace = getWorkspaceForUser(session.userId);
  return NextResponse.json({
    configured: true,
    user: publicUser(session),
    workspace: workspace
      ? {
          id: workspace.id,
          name: workspace.name,
          plan: workspace.plan,
          ownerUserId: workspace.ownerUserId,
        }
      : null,
  });
}
