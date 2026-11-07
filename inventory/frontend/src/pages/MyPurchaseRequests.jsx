import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function MyPurchaseRequests() {
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    reason: "",
  });

  const isEmployee = user?.role?.toLowerCase() === "employee";

  // Fetch employee purchase requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/purchase-requests");
      const data = response.data?.data ?? response.data;

      const requestList = Array.isArray(data)
        ? data
        : data?.requests || data?.purchaseRequests || [];

      setRequests(requestList);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to load purchase requests."
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch company products for dropdown
  const fetchProducts = async () => {
    try {
      setProductsLoading(true);

      const response = await api.get("/inventory");
      const data = response.data?.data ?? response.data;

      const productList = Array.isArray(data)
        ? data
        : data?.products || data?.inventory || [];

      setProducts(
        productList.filter(
          (product) => product.isActive !== false
        )
      );
    } catch (error) {
      console.error("Fetch products error:", error);
      setError(
        error.response?.data?.message ||
          "Unable to load products."
      );
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    if (isEmployee) {
      fetchRequests();
      fetchProducts();
    } else {
      setLoading(false);
      setProductsLoading(false);
    }
  }, [isEmployee]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEmployee || submitting) return;

    const quantity = Number(form.quantity);

    if (!form.productId) {
      alert("Please select a product.");
      return;
    }

    if (!products.some((p) => p._id === form.productId)) {
      alert("Please select a valid product.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    if (!form.reason.trim()) {
      alert("Please enter the reason for purchase.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await api.post("/purchase-requests", {
        productId: form.productId,
        quantity,
        reason: form.reason.trim(),
      });

      alert("Purchase request submitted successfully!");

      setForm({
        productId: "",
        quantity: "",
        reason: "",
      });

      await fetchRequests();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Unable to submit purchase request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getProductName = (request) => {
    if (request.product && typeof request.product === "object") {
      return request.product.name || "Product";
    }

    return request.productName || "Product";
  };

  if (!isEmployee) {
    return (
      <div className="page-container">
        <h2>Access Restricted</h2>
        <p>
          Only employees can create and view their purchase requests.
        </p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2>My Purchase Requests</h2>
      <p>Create and track your purchase requests.</p>

      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleSubmit}>
        <select
          name="productId"
          value={form.productId}
          onChange={handleChange}
          required
          disabled={productsLoading || products.length === 0}
        >
          <option value="">
            {productsLoading
              ? "Loading products..."
              : products.length === 0
                ? "No products available"
                : "Select Product"}
          </option>

          {products.map((product) => (
            <option key={product._id} value={product._id}>
              {product.name} ({product.sku || "No SKU"})
            </option>
          ))}
        </select>

        <input
          type="number"
          name="quantity"
          placeholder="Required Quantity"
          min="1"
          step="1"
          value={form.quantity}
          onChange={handleChange}
          required
        />

        <textarea
          name="reason"
          placeholder="Reason for purchase"
          value={form.reason}
          onChange={handleChange}
          required
        />

        <button
          type="submit"
          disabled={
            submitting ||
            productsLoading ||
            products.length === 0
          }
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </form>

      <h3>My Requests</h3>

      {loading ? (
        <p>Loading requests...</p>
      ) : requests.length === 0 ? (
        <p>No purchase requests found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((request) => (
              <tr key={request._id}>
                <td>{getProductName(request)}</td>
                <td>{request.quantity}</td>
                <td>{request.reason || "-"}</td>
                <td>{request.status || "Pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}