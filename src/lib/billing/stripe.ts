import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { subscriptions, users, workspaces } from "@/lib/db/schema";
import { randomUUID } from "crypto";

export function stripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_PRO &&
      process.env.STRIPE_WEBHOOK_SECRET,
  );
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function ensureStripeCustomer(userId: string) {
  const db = getDb();
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new Error("User not found");
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    name: user.name || user.login,
    metadata: { userId: user.id, githubLogin: user.login },
  });

  db.update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .run();

  return customer.id;
}

export function setWorkspacePlan(
  workspaceId: string,
  plan: "free" | "pro",
  sub?: { subscriptionId?: string; status?: string; priceId?: string },
) {
  const db = getDb();
  const now = new Date();
  db.update(workspaces)
    .set({ plan, updatedAt: now })
    .where(eq(workspaces.id, workspaceId))
    .run();

  const existing = db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
    .get();

  if (existing) {
    db.update(subscriptions)
      .set({
        stripeSubscriptionId: sub?.subscriptionId ?? existing.stripeSubscriptionId,
        status: sub?.status ?? existing.status,
        priceId: sub?.priceId ?? existing.priceId,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, existing.id))
      .run();
  } else if (sub?.subscriptionId) {
    db.insert(subscriptions)
      .values({
        id: randomUUID(),
        workspaceId,
        stripeSubscriptionId: sub.subscriptionId,
        status: sub.status ?? "active",
        priceId: sub.priceId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}
