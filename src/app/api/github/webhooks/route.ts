import { NextRequest, NextResponse } from "next/server";
import { handleWebhookRequest } from "@/github-app/webhook-request";
import { getGitHubAppRuntime } from "@/lib/github-app/runtime";
import { probeGitHubAppStatus } from "@/lib/github-app/status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const status = probeGitHubAppStatus();
  return NextResponse.json({
    ok: status.configured,
    service: "repairo-github-app",
    webhookPath: status.webhookPath,
    installUrl: status.installUrl,
    missing: status.missing,
  });
}

export async function POST(request: NextRequest) {
  const status = probeGitHubAppStatus();
  if (!status.configured) {
    return NextResponse.json(
      { error: "GitHub App not configured", missing: status.missing },
      { status: 503 },
    );
  }

  const body = await request.text();
  const { app } = getGitHubAppRuntime();
  const result = await handleWebhookRequest(app, {
    delivery: request.headers.get("x-github-delivery") ?? "",
    eventName: request.headers.get("x-github-event"),
    signature: request.headers.get("x-hub-signature-256") ?? "",
    body,
  });

  return NextResponse.json(result.body, { status: result.status });
}
