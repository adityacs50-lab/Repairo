from shipments_client import submit_shipment, is_shipment_queued, is_shipment_delivered


def place_order(order):
    request = {
        "originZip": order["originZip"],
        "destZip": order["destZip"],
        "weightKg": order["weightKg"],
        "carrier": "ups",
    }
    shipment = submit_shipment(request)
    if is_shipment_queued(shipment):
        return shipment
    if is_shipment_delivered(shipment):
        return shipment
    return shipment
