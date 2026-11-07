import { useEffect, useState } from "react";
import {
  getPurchaseOrders,
  updateOrderStatus,
  dispatchPurchaseOrder,
} from "../services/purchaseOrderService";
import { useAuth } from "../context/AuthContext";

export default function SupplierOrders() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  const isSupplier = user?.role?.toLowerCase() === "supplier";

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getPurchaseOrders();
      const data = response?.data ?? response;

      const orderList = Array.isArray(data)
        ? data
        : data?.orders || data?.purchaseOrders || [];

      setOrders(orderList);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to load orders."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSupplier) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [isSupplier]);

  const handleStatus = async (id, status) => {
    if (!isSupplier || updatingId) return;

    const confirmAction = window.confirm(
      `Are you sure you want to ${status} this order?`
    );

    if (!confirmAction) return;

    try {
      setUpdatingId(id);
      setError("");

      await updateOrderStatus(id, status);

      window.alert(`Order ${status} successfully!`);

      await fetchOrders();
    } catch (error) {
      window.alert(
        error.response?.data?.message ||
          error.message ||
          "Unable to update order status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDispatch = async (id) => {
    if (!isSupplier || updatingId) return;

    const confirmed = window.confirm(
      "Have you physically dispatched this order?"
    );

    if (!confirmed) return;

    try {
      setUpdatingId(id);
      setError("");

      await dispatchPurchaseOrder(id);

      window.alert("Order marked as Dispatched successfully!");

      await fetchOrders();
    } catch (error) {
      window.alert(
        error.response?.data?.message ||
          "Unable to dispatch order."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isSupplier) {
    return (
      <div className="page-container">
        <h2>Access Restricted</h2>
        <p>Only suppliers can manage purchase orders.</p>
      </div>
    );
  }

  if (loading) {
    return <p>Loading orders...</p>;
  }

  return (
    <div className="page-container">
      <h2>My Purchase Orders</h2>
      <p>View and manage orders assigned to you.</p>

      <button
        type="button"
        onClick={fetchOrders}
        disabled={loading}
      >
        Refresh Orders
      </button>

      {error && (
        <div>
          <p>{error}</p>
          <button type="button" onClick={fetchOrders}>
            Retry
          </button>
        </div>
      )}

      {orders.length === 0 ? (
        <p>No orders assigned yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const status = String(
                  order.status || "Pending"
                ).toLowerCase();

                const isUpdating = updatingId === order._id;

                return (
                  <tr key={order._id}>
                    <td>{order._id}</td>

                    <td>
                      {order.productName ||
                        order.product?.name ||
                        "Product"}
                    </td>

                    <td>
                      {order.quantity ??
                        order.requestedQuantity ??
                        0}
                    </td>

                    <td>{order.status || "Pending"}</td>

                    <td>
                      {status === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={updatingId !== null}
                            onClick={() =>
                              handleStatus(order._id, "Accepted")
                            }
                          >
                            {isUpdating ? "Updating..." : "Accept"}
                          </button>

                          <button
                            type="button"
                            disabled={updatingId !== null}
                            onClick={() =>
                              handleStatus(order._id, "Rejected")
                            }
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {status === "accepted" && (
                        <button
                          type="button"
                          disabled={updatingId !== null}
                          onClick={() =>
                            handleDispatch(order._id)
                          }
                        >
                          {isUpdating
                            ? "Updating..."
                            : "Mark as Dispatched"}
                        </button>
                      )}

                      {status === "dispatched" && (
                        <span>
                          Awaiting Admin Delivery Confirmation
                        </span>
                      )}

                      {["rejected", "received", "partially received", "cancelled"].includes(status) && (
                        <span>No action required</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}