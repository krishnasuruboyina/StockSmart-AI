import api from "./api";

// Get all purchase orders
export async function getPurchaseOrders() {
  const response = await api.get("/purchase-orders");
  return response.data;
}

// Supplier Accept / Reject
export async function updateOrderStatus(id, status) {
  const normalizedStatus =
    String(status).toLowerCase() === "accepted"
      ? "Accepted"
      : String(status).toLowerCase() === "rejected"
      ? "Rejected"
      : null;

  if (!normalizedStatus) {
    throw new Error("Status must be Accepted or Rejected.");
  }

  const response = await api.patch(
    `/purchase-orders/${id}/status`,
    { status: normalizedStatus }
  );

  return response.data;
}

// Supplier Dispatch - Creates Delivery record
export async function dispatchPurchaseOrder(id) {
  const response = await api.patch(
    `/deliveries/${id}/sent`
  );

  return response.data;
}