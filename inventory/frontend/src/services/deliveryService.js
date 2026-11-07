import api from "./api";

// Get all deliveries
export async function getDeliveries() {
  const response = await api.get("/deliveries");
  return response.data;
}

// Supplier marks product as sent
export async function markDeliverySent(deliveryId, data = {}) {
  const response = await api.patch(
    `/deliveries/${deliveryId}/sent`,
    data
  );
  return response.data;
}

// Admin confirms product received
export async function confirmDeliveryReceived(deliveryId, data = {}) {
  const response = await api.patch(
    `/deliveries/${deliveryId}/received`,
    data
  );
  return response.data;
}