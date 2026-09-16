import { NextResponse } from "next/server";
import { getAppUrl, githubConfigured } from "@/lib/auth/config";
import { stripeConfigured } from "@/lib/billing/stripe";
import { dbProbe } from "@/lib/db";
import { probeGitHubAppStatus } from "@/lib/github-app/status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const githubApp = probeGitHubAppStatus();
  const database = await dbProbe();

  return NextResponse.json({
    ok: true,
    service: "repairo",
    time: new Date().toISOString(),
    appUrl: getAppUrl(),
    databaseOk: database.ok,
    githubOAuth: githubConfigured(),
    githubApp: githubApp.configured,
    githubAppInstallUrl: githubApp.installUrl,
    stripe: stripeConfigured(),
  });
}
