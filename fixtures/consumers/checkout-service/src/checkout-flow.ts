import {
  createCharge,
  createRefund,
  getCharge,
  isChargePending,
  isChargeSuccessful,
  type CreateChargeInput,
} from "./payments-client";

export async function completeCheckout(order: {
  totalCents: number;
  customerId: string;
  currency: "usd" | "eur" | "gbp";
}) {
  const payload: CreateChargeInput = {
    amount: order.totalCents,
    currency: order.currency,
    customerId: order.customerId,
    description: "Checkout order",
  };

  const charge = await createCharge(payload);

  if (isChargePending(charge)) {
    const refreshed = await getCharge(charge.id);
    if (!isChargeSuccessful(refreshed)) {
      throw new Error(`Payment not successful: ${refreshed.status}`);
    }
    return refreshed;
  }

  if (!isChargeSuccessful(charge)) {
    throw new Error(`Payment failed: ${charge.status}`);
  }

  return charge;
}

export async function refundOrder(chargeId: string, amount: number) {
  return createRefund({ chargeId, amount });
}
