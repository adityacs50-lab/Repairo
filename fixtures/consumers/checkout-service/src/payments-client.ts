/**
 * Merchant checkout integration against Acme Payments API v1
 */
export type ChargeStatus = "pending" | "succeeded" | "failed";

export interface CreateChargeInput {
  amount: number;
  currency: "usd" | "eur" | "gbp";
  customerId: string;
  description?: string;
}

export interface Charge {
  id: string;
  amount: number;
  currency: string;
  status: ChargeStatus;
  customerId: string;
}

export interface CreateRefundInput {
  chargeId: string;
  amount: number;
}

const BASE_URL = "https://api.acme-payments.com/v1";

export async function createCharge(input: CreateChargeInput): Promise<Charge> {
  const response = await fetch(`${BASE_URL}/charges`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`createCharge failed: ${response.status}`);
  }

  return response.json() as Promise<Charge>;
}

export async function getCharge(chargeId: string): Promise<Charge> {
  const response = await fetch(`${BASE_URL}/charges/${chargeId}`);
  if (!response.ok) {
    throw new Error(`getCharge failed: ${response.status}`);
  }
  return response.json() as Promise<Charge>;
}

export async function createRefund(input: CreateRefundInput): Promise<{
  id: string;
  chargeId: string;
  amount: number;
  status: "pending" | "succeeded" | "failed";
}> {
  const response = await fetch(`${BASE_URL}/refunds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`createRefund failed: ${response.status}`);
  }

  return response.json();
}

export function isChargeSuccessful(charge: Charge): boolean {
  return charge.status === "succeeded";
}

export function isChargePending(charge: Charge): boolean {
  return charge.status === "pending";
}
