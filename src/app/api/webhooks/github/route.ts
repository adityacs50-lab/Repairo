import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { runIntegrationJob } from "@/lib/jobs/run-integration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function verifySignature(secret: string, body: string, signature: string | null) {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const received = signature.slice("sha256=".length);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const integrationId = request.nextUrl.searchParams.get("integrationId");
  if (!integrationId) {
    return NextResponse.json({ error: "integrationId required" }, { status: 400 });
  }

  const integration = getDb()
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .get();

  if (!integration) {
    return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifySignature(integration.webhookSecret, rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  if (event === "ping") {
    return NextResponse.json({ ok: true, message: "pong" });
  }

  if (event !== "push") {
    return NextResponse.json({ ok: true, ignored: event });
  }

  if (!integration.enabled) {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }

  let payload: {
    ref?: string;
    commits?: Array<{ added?: string[]; modified?: string[]; removed?: string[] }>;
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const branch = payload.ref?.replace("refs/heads/", "") ?? "";
  const watchedBranch = integration.afterRef || integration.baseBranch;
  // Run when push is to watched branch, or always if ref is a tag/sha config mismatch
  if (branch && watchedBranch && branch !== watchedBranch && !watchedBranch.match(/^[0-9a-f]{7,40}$/i)) {
    // still allow if any watched file changed on default-ish pushes to base
    if (branch !== integration.baseBranch) {
      return NextResponse.json({ ok: true, skipped: "branch" });
    }
  }

  const watched = new Set([
    integration.beforePath,
    integration.afterPath,
    ...integration.consumerPaths,
  ]);
  const changed = new Set<string>();
  for (const commit of payload.commits ?? []) {
    for (const p of [
      ...(commit.added ?? []),
      ...(commit.modified ?? []),
      ...(commit.removed ?? []),
    ]) {
      changed.add(p);
    }
  }

  const relevant =
    changed.size === 0 ||
    [...watched].some((path) =>
      [...changed].some((c) => c === path || c.endsWith(`/${path}`)),
    );

  if (!relevant) {
    return NextResponse.json({ ok: true, skipped: "paths" });
  }

  try {
    const outcome = await runIntegrationJob({
      integration,
      trigger: "webhook",
    });
    return NextResponse.json({
      ok: true,
      runId: outcome.runId,
      status: outcome.status,
      pr: outcome.pr,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
