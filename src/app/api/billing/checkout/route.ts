import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/api/errors";
import { getAppUrl } from "@/lib/auth/config";
import { getWorkspaceForUser } from "@/lib/db/users";
import {
  ensureStripeCustomer,
  getStripe,
  stripeConfigured,
} from "@/lib/billing/stripe";
import { assertRateLimit, clientIp } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/db/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

    assertRateLimit({
      key: `checkout:${clientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });

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
      allow_promotion_codes: true,
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

    writeAudit({
      workspaceId: workspace.id,
      userId: session.userId,
      action: "billing.checkout_started",
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    return jsonError(error);
  }
}
