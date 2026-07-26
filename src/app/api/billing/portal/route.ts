import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/api/errors";
import { getAppUrl } from "@/lib/auth/config";
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
        { error: "Stripe is not configured" },
        { status: 503 },
      );
    }

    const session = await requireSession();
    const customerId = await ensureStripeCustomer(session.userId);
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppUrl()}/app`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    return jsonError(error);
  }
}
