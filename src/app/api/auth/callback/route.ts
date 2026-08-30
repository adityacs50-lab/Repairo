import { NextRequest, NextResponse } from "next/server";
import { getExplicitRedirectUri, getGitHubOAuthConfig } from "@/lib/auth/config";
import {
  SESSION_COOKIE,
  buildSessionValue,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { verifyOAuthState } from "@/lib/auth/oauth-state";
import { upsertGithubUser } from "@/lib/db/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Redirect back to /app using a RELATIVE Location header.
 *
 * Deliberately relative. This route runs on the Railway backend but is reached
 * through the Vercel proxy at the public origin, so an absolute URL built from
 * getAppUrl() lands on whatever APP_URL/RAILWAY_PUBLIC_DOMAIN happens to be —
 * and Railway always sets RAILWAY_PUBLIC_DOMAIN, so a missing or stale APP_URL
 * silently bounced every signed-in user onto the raw *.up.railway.app domain,
 * where the session cookie just set on the public origin does not exist. A
 * relative Location keeps the user on the exact origin they signed in from and
 * needs no environment configuration to be correct.
 */
function redirectToApp(query?: URLSearchParams) {
  const search = query?.toString();
  return new NextResponse(null, {
    status: 302,
    headers: { Location: search ? `/app?${search}` : "/app" },
  });
}

function fail(code: string, detail?: string) {
  const q = new URLSearchParams({ error: code });
  if (detail) q.set("detail", detail.slice(0, 120));
  return redirectToApp(q);
}

export async function GET(request: NextRequest) {
  const config = getGitHubOAuthConfig();
  if (!config) {
    return fail("oauth_not_configured");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const ghError = request.nextUrl.searchParams.get("error");
  const ghDesc = request.nextUrl.searchParams.get("error_description");

  if (ghError) {
    return fail("oauth_failed", ghDesc || ghError);
  }

  const storedState = request.cookies.get("repairo_oauth_state")?.value;
  const stateOk =
    verifyOAuthState(state, config.sessionSecret) ||
    (Boolean(state) && Boolean(storedState) && state === storedState);

  if (!code || !state || !stateOk) {
    return fail("invalid_oauth_state");
  }

  const redirectUri = getExplicitRedirectUri();

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
          // Must match the authorize request exactly; both read it from the same
          // helper, and both omit it by default so GitHub uses the OAuth App's
          // registered callback URL.
          ...(redirectUri ? { redirect_uri: redirectUri } : {}),
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
      return fail("oauth_failed", "Could not load GitHub profile");
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

    const response = redirectToApp();
    response.cookies.set(SESSION_COOKIE, sessionValue, {
      ...sessionCookieOptions(),
      secure: true,
    });
    // Expire it explicitly with the attributes it was set with, so the deletion
    // cookie matches the Path=/ state cookie no matter where it is sent from.
    response.cookies.set("repairo_oauth_state", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (err) {
    return fail(
      "oauth_failed",
      err instanceof Error ? err.message : "Unexpected sign-in error",
    );
  }
}
