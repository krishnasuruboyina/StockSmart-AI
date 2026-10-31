
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  Package,
  IndianRupee,
  RefreshCw,
  LoaderCircle,
  CheckCircle,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import api from "../services/api";

const today = new Date().toISOString().slice(0, 10);

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

export default function SalesEntry() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [saleDate, setSaleDate] = useState(today);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [remainingStock, setRemainingStock] = useState(null);

  const selectedProduct = products.find(
    (product) => String(product._id ?? product.id) === productId
  );

  const currentStock = Number(
    selectedProduct?.currentStock ?? selectedProduct?.stock ?? 0
  );

  const total = Number(quantity || 0) * Number(unitPrice || 0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [inventoryResponse, salesResponse] = await Promise.all([
        api.get("/inventory"),
        api.get("/sales"),
      ]);

      const inventoryPayload = inventoryResponse.data;
      const salesPayload = salesResponse.data;

      const inventory =
        Array.isArray(inventoryPayload?.data)
          ? inventoryPayload.data
          : Array.isArray(inventoryPayload?.products)
            ? inventoryPayload.products
            : Array.isArray(inventoryPayload)
              ? inventoryPayload
              : null;

      const salesList =
        Array.isArray(salesPayload?.data)
          ? salesPayload.data
          : Array.isArray(salesPayload?.sales)
            ? salesPayload.sales
            : Array.isArray(salesPayload)
              ? salesPayload
              : null;

      if (!inventory || !salesList) {
        throw new Error("Backend response format is unexpected.");
      }

      setProducts(inventory);
      setSales(salesList);

      setProductId((current) => {
        const stillExists = inventory.some(
          (product) => String(product._id ?? product.id) === current
        );

        if (stillExists) return current;

        const firstAvailable = inventory.find(
          (product) =>
            Number(product.currentStock ?? product.stock ?? 0) > 0
        );

        return firstAvailable
          ? String(firstAvailable._id ?? firstAvailable.id)
          : "";
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not load inventory and sales."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedProduct) {
      setUnitPrice(
        String(selectedProduct.unitPrice ?? selectedProduct.price ?? 0)
      );
    } else {
      setUnitPrice("");
    }
  }, [productId, selectedProduct?._id, selectedProduct?.unitPrice]);

  const totalUnitsSold = useMemo(
    () =>
      sales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0),
    [sales]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setRemainingStock(null);

    const qty = Number(quantity);
    const price = Number(unitPrice);

    if (!productId) {
      setError("Please select a product.");
      return;
    }

    if (!Number.isInteger(qty) || qty < 1) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (qty > currentStock) {
      setError(`Insufficient stock. Available stock: ${currentStock}.`);
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid, non-negative unit price.");
      return;
    }

    if (!saleDate || Number.isNaN(Date.parse(saleDate))) {
      setError("Please select a valid sale date.");
      return;
    }

    setSaving(true);

    try {
      const response = await api.post("/sales", {
        product: productId,
        quantity: qty,
        unitPrice: price,
        saleDate: new Date(`${saleDate}T12:00:00`).toISOString(),
      });

      if (response.data?.success !== true) {
        throw new Error(
          response.data?.message || "Sale could not be recorded."
        );
      }

      setMessage(response.data.message || "Sale recorded successfully.");
      setRemainingStock(response.data.remainingStock ?? null);
      setQuantity("1");

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to record sale."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#eaf3ff] p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Dark navy header with gold border */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d6ad45] bg-[#071b42] p-6 shadow-lg">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Sales Entry
            </h1>

            <p className="mt-2 text-sm text-blue-200">
              Record product sales and track inventory stock.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-lg border border-[#d6ad45] bg-[#102c59] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#193b70] disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertTriangle size={19} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Success message */}
        {message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle size={19} />
              {message}
            </div>

            {remainingStock !== null && (
              <p className="mt-2">
                Remaining stock: <strong>{remainingStock} units</strong>
              </p>
            )}
          </div>
        )}

        {/* Summary cards */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5 shadow-sm">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Package size={23} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Available Products</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {products.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5 shadow-sm">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <ShoppingCart size={23} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Total Units Sold</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {totalUnitsSold.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </section>

        {/* Record a sale form */}
        <section className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5 shadow-sm sm:p-7">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Record a Sale
          </h2>

          {loading ? (
            <p className="flex items-center gap-2 py-8 text-slate-500">
              <LoaderCircle size={19} className="animate-spin" />
              Loading products...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="sale-product"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Select Product
                </label>

                <select
                  id="sale-product"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  required
                  className="w-full rounded-lg border border-[#d6ad45] bg-white px-3 py-3 outline-none focus:border-blue-500"
                >
                  <option value="">Choose a product</option>

                  {products.map((product) => {
                    const id = String(product._id ?? product.id);
                    const stock = Number(
                      product.currentStock ?? product.stock ?? 0
                    );

                    return (
                      <option key={id} value={id}>
                        {product.name} ({product.sku || "No SKU"}) — Stock: {stock}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedProduct && (
                <div className="grid gap-3 rounded-lg border border-[#d6ad45] bg-[#eaf3ff] p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Current Stock</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {currentStock} units
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">SKU</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedProduct.sku || "—"}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="sale-quantity"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Sale Quantity
                  </label>

                  <input
                    id="sale-quantity"
                    type="number"
                    min="1"
                    max={currentStock}
                    step="1"
                    required
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="w-full rounded-lg border border-[#d6ad45] bg-white px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sale-price"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Unit Price (₹)
                  </label>

                  <input
                    id="sale-price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={unitPrice}
                    onChange={(event) => setUnitPrice(event.target.value)}
                    className="w-full rounded-lg border border-[#d6ad45] bg-white px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sale-date"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"
                  >
                    <CalendarDays size={16} />
                    Sale Date
                  </label>

                  <input
                    id="sale-date"
                    type="date"
                    max={today}
                    required
                    value={saleDate}
                    onChange={(event) => setSaleDate(event.target.value)}
                    className="w-full rounded-lg border border-[#d6ad45] bg-white px-3 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#d6ad45] bg-[#eaf3ff] p-4">
                <div>
                  <p className="text-sm text-blue-700">
                    Total Sale Amount
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-950">
                    {money(total)}
                  </p>
                </div>

                <IndianRupee className="text-blue-600" size={28} />
              </div>

              <button
                type="submit"
                disabled={
                  saving ||
                  !productId ||
                  products.length === 0 ||
                  currentStock < 1
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d6ad45] bg-[#e5b94c] px-5 py-3 font-semibold text-[#142447] transition hover:bg-[#f0ca69] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle size={19} className="animate-spin" />
                ) : (
                  <ShoppingCart size={19} />
                )}
                {saving ? "Recording Sale..." : "Record Sale"}
              </button>
            </form>
          )}
        </section>

        {/* Recent sales */}
        <section className="overflow-hidden rounded-xl border border-[#d6ad45] bg-[#f8fbff] shadow-sm">
          <div className="border-b border-[#d6ad45] p-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Sales
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sales history retrieved from the backend.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#eaf3ff] text-slate-600">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Quantity</th>
                  <th className="p-4">Unit Price</th>
                  <th className="p-4">Total</th>
                </tr>
              </thead>

              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      {loading ? "Loading sales..." : "No sales recorded yet."}
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr
                      key={sale._id}
                      className="border-t border-[#d6ad45] hover:bg-[#eaf3ff]"
                    >
                      <td className="whitespace-nowrap p-4">
                        {sale.saleDate
                          ? new Date(sale.saleDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>

                      <td className="p-4 font-medium text-slate-800">
                        {typeof sale.product === "object"
                          ? sale.product?.name || "Product"
                          : "Product"}
                        {typeof sale.product === "object" && sale.product?.sku
                          ? ` (${sale.product.sku})`
                          : ""}
                      </td>

                      <td className="p-4">{sale.quantity}</td>

                      <td className="whitespace-nowrap p-4">
                        {money(sale.unitPrice)}
                      </td>

                      <td className="whitespace-nowrap p-4 font-semibold">
                        {money(
                          Number(sale.quantity) * Number(sale.unitPrice)
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
