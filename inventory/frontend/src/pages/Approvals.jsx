import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  ClipboardCheck,
  Package,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Approvals() {
  const { role } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isAdmin = role?.toLowerCase() === "admin";

  const loadRequests = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/purchase-requests");
      const payload = response.data?.data ?? response.data;

      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.requests)
          ? payload.requests
          : Array.isArray(payload?.purchaseRequests)
            ? payload.purchaseRequests
            : [];

      setRequests(list);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load purchase requests."
      );
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadRequests();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const updateStatus = async (request, status) => {
    if (!request._id || updatingId) return;

    const productName =
      request.product?.name ||
      request.product?.productName ||
      request.productName ||
      "this product";

    const action = status === "Approved" ? "approve" : "reject";

    if (!window.confirm(`Are you sure you want to ${action} ${productName}?`)) {
      return;
    }

    setUpdatingId(request._id);
    setError("");
    setMessage("");

    try {
      const response = await api.patch(
        `/purchase-requests/${request._id}/status`,
        { status }
      );

      setMessage(
        response.data?.message ||
          `Purchase request ${status.toLowerCase()} successfully.`
      );

      await loadRequests();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Failed to ${action} the purchase request.`
      );
    } finally {
      setUpdatingId("");
    }
  };

  const isPending = (request) =>
    String(request.status || "Pending").toLowerCase() === "pending";

  const pendingRequests = requests.filter(isPending);
  const completedRequests = requests.filter(
    (request) => !isPending(request)
  );

  const getProductName = (request) => {
    const product = request.product;

    if (product && typeof product === "object") {
      return product.name || product.productName || "Product";
    }

    return request.productName || "Product";
  };

  const getSupplierName = (request) => {
    const supplier = request.supplier;

    if (supplier && typeof supplier === "object") {
      return supplier.name || supplier.companyName || "—";
    }

    return supplier || "—";
  };

  const getStatusStyle = (status) => {
    const value = String(status || "Pending").toLowerCase();

    if (value.includes("approved")) return "bg-green-100 text-green-700";
    if (value.includes("reject")) return "bg-red-100 text-red-700";
    if (value.includes("received")) return "bg-blue-100 text-blue-700";

    return "bg-yellow-100 text-yellow-700";
  };

  const RequestTable = ({ items, showActions }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#eaf3ff] text-slate-600">
          <tr>
            <th className="border-b border-[#d6ad45] px-5 py-3">Product</th>
            <th className="border-b border-[#d6ad45] px-5 py-3">Quantity</th>
            <th className="border-b border-[#d6ad45] px-5 py-3">Total Cost</th>
            <th className="border-b border-[#d6ad45] px-5 py-3">Supplier</th>
            <th className="border-b border-[#d6ad45] px-5 py-3">Status</th>
            {showActions && (
              <th className="border-b border-[#d6ad45] px-5 py-3">Actions</th>
            )}
          </tr>
        </thead>

        <tbody>
          {items.map((request, index) => (
            <tr
              key={request._id || request.id || index}
              className="border-b border-[#e5cf91] transition hover:bg-[#eaf3ff]"
            >
              <td className="px-5 py-4 font-medium text-slate-800">
                {getProductName(request)}
              </td>

              <td className="px-5 py-4">
                {request.quantity ?? request.requestedQuantity ?? "—"}
              </td>

              <td className="px-5 py-4">
                ₹{Number(request.totalAmount || 0).toLocaleString("en-IN")}
              </td>

              <td className="px-5 py-4">
                {getSupplierName(request)}
              </td>

              <td className="px-5 py-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                    request.status
                  )}`}
                >
                  {request.status || "Pending"}
                </span>
              </td>

              {showActions && (
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateStatus(request, "Approved")}
                      disabled={Boolean(updatingId)}
                      className="flex items-center gap-1 rounded-lg border border-[#d6ad45] bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {updatingId === request._id ? (
                        <RefreshCw className="animate-spin" size={15} />
                      ) : (
                        <CheckCircle size={15} />
                      )}
                      Approve
                    </button>

                    <button
                      onClick={() => updateStatus(request, "Rejected")}
                      disabled={Boolean(updatingId)}
                      className="flex items-center gap-1 rounded-lg border border-red-300 bg-red-600 px-3 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle size={15} />
                      Reject
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        You do not have permission to access Manager Approvals.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf3ff] p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-4 rounded-2xl border border-[#d6ad45] bg-[#071b42] p-6 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white md:text-3xl">
              <ClipboardCheck className="text-[#f5c451]" />
              Manager Approvals
            </h1>

            <p className="mt-2 text-sm text-blue-200">
              Review purchase requests and approve or reject them.
            </p>
          </div>

          <button
            onClick={loadRequests}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#d6ad45] bg-[#102c59] px-4 py-3 text-white transition hover:bg-[#193b70] disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5 shadow-sm">
            <ClipboardCheck className="mb-3 text-blue-600" size={24} />
            <p className="text-sm text-slate-500">Total Requests</p>
            <p className="mt-1 text-2xl font-bold">{requests.length}</p>
          </div>

          <div className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5 shadow-sm">
            <AlertCircle className="mb-3 text-yellow-600" size={24} />
            <p className="text-sm text-slate-500">Awaiting Approval</p>
            <p className="mt-1 text-2xl font-bold">
              {pendingRequests.length}
            </p>
          </div>

          <div className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5 shadow-sm">
            <Package className="mb-3 text-green-600" size={24} />
            <p className="text-sm text-slate-500">Processed Requests</p>
            <p className="mt-1 text-2xl font-bold">
              {completedRequests.length}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-[#d6ad45] bg-[#f8fbff] shadow-sm">
          <div className="border-b border-[#d6ad45] p-5">
            <h2 className="font-semibold text-slate-800">
              Pending Approval
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Approving or rejecting a request updates its backend status.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              <RefreshCw
                size={26}
                className="mx-auto mb-3 animate-spin text-blue-600"
              />
              Loading requests...
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="p-10 text-center">
              <ClipboardCheck
                size={38}
                className="mx-auto mb-3 text-slate-400"
              />
              <p className="font-medium text-slate-700">
                No pending requests
              </p>
              <p className="mt-1 text-sm text-slate-500">
                New requests with Pending status will appear here.
              </p>
            </div>
          ) : (
            <RequestTable items={pendingRequests} showActions />
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-[#d6ad45] bg-[#f8fbff] shadow-sm">
          <div className="border-b border-[#d6ad45] p-5">
            <h2 className="font-semibold text-slate-800">
              Request History
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Loading history...
            </div>
          ) : completedRequests.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              No processed requests yet.
            </p>
          ) : (
            <RequestTable items={completedRequests} showActions={false} />
          )}
        </section>
      </div>
    </div>
  );
}