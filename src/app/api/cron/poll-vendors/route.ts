import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { pollVendorAgents } from "@/lib/jobs/poll-vendors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function secretsEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

/**
 * Secure cron endpoint for vendor OpenAPI polling.
 * Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secretsEqual(bearer, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") || "20");
  const minAgeMs = Number(
    request.nextUrl.searchParams.get("minAgeMs") || String(60 * 60 * 1000),
  );

  const result = await pollVendorAgents({
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20,
    minAgeMs: Number.isFinite(minAgeMs) ? minAgeMs : 60 * 60 * 1000,
  });

  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
