import { NextResponse } from "next/server";
import { getGitHubOAuthConfig, getAppUrl } from "@/lib/auth/config";
import { dbProbe } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public diagnostics for OAuth setup (no secrets). */
export async function GET() {
  const config = getGitHubOAuthConfig();
  const db = dbProbe();
  return NextResponse.json({
    appUrl: getAppUrl(),
    callbackUrl: config?.callbackUrl ?? null,
    clientIdPrefix: config ? `${config.clientId.slice(0, 8)}…` : null,
    sessionSecretOk: Boolean(config?.sessionSecret),
    githubConfigured: Boolean(config),
    db,
    expectedCallback:
      `${getAppUrl()}/api/auth/callback` || "https://heyrepairo.in/api/auth/callback",
    checklist: [
      "OAuth App callback URL must exactly match callbackUrl above",
      "GITHUB_CLIENT_SECRET on Railway must match the secret shown when you generated it",
      "After changing Railway vars, Redeploy the Railway service",
    ],
  });
}
