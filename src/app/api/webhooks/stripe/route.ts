import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  getStripe,
  setWorkspacePlan,
  stripeConfigured,
} from "@/lib/billing/stripe";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      metadata?: { workspaceId?: string };
      subscription?: string | null;
      customer?: string | null;
    };
    const workspaceId = session.metadata?.workspaceId;
    if (workspaceId && session.subscription) {
      setWorkspacePlan(workspaceId, "pro", {
        subscriptionId: String(session.subscription),
        status: "active",
        priceId: process.env.STRIPE_PRICE_PRO,
      });
    }
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as {
      id: string;
      status: string;
      metadata?: { workspaceId?: string };
      customer?: string;
      items?: { data?: Array<{ price?: { id?: string } }> };
    };

    let workspaceId = sub.metadata?.workspaceId;
    if (!workspaceId && sub.customer) {
      const user = getDb()
        .select()
        .from(users)
        .where(eq(users.stripeCustomerId, String(sub.customer)))
        .get();
      if (user) {
        const { getWorkspaceForUser } = await import("@/lib/db/users");
        workspaceId = getWorkspaceForUser(user.id)?.id;
      }
    }

    if (workspaceId) {
      const active = ["active", "trialing"].includes(sub.status);
      setWorkspacePlan(workspaceId, active ? "pro" : "free", {
        subscriptionId: sub.id,
        status: sub.status,
        priceId: sub.items?.data?.[0]?.price?.id,
      });
    }
  }

  return NextResponse.json({ received: true });
}
