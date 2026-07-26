import { NextRequest, NextResponse } from "next/server";
import { getGitHubOAuthConfig } from "@/lib/auth/config";
import { createOAuthState } from "@/lib/auth/oauth-state";
import { assertRateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    assertRateLimit({
      key: `oauth:${clientIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rate limited";
    return NextResponse.json({ error: message }, { status: 429 });
  }

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
  response.cookies.set("repairo_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
