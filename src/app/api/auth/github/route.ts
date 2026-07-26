import { NextResponse } from "next/server";
import { getGitHubOAuthConfig } from "@/lib/auth/config";
import { createOAuthState } from "@/lib/auth/oauth-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const config = getGitHubOAuthConfig();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and SESSION_SECRET (32+ chars).",
      },
      { status: 503 },
    );
  }

  const state = createOAuthState(config.sessionSecret);
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.callbackUrl);
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url.toString());
  // Best-effort cookie (may be lost through some proxies); state is self-verifying.
  response.cookies.set("repairo_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
