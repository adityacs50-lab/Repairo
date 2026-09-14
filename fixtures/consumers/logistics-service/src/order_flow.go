package logistics

func PlaceOrder(order map[string]interface{}) map[string]interface{} {
	request := map[string]interface{}{
		"originZip": order["originZip"],
		"destZip":   order["destZip"],
		"weightKg":  order["weightKg"],
		"carrier":   "ups",
	}
	shipment := SubmitShipment(request)
	if IsShipmentQueued(shipment) {
		return shipment
	}
	if IsShipmentDelivered(shipment) {
		return shipment
	}
	return shipment
}
