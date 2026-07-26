import { NextRequest, NextResponse } from "next/server";
import { getGitHubOAuthConfig } from "@/lib/auth/config";
import {
  SESSION_COOKIE,
  buildSessionValue,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { verifyOAuthState } from "@/lib/auth/oauth-state";
import { upsertGithubUser } from "@/lib/db/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fail(appUrl: string, code: string, detail?: string) {
  const q = new URLSearchParams({ error: code });
  if (detail) q.set("detail", detail.slice(0, 120));
  return NextResponse.redirect(`${appUrl}/app?${q.toString()}`);
}

export async function GET(request: NextRequest) {
  const config = getGitHubOAuthConfig();
  if (!config) {
    return fail(
      process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000",
      "oauth_not_configured",
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const ghError = request.nextUrl.searchParams.get("error");
  const ghDesc = request.nextUrl.searchParams.get("error_description");

  if (ghError) {
    return fail(config.appUrl, "oauth_failed", ghDesc || ghError);
  }

  const storedState = request.cookies.get("repairo_oauth_state")?.value;
  const stateOk =
    verifyOAuthState(state, config.sessionSecret) ||
    (Boolean(state) && Boolean(storedState) && state === storedState);

  if (!code || !state || !stateOk) {
    return fail(config.appUrl, "invalid_oauth_state");
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
      return fail(
        config.appUrl,
        "oauth_failed",
        tokenJson.error_description ||
          tokenJson.error ||
          "Token exchange failed — re-check Client Secret on Railway",
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
      return fail(config.appUrl, "oauth_failed", "Could not load GitHub profile");
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
    response.cookies.set(SESSION_COOKIE, sessionValue, {
      ...sessionCookieOptions(),
      secure: true,
    });
    response.cookies.delete("repairo_oauth_state");
    return response;
  } catch (err) {
    return fail(
      config.appUrl,
      "oauth_failed",
      err instanceof Error ? err.message : "Unexpected sign-in error",
    );
  }
}
