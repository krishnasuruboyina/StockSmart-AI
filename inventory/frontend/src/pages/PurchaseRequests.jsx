
import { useEffect, useState } from "react";
import {
  ShoppingCart,
  RefreshCw,
  AlertCircle,
  FileText,
  Package,
} from "lucide-react";
import api from "../services/api";

export default function PurchaseRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/purchase-requests");
      const result = response.data;

      const list = Array.isArray(result)
        ? result
        : result.data || result.requests || result.purchaseRequests || [];

      setRequests(list);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load purchase requests. Please check the backend API."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const getStatusStyle = (status) => {
    const value = String(status || "Pending").toLowerCase();

    if (value.includes("approved")) {
      return "bg-green-100 text-green-700";
    }

    if (value.includes("reject")) {
      return "bg-red-100 text-red-700";
    }

    if (value.includes("pending")) {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-slate-100 text-slate-700";
  };

  const getProductName = (request) => {
    const product = request.product;

    if (product && typeof product === "object") {
      return product.name || product.productName || "Product";
    }

    return request.productName || request.name || "Product";
  };

  const getQuantity = (request) =>
    request.quantity ??
    request.requestedQuantity ??
    request.suggestedQuantity ??
    "—";

  const getAmount = (request) => {
    const amount =
      request.totalAmount ??
      request.totalCost ??
      request.estimatedCost;

    return amount === undefined || amount === null
      ? "—"
      : `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  return (
    <div className="min-h-screen bg-[#eaf3ff] p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Dark navy header with gold border */}
        <div className="flex flex-col gap-4 rounded-2xl border border-[#d6ad45] bg-[#071b42] p-6 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white md:text-3xl">
              <ShoppingCart className="text-[#f5c451]" />
              Purchase Requests
            </h1>

            <p className="mt-2 text-sm text-blue-200">
              View purchase requests and track their approval status.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#d6ad45] bg-[#102c59] px-4 py-3 font-medium text-white transition hover:bg-[#193b70] disabled:opacity-60"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold">Could not load requests</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5 shadow-sm">
            <FileText className="mb-3 text-blue-600" size={24} />
            <p className="text-sm text-slate-500">Total Requests</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {requests.length}
            </p>
          </div>

          <div className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5 shadow-sm">
            <ShoppingCart className="mb-3 text-yellow-600" size={24} />
            <p className="text-sm text-slate-500">Pending</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {
                requests.filter((request) =>
                  String(request.status || "Pending")
                    .toLowerCase()
                    .includes("pending")
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5 shadow-sm">
            <Package className="mb-3 text-green-600" size={24} />
            <p className="text-sm text-slate-500">Approved</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {
                requests.filter((request) =>
                  String(request.status || "")
                    .toLowerCase()
                    .includes("approved")
                ).length
              }
            </p>
          </div>
        </div>

        {/* Purchase Requests Table */}
        <div className="overflow-hidden rounded-xl border border-[#d6ad45] bg-[#f8fbff] shadow-sm">
          <div className="border-b border-[#d6ad45] p-5">
            <h2 className="font-semibold text-slate-800">
              All Purchase Requests
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw
                className="mx-auto mb-3 animate-spin text-blue-600"
                size={28}
              />
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart
                className="mx-auto mb-3 text-slate-400"
                size={38}
              />
              <p className="font-medium text-slate-700">
                No purchase requests found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Requests will appear here once they are created in the backend.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#eaf3ff] text-slate-600">
                  <tr>
                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Product
                    </th>
                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Quantity
                    </th>
                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Estimated Cost
                    </th>
                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Status
                    </th>
                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((request, index) => (
                    <tr
                      key={request._id || index}
                      className="border-b border-[#e5cf91] transition hover:bg-[#eaf3ff]"
                    >
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {getProductName(request)}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {getQuantity(request)}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {getAmount(request)}
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

                      <td className="px-5 py-4 text-slate-500">
                        {request.createdAt
                          ? new Date(request.createdAt).toLocaleDateString(
                              "en-IN"
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
