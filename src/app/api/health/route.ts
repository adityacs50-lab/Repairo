import { NextResponse } from "next/server";
import { githubConfigured } from "@/lib/auth/config";
import { stripeConfigured } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "repairo",
    time: new Date().toISOString(),
    githubOAuth: githubConfigured(),
    stripe: stripeConfigured(),
  });
}
