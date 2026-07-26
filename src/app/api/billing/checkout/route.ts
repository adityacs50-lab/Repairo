import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/api/errors";
import { getAppUrl } from "@/lib/auth/config";
import { getWorkspaceForUser } from "@/lib/db/users";
import {
  ensureStripeCustomer,
  getStripe,
  stripeConfigured,
} from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    if (!stripeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured. Set STRIPE_SECRET_KEY, STRIPE_PRICE_PRO, and STRIPE_WEBHOOK_SECRET.",
        },
        { status: 503 },
      );
    }

    const session = await requireSession();
    const workspace = getWorkspaceForUser(session.userId);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }

    const customerId = await ensureStripeCustomer(session.userId);
    const stripe = getStripe();
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_PRO!, quantity: 1 }],
      success_url: `${getAppUrl()}/app?billing=success`,
      cancel_url: `${getAppUrl()}/app?billing=cancel`,
      metadata: {
        workspaceId: workspace.id,
        userId: session.userId,
      },
      subscription_data: {
        metadata: {
          workspaceId: workspace.id,
        },
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    return jsonError(error);
  }
}
