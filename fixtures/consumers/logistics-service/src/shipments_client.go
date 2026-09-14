package logistics

const ShippingBase = "https://api.acme-shipping.com/v1"

func SubmitShipment(request map[string]interface{}) map[string]interface{} {
	// request is a JSON-shaped map pinned to Shipping API v1
	return map[string]interface{}{
		"id":       "shp_1",
		"status":   "queued",
		"carrier":  request["carrier"],
		"weightKg": request["weightKg"],
	}
}

func IsShipmentQueued(record map[string]interface{}) bool {
	return record["status"] == "queued"
}

func IsShipmentDelivered(record map[string]interface{}) bool {
	return record["status"] == "delivered"
}
