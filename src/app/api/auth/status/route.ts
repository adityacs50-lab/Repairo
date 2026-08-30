import { NextRequest, NextResponse } from "next/server";
import {
  getAppUrl,
  getExplicitRedirectUri,
  getGitHubOAuthConfig,
} from "@/lib/auth/config";
import { dbProbe } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public diagnostics for OAuth setup (no secrets). */
export async function GET(request: NextRequest) {
  const config = getGitHubOAuthConfig();
  const db = dbProbe();

  // Set by src/proxy.ts when the request arrives via the Vercel -> Railway
  // proxy. This is the origin the user actually browsed, which is what the
  // GitHub OAuth App's callback URL has to be registered against.
  const forwardedHost = request.headers.get("x-forwarded-host") || null;
  const publicOrigin = forwardedHost ? `https://${forwardedHost}` : getAppUrl();
  const redirectUri = getExplicitRedirectUri();

  return NextResponse.json({
    appUrl: getAppUrl(),
    forwardedHost,
    publicOrigin,
    reachedViaProxy: Boolean(forwardedHost),
    clientIdPrefix: config ? `${config.clientId.slice(0, 8)}…` : null,
    sessionSecretOk: Boolean(config?.sessionSecret),
    githubConfigured: Boolean(config),
    db,
    // What the OAuth App must have registered. Derived from the origin the
    // request actually came in on, not from APP_URL, so a wrong APP_URL cannot
    // make this field agree with itself and hide the misconfiguration.
    registerThisCallbackUrl: `${publicOrigin}/api/auth/callback`,
    // undefined => we send no redirect_uri and defer to the registration above.
    explicitRedirectUriSent: redirectUri ?? null,
    appUrlMatchesPublicOrigin: getAppUrl() === publicOrigin,
    checklist: [
      "Register registerThisCallbackUrl above as the OAuth App's Authorization callback URL (exact match)",
      "If appUrlMatchesPublicOrigin is false, set APP_URL on Railway to publicOrigin (needed for webhook + Stripe URLs)",
      "GITHUB_CLIENT_SECRET on Railway must match the secret shown when you generated it",
      "After changing Railway vars, Redeploy the Railway service",
    ],
  });
}
