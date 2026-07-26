import { NextRequest, NextResponse } from "next/server";
import { getGitHubOAuthConfig } from "@/lib/auth/config";
import {
  SESSION_COOKIE,
  buildSessionValue,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { upsertGithubUser } from "@/lib/db/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const config = getGitHubOAuthConfig();
  if (!config) {
    return NextResponse.redirect(
      `${getFallbackAppUrl()}/app?error=oauth_not_configured`,
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("repairo_oauth_state")?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      `${config.appUrl}/app?error=invalid_oauth_state`,
    );
  }

  try {
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.callbackUrl,
        }),
      },
    );
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenJson.access_token) {
      throw new Error(
        tokenJson.error_description ||
          tokenJson.error ||
          "Token exchange failed",
      );
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokenJson.access_token}`,
        "User-Agent": "Repairo",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!userRes.ok) {
      throw new Error("Failed to load GitHub user");
    }
    const ghUser = (await userRes.json()) as {
      id: number;
      login: string;
      avatar_url: string;
      name: string | null;
    };

    const { user } = await upsertGithubUser({
      githubId: String(ghUser.id),
      login: ghUser.login,
      name: ghUser.name,
      avatarUrl: ghUser.avatar_url,
      accessToken: tokenJson.access_token,
    });

    const sessionValue = buildSessionValue({
      userId: user.id,
      login: user.login,
      avatarUrl: user.avatarUrl,
      name: user.name ?? undefined,
    });

    const response = NextResponse.redirect(`${config.appUrl}/app`);
    response.cookies.set(SESSION_COOKIE, sessionValue, sessionCookieOptions());
    response.cookies.delete("repairo_oauth_state");
    return response;
  } catch {
    return NextResponse.redirect(`${config.appUrl}/app?error=oauth_failed`);
  }
}

function getFallbackAppUrl() {
  return process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
