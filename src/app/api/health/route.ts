import { NextResponse } from "next/server";
import { getAppUrl, githubConfigured } from "@/lib/auth/config";
import { stripeConfigured } from "@/lib/billing/stripe";
import { probeGitHubAppStatus } from "@/lib/github-app/status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const githubApp = probeGitHubAppStatus();

  return NextResponse.json({
    ok: true,
    service: "repairo",
    time: new Date().toISOString(),
    appUrl: getAppUrl(),
    githubOAuth: githubConfigured(),
    githubApp: githubApp.configured,
    githubAppInstallUrl: githubApp.installUrl,
    githubAppMissing: githubApp.missing,
    stripe: stripeConfigured(),
  });
}
