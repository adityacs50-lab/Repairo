import {
  submitShipment,
  isShipmentQueued,
  isShipmentDelivered,
  type CreateShipmentRequest,
} from "./shipments-client";

export async function placeOrder(order: {
  originZip: string;
  destZip: string;
  weightKg: number;
}) {
  const request: CreateShipmentRequest = {
    originZip: order.originZip,
    destZip: order.destZip,
    weightKg: order.weightKg,
    carrier: "ups",
  };

  const shipment = await submitShipment(request);

  if (isShipmentQueued(shipment)) {
    return shipment;
  }

  if (isShipmentDelivered(shipment)) {
    return shipment;
  }

  return shipment;
}
