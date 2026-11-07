import { useEffect, useState, useCallback } from "react";
import {
  PackageCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Truck,
} from "lucide-react";

import {
  getDeliveries,
  confirmDeliveryReceived,
} from "../services/deliveryService";

import { useAuth } from "../context/AuthContext";

export default function DeliveryConfirmation() {
  const { role } = useAuth();

  const [deliveries, setDeliveries] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isAdmin = role?.toLowerCase() === "admin";

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getDeliveries();
      const payload = response?.data ?? response;

      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.deliveries)
        ? payload.deliveries
        : [];

      setDeliveries(list);

      // Default quantity = remaining quantity
      setQuantities((previous) => {
        const next = { ...previous };

        list.forEach((delivery) => {
          const remaining =
            Number(delivery.orderedQuantity || 0) -
            Number(delivery.receivedQuantity || 0);

          if (next[delivery._id] === undefined) {
            next[delivery._id] = String(Math.max(0, remaining));
          }
        });

        return next;
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load deliveries."
      );
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchDeliveries();
    } else {
      setLoading(false);
    }
  }, [isAdmin, fetchDeliveries]);

  const handleConfirmation = async (delivery) => {
    if (!delivery?._id || updatingId) return;

    const receivedQuantity = Number(
      quantities[delivery._id]
    );

    const orderedQuantity = Number(
      delivery.orderedQuantity || 0
    );

    const alreadyReceived = Number(
      delivery.receivedQuantity || 0
    );

    const remaining = orderedQuantity - alreadyReceived;

    if (
      !Number.isInteger(receivedQuantity) ||
      receivedQuantity < 0
    ) {
      setError("Enter a valid non-negative whole quantity.");
      return;
    }

    if (receivedQuantity > remaining) {
      setError(
        `Maximum quantity you can confirm is ${remaining}.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you physically received ${receivedQuantity} units of ${getProductName(delivery)}?`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(delivery._id);
      setError("");
      setMessage("");

      const response = await confirmDeliveryReceived(
        delivery._id,
        {
          receivedQuantity,
        }
      );

      setMessage(
        response?.message ||
          "Delivery confirmation saved successfully."
      );

      await fetchDeliveries();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to confirm delivery."
      );
    } finally {
      setUpdatingId("");
    }
  };

  const getProductName = (delivery) => {
    if (
      delivery.product &&
      typeof delivery.product === "object"
    ) {
      return (
        delivery.product.name ||
        delivery.product.productName ||
        "Product"
      );
    }

    return delivery.productName || "Product";
  };

  const getSupplierName = (delivery) => {
    if (
      delivery.supplier &&
      typeof delivery.supplier === "object"
    ) {
      return (
        delivery.supplier.name ||
        delivery.supplier.companyName ||
        "Supplier"
      );
    }

    return delivery.supplierName || "Supplier";
  };

  const getStatusStyle = (status) => {
    const value = String(status || "").toLowerCase();

    if (value === "received") {
      return "bg-green-100 text-green-700";
    }

    if (
      value === "dispatched" ||
      value === "partially received"
    ) {
      return "bg-blue-100 text-blue-700";
    }

    if (value === "not received") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  const canConfirmDelivery = (status) => {
    const value = String(status || "").toLowerCase();

    return [
      "dispatched",
      "partially received",
      "not received",
    ].includes(value);
  };

  const awaitingCount = deliveries.filter((delivery) =>
    canConfirmDelivery(delivery.deliveryStatus)
  ).length;

  const receivedCount = deliveries.filter(
    (delivery) =>
      String(delivery.deliveryStatus || "").toLowerCase() ===
      "received"
  ).length;

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        You do not have permission to access Delivery Confirmation.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf3ff] p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 rounded-2xl border border-[#d6ad45] bg-[#071b42] p-6 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white md:text-3xl">
              <PackageCheck className="text-[#f5c451]" />
              Delivery Confirmation
            </h1>

            <p className="mt-2 text-sm text-blue-200">
              Verify supplier deliveries and confirm actual received stock.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchDeliveries}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#d6ad45] bg-[#102c59] px-4 py-3 font-medium text-white hover:bg-[#193b70] disabled:opacity-60"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {message && (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            <CheckCircle size={20} />
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Deliveries"
            value={deliveries.length}
            icon={<PackageCheck size={25} />}
          />

          <StatCard
            title="Awaiting Confirmation"
            value={awaitingCount}
            icon={<Truck size={25} />}
          />

          <StatCard
            title="Received Deliveries"
            value={receivedCount}
            icon={<CheckCircle size={25} />}
          />
        </div>

        {/* Deliveries Table */}
        <section className="overflow-hidden rounded-xl border border-[#d6ad45] bg-[#f8fbff] shadow-sm">
          <div className="border-b border-[#d6ad45] p-5">
            <h2 className="font-semibold text-slate-800">
              Supplier Deliveries
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Confirm only after physically checking the delivered products.
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw
                className="mx-auto mb-3 animate-spin text-blue-600"
                size={30}
              />
              Loading deliveries...
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-12 text-center">
              <PackageCheck
                className="mx-auto mb-3 text-slate-400"
                size={38}
              />
              <p className="font-medium text-slate-700">
                No deliveries available
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Supplier dispatches will appear here for confirmation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#eaf3ff] text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Supplier</th>
                    <th className="px-5 py-3">Ordered</th>
                    <th className="px-5 py-3">Received</th>
                    <th className="px-5 py-3">Remaining</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Received Now</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {deliveries.map((delivery) => {
                    const status = delivery.deliveryStatus || "Pending";

                    const ordered = Number(
                      delivery.orderedQuantity || 0
                    );

                    const received = Number(
                      delivery.receivedQuantity || 0
                    );

                    const remaining = Math.max(
                      0,
                      ordered - received
                    );

                    const isUpdating =
                      updatingId === delivery._id;

                    const canConfirm =
                      canConfirmDelivery(status) &&
                      remaining > 0;

                    return (
                      <tr
                        key={delivery._id}
                        className="border-b border-[#e5cf91] hover:bg-[#eaf3ff]"
                      >
                        <td className="px-5 py-4 font-medium">
                          {getProductName(delivery)}
                        </td>

                        <td className="px-5 py-4">
                          {getSupplierName(delivery)}
                        </td>

                        <td className="px-5 py-4">
                          {ordered}
                        </td>

                        <td className="px-5 py-4">
                          {received}
                        </td>

                        <td className="px-5 py-4">
                          {remaining}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(status)}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {canConfirm ? (
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              step="1"
                              value={quantities[delivery._id] ?? ""}
                              onChange={(e) =>
                                setQuantities((previous) => ({
                                  ...previous,
                                  [delivery._id]: e.target.value,
                                }))
                              }
                              className="w-24 rounded-lg border border-[#d6ad45] px-3 py-2 outline-none focus:border-blue-500"
                            />
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {canConfirm ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleConfirmation(delivery)
                              }
                              disabled={Boolean(updatingId)}
                              className="whitespace-nowrap rounded-lg bg-green-600 px-3 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {isUpdating
                                ? "Updating..."
                                : "Confirm Received"}
                            </button>
                          ) : status.toLowerCase() === "received" ? (
                            <span className="text-green-700">
                              Stock confirmed
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Awaiting dispatch
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5 shadow-sm">
      <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
        {icon}
      </div>

      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}