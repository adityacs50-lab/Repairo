SHIPPING_BASE = "https://api.acme-shipping.com/v1"


def submit_shipment(request):
    # request is a JSON dict pinned to Shipping API v1
    return {"id": "shp_1", "status": "queued", "carrier": request["carrier"], "weightKg": request["weightKg"]}


def is_shipment_queued(record):
    return record["status"] == "queued"


def is_shipment_delivered(record):
    return record["status"] == "delivered"
