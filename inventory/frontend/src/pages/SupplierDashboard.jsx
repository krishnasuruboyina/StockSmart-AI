import { useEffect, useState } from "react";
import { getPurchaseOrders } from "../services/purchaseOrderService";
import { useAuth } from "../context/AuthContext";

export default function SupplierDashboard() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
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
      console.error("Unable to load supplier orders:", error);

      setError(
        error.response?.data?.message ||
        "Unable to load orders. Please try again."
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

  const getStatus = (order) =>
    String(order.status || "pending").toLowerCase();

  const pending = orders.filter(
    (order) => getStatus(order) === "pending"
  ).length;

  const accepted = orders.filter(
    (order) => getStatus(order) === "accepted"
  ).length;

  const dispatched = orders.filter((order) =>
    ["sent", "dispatched"].includes(getStatus(order))
  ).length;

  if (!isSupplier) {
    return (
      <div className="page-container">
        <h2>Access Restricted</h2>
        <p>Only suppliers can access this dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return <p>Loading supplier dashboard...</p>;
  }

  return (
    <div className="page-container">
      <h2>Supplier Dashboard</h2>
      <p>Welcome! Here is your order summary.</p>

      {error && (
        <div>
          <p>{error}</p>
          <button onClick={fetchOrders}>Retry</button>
        </div>
      )}

      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>Total Orders</h3>
          <h2>{orders.length}</h2>
        </div>

        <div className="dashboard-card">
          <h3>Pending Orders</h3>
          <h2>{pending}</h2>
        </div>

        <div className="dashboard-card">
          <h3>Accepted Orders</h3>
          <h2>{accepted}</h2>
        </div>

        <div className="dashboard-card">
          <h3>Dispatched Orders</h3>
          <h2>{dispatched}</h2>
        </div>
      </div>

      <h3>Recent Orders</h3>

      {orders.length === 0 ? (
        <p>No orders assigned to you yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {orders.slice(0, 5).map((order) => (
              <tr key={order._id}>
                <td>{order._id}</td>

                <td>
                  {order.productName ||
                    order.product?.name ||
                    "Product"}
                </td>

                <td>{order.quantity ?? order.requestedQuantity ?? 0}</td>

                <td>{order.status || "Pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}