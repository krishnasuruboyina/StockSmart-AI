import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  Package,
  AlertTriangle,
  IndianRupee,
  X,
  LoaderCircle,
  CheckCircle,
  Save,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const EMPTY_FORM = {
  name: "",
  sku: "",
  category: "",
  currentStock: "",
  unitPrice: "",
};

export default function Inventory() {
  const { role } = useAuth();
  const isAdmin = role?.toLowerCase() === "admin";

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState({});
  const [savingSupplier, setSavingSupplier] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/inventory");
      const data = res.data?.data ?? res.data;
      const productList = Array.isArray(data) ? data : [];

      setProducts(productList);

      const selections = {};
      productList.forEach((p) => {
        selections[p._id] =
          typeof p.supplier === "object"
            ? p.supplier?._id || ""
            : p.supplier || "";
      });

      setSelectedSuppliers(selections);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Products load cheyyalekapoyam. Backend server and login check cheyyi."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const res = await api.get("/suppliers");
      const data = res.data?.data ?? res.data?.suppliers ?? res.data;
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Suppliers load cheyyalekapoyam."
      );
    }
  }, [isAdmin]);

  useEffect(() => {
    loadProducts();
    loadSuppliers();
  }, [loadProducts, loadSuppliers]);

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!isAdmin) {
      setError("Only Admin can add inventory products.");
      return;
    }

    setError("");
    setSuccess("");

    const stock = Number(form.currentStock);
    const price = Number(form.unitPrice);

    if (!form.name.trim() || !form.sku.trim()) {
      setError("Product name and SKU required.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setError("Current Stock must be a non-negative whole number.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Unit Price must be a non-negative number.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/inventory", {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category.trim() || "General",
        currentStock: stock,
        unitPrice: price,
      });

      setForm(EMPTY_FORM);
      setShowForm(false);
      setSuccess("Product added successfully.");

      await loadProducts();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Product add cheyyadam fail ayyindi."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSupplierChange = (productId, supplierId) => {
    setSelectedSuppliers((prev) => ({
      ...prev,
      [productId]: supplierId,
    }));
  };

  const handleAssignSupplier = async (product) => {
    if (!isAdmin) return;

    const productId = product._id;
    const supplierId = selectedSuppliers[productId] || "";

    setError("");
    setSuccess("");
    setSavingSupplier(productId);

    try {
      const res = await api.put(`/inventory/${productId}`, {
        supplier: supplierId || null,
      });

      const updatedProduct = res.data?.data;

      if (updatedProduct) {
        setProducts((prev) =>
          prev.map((p) =>
            p._id === productId ? updatedProduct : p
          )
        );

        setSelectedSuppliers((prev) => ({
          ...prev,
          [productId]:
            typeof updatedProduct.supplier === "object"
              ? updatedProduct.supplier?._id || ""
              : updatedProduct.supplier || "",
        }));
      } else {
        await loadProducts();
      }

      const selectedSupplier = suppliers.find(
        (s) => s._id === supplierId
      );

      setSuccess(
        supplierId
          ? `${selectedSupplier?.name || "Supplier"} assigned to ${product.name} successfully.`
          : `Supplier removed from ${product.name}.`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Supplier assign cheyyadam fail ayyindi."
      );
    } finally {
      setSavingSupplier("");
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((p) =>
      `${p.name ?? ""} ${p.sku ?? ""} ${p.category ?? ""} ${p.supplierName ?? ""} ${typeof p.supplier === "object" ? p.supplier?.name ?? "" : ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [products, search]);

  const lowStockCount = products.filter((p) => {
    const stock = Number(p.currentStock ?? p.stock ?? 0);
    const reorderLevel = Number(p.reorderLevel ?? 10);

    return stock <= reorderLevel;
  }).length;

  const totalValue = products.reduce((sum, p) => {
    return (
      sum +
      Number(p.currentStock ?? p.stock ?? 0) *
        Number(p.unitPrice ?? p.price ?? 0)
    );
  }, 0);

  const formatMoney = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const stockStatus = (p) => {
    const stock = Number(p.currentStock ?? p.stock ?? 0);
    const reorderLevel = Number(p.reorderLevel ?? 10);

    if (stock === 0) {
      return {
        label: "Out of Stock",
        className: "bg-red-100 text-red-700",
      };
    }

    if (stock <= reorderLevel) {
      return {
        label: "Low Stock",
        className: "bg-amber-100 text-amber-700",
      };
    }

    return {
      label: "In Stock",
      className: "bg-emerald-100 text-emerald-700",
    };
  };

  return (
    <div className="min-h-screen bg-[#eaf3ff] p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Inventory Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d6ad45] bg-[#071b42] p-6 shadow-lg">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Inventory Management
            </h1>

            <p className="mt-2 text-sm text-blue-200">
              View and manage your company inventory.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                loadProducts();
                loadSuppliers();
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-[#d6ad45] bg-[#102c59] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#193b70] disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setShowForm((prev) => !prev);
                  setError("");
                  setSuccess("");
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-[#d6ad45] bg-[#e5b94c] px-4 py-3 text-sm font-bold text-[#142447] transition hover:bg-[#f0ca69]"
              >
                {showForm ? <X size={18} /> : <Plus size={18} />}
                {showForm ? "Cancel" : "Add Product"}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        {/* Add Product Form */}
        {isAdmin && showForm && (
          <form
            onSubmit={handleAdd}
            className="rounded-xl border border-[#d6ad45] bg-white p-5 shadow-sm sm:p-6"
          >
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Add New Product
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: "name", label: "Product Name", type: "text" },
                { key: "sku", label: "SKU", type: "text" },
                { key: "category", label: "Category", type: "text" },
                {
                  key: "currentStock",
                  label: "Current Stock",
                  type: "number",
                },
                {
                  key: "unitPrice",
                  label: "Unit Price (₹)",
                  type: "number",
                },
              ].map(({ key, label, type }) => (
                <label
                  key={key}
                  className="text-sm font-medium text-slate-700"
                >
                  {label}

                  <input
                    required={key !== "category"}
                    type={type}
                    min={type === "number" ? "0" : undefined}
                    step={key === "unitPrice" ? "0.01" : "1"}
                    value={form[key]}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#d6ad45] px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving && (
                <LoaderCircle size={18} className="animate-spin" />
              )}
              {saving ? "Saving..." : "Save Product"}
            </button>
          </form>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Products"
            value={products.length}
            icon={<Package size={21} />}
          />

          <StatCard
            title="Low / Reorder Stock"
            value={lowStockCount}
            icon={<AlertTriangle size={21} />}
          />

          <StatCard
            title="Estimated Inventory Value"
            value={formatMoney(totalValue)}
            icon={<IndianRupee size={21} />}
          />
        </div>

        {/* Search */}
        <div className="rounded-xl border border-[#d6ad45] bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              placeholder="Search product name, SKU, category or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#d6ad45] py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Showing {filtered.length} of {products.length} products
          </p>
        </div>

        {/* Product Inventory Table */}
        <div className="overflow-hidden rounded-xl border border-[#d6ad45] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d6ad45] p-5">
            <h2 className="font-semibold text-slate-800">
              Product Inventory
            </h2>

            <span className="text-sm text-slate-500">
              Live data from backend
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#eaf3ff] text-slate-600">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Unit Price</th>
                  <th className="p-4">Stock Status</th>
                  <th className="p-4">Supplier</th>
                  {isAdmin && <th className="p-4">Action</th>}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 8 : 7}
                      className="p-10 text-center text-slate-500"
                    >
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle
                          size={19}
                          className="animate-spin"
                        />
                        Loading inventory...
                      </span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 8 : 7}
                      className="p-10 text-center text-slate-500"
                    >
                      {search
                        ? "No products match your search."
                        : "No products found. Upload an Excel file or add a product."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const status = stockStatus(p);
                    const supplierName =
                      typeof p.supplier === "object"
                        ? p.supplier?.name
                        : p.supplierName;

                    return (
                      <tr
                        key={p._id ?? p.id ?? p.sku}
                        className="border-t border-[#d6ad45] hover:bg-blue-50"
                      >
                        <td className="p-4 font-medium text-slate-800">
                          {p.name || p.productName || "-"}
                        </td>

                        <td className="p-4">{p.sku || "-"}</td>

                        <td className="p-4">
                          {p.category || "General"}
                        </td>

                        <td className="p-4 font-semibold">
                          {p.currentStock ?? p.stock ?? 0}
                        </td>

                        <td className="p-4">
                          {formatMoney(p.unitPrice ?? p.price ?? 0)}
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        <td className="p-4">
                          {isAdmin ? (
                            <select
                              value={selectedSuppliers[p._id] ?? ""}
                              onChange={(e) =>
                                handleSupplierChange(
                                  p._id,
                                  e.target.value
                                )
                              }
                              className="min-w-40 rounded-lg border border-[#d6ad45] bg-white px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="">No Supplier</option>

                              {suppliers.map((s) => (
                                <option key={s._id} value={s._id}>
                                  {s.name} {s.supplierId ? `(${s.supplierId})` : ""}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span>
                              {supplierName || "Not Assigned"}
                            </span>
                          )}
                        </td>

                        {isAdmin && (
                          <td className="p-4">
                            <button
                              type="button"
                              onClick={() => handleAssignSupplier(p)}
                              disabled={savingSupplier === p._id}
                              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                            >
                              {savingSupplier === p._id ? (
                                <LoaderCircle
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Save size={15} />
                              )}

                              {savingSupplier === p._id
                                ? "Saving..."
                                : "Save"}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#d6ad45] bg-white p-5 shadow-sm">
      <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 break-words text-2xl font-bold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}