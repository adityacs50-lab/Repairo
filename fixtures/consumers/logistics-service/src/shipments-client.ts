/**
 * Warehouse integration against Acme Shipping API v1
 */
export type ShipmentStatus = "queued" | "in_transit" | "delivered";

export interface CreateShipmentRequest {
  originZip: string;
  destZip: string;
  weightKg: number;
  carrier: "ups" | "fedex" | "dhl";
}

export interface ShipmentRecord {
  id: string;
  status: ShipmentStatus;
  carrier: string;
  weightKg: number;
}

const SHIPPING_BASE = "https://api.acme-shipping.com/v1";

export async function submitShipment(request: CreateShipmentRequest): Promise<ShipmentRecord> {
  const response = await fetch(`${SHIPPING_BASE}/shipments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`submitShipment failed: ${response.status}`);
  }

  return response.json() as Promise<ShipmentRecord>;
}

export function isShipmentQueued(record: ShipmentRecord): boolean {
  return record.status === "queued";
}

export function isShipmentDelivered(record: ShipmentRecord): boolean {
  return record.status === "delivered";
}
