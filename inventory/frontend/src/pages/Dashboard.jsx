
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Truck,
  ShoppingCart,
  AlertTriangle,
  IndianRupee,
  RefreshCw,
  LogOut,
  Menu,
  X,
  ChartNoAxesCombined,
  ClipboardList,
  Upload,
  FileText,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

const currency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Inventory", path: "/inventory", icon: Package },
  { label: "Upload Data", path: "/upload-data", icon: Upload },
  { label: "Suppliers", path: "/suppliers", icon: Truck },
  { label: "Sales", path: "/sales", icon: ShoppingCart },
  {
    label: "Purchase Requests",
    path: "/purchase-requests",
    icon: ClipboardList,
  },
  {
    label: "Forecasts",
    path: "/forecast",
    icon: ChartNoAxesCombined,
  },
  {
    label: "Reports",
    path: "/reports",
    icon: FileText,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [salesChartData, setSalesChartData] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState("");

  const [inventoryChartData, setInventoryChartData] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState("");

  const [forecastProducts, setForecastProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");

  // Load dashboard summary
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/dashboard");

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to load dashboard"
        );
      }

      setSummary(response.data.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Load sales performance data
  const loadSalesChart = useCallback(async () => {
    setSalesLoading(true);
    setSalesError("");

    try {
      const response = await api.get("/sales");
      const payload = response.data;

      const sales = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.sales)
            ? payload.sales
            : null;

      if (!sales) {
        throw new Error(
          "Sales API response does not contain a sales records array."
        );
      }

      const now = new Date();
      const months = [];

      for (let i = 5; i >= 0; i -= 1) {
        const date = new Date(
          now.getFullYear(),
          now.getMonth() - i,
          1
        );

        months.push({
          key: `${date.getFullYear()}-${date.getMonth()}`,
          month: date.toLocaleString("en-IN", {
            month: "short",
            year: "2-digit",
          }),
          sales: 0,
        });
      }

      const monthMap = new Map(
        months.map((item) => [item.key, item])
      );

      sales.forEach((sale) => {
        const date = new Date(sale.saleDate);

        if (Number.isNaN(date.getTime())) return;

        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const month = monthMap.get(key);

        if (month) {
          month.sales +=
            Number(sale.quantity || 0) *
            Number(sale.unitPrice || 0);
        }
      });

      setSalesChartData(months);
    } catch (err) {
      setSalesError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load sales chart."
      );
    } finally {
      setSalesLoading(false);
    }
  }, []);

  // Load inventory and prepare products for forecasting
  const loadInventoryChart = useCallback(async () => {
    setInventoryLoading(true);
    setInventoryError("");

    try {
      const response = await api.get("/inventory");
      const payload = response.data;

      const products = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.products)
            ? payload.products
            : null;

      if (!products) {
        throw new Error(
          "Inventory API response does not contain a products array."
        );
      }

      const normalized = products.map((product) => ({
        ...product,
        _id: product._id || product.id,
        name: product.name || product.productName || "Unnamed product",
        currentStock: Number(
          product.currentStock ?? product.stock ?? 0
        ),
      }));

      setForecastProducts(normalized);

      setSelectedProductId((current) => {
        if (
          current &&
          normalized.some(
            (product) => String(product._id) === String(current)
          )
        ) {
          return current;
        }

        return normalized[0]?._id
          ? String(normalized[0]._id)
          : "";
      });

      const chartProducts = normalized
        .map((product) => ({
          name: product.name,
          stock: product.currentStock,
        }))
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 10);

      setInventoryChartData(chartProducts);
    } catch (err) {
      setInventoryError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load inventory."
      );
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadSalesChart();
    loadInventoryChart();
  }, [loadDashboard, loadSalesChart, loadInventoryChart]);

  // Generate forecast using the existing backend forecasting API.
  // This action does not automatically create a purchase request.
  const generateForecast = useCallback(async () => {
    if (!selectedProductId) {
      setForecastError("Please select a product first.");
      return;
    }

    setForecastLoading(true);
    setForecastError("");
    setForecast(null);

    try {
      const response = await api.post("/forecast", {
        productId: selectedProductId,
        createPurchaseRequest: false,
      });

      if (response.data?.success !== true) {
        throw new Error(
          response.data?.message ||
            "Forecast could not be generated."
        );
      }

      setForecast(response.data);
    } catch (err) {
      setForecastError(
        err.response?.data?.message ||
          err.message ||
          "Could not generate forecast."
      );
    } finally {
      setForecastLoading(false);
    }
  }, [selectedProductId]);

  // Logout
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  // Dashboard summary cards
  const stats = summary
    ? [
        {
          label: "Total Products",
          value: summary.totalProducts,
          icon: Package,
          color: "bg-blue-50 text-blue-600",
        },
        {
          label: "Total Suppliers",
          value: summary.totalSuppliers,
          icon: Truck,
          color: "bg-violet-50 text-violet-600",
        },
        {
          label: "Sales Records",
          value: summary.totalSalesRecords,
          icon: ShoppingCart,
          color: "bg-emerald-50 text-emerald-600",
        },
        {
          label: "Low Stock Products",
          value: summary.lowStockProducts,
          icon: AlertTriangle,
          color: "bg-amber-50 text-amber-600",
        },
      ]
    : [];

  const predictedDemand = Number(
    forecast?.forecastDemand ??
      forecast?.predictedNextPeriodDemand ??
      0
  );

  const forecastCurrentStock = Number(
    forecast?.currentStock ??
      forecast?.orderCalculation?.currentStock ??
      forecastProducts.find(
        (product) => String(product._id) === String(selectedProductId)
      )?.currentStock ??
      0
  );

  const suggestedQuantity = Number(
    forecast?.orderCalculation?.suggestedQuantity ?? 0
  );

  const stockOutRisk = forecastCurrentStock < predictedDemand;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 text-white transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2">
              <Package size={23} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">
                Inventory AI
              </h2>
              <p className="text-xs text-slate-400">
                Management System
              </p>
            </div>
          </div>

          <button
            type="button"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={21} />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/dashboard"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/10 p-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">

        {/* Dark navy header with gold border */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#d6ad45] bg-[#071b42] px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="text-sm font-semibold text-white">
                Inventory Overview
              </p>
              <p className="text-xs text-blue-200">
                Inventory AI / Dashboard
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              loadDashboard();
              loadSalesChart();
              loadInventoryChart();
            }}
            disabled={loading || salesLoading || inventoryLoading}
            className="flex items-center gap-2 rounded-xl border border-[#d6ad45] bg-[#102c59] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#193b70] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                loading || salesLoading || inventoryLoading
                  ? "animate-spin"
                  : ""
              }
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-7">

          {/* Dark navy Overview section */}
          <section className="rounded-2xl border border-[#d6ad45] bg-[#071b42] p-6 shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#f5c451]">
              Overview
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-blue-100 sm:text-base">
              Monitor your inventory, suppliers and sales performance.
            </p>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
              <button
                type="button"
                onClick={loadDashboard}
                className="ml-3 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {loading && !summary ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              Loading live dashboard data...
            </div>
          ) : summary ? (
            <>
              {/* Summary cards */}
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                {stats.map(({ label, value, icon: Icon, color }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          {label}
                        </p>
                        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                          {Number(value || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className={`rounded-xl p-3 ${color}`}>
                        <Icon size={22} />
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              {/* Sales summary cards */}
              <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                      <ShoppingCart size={22} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Total Units Sold
                      </h2>
                      <p className="text-sm text-slate-500">
                        Based on recorded sales
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 text-3xl font-bold text-slate-950">
                    {Number(
                      summary.totalUnitsSold || 0
                    ).toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                      <IndianRupee size={22} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Total Sales Amount
                      </h2>
                      <p className="text-sm text-slate-500">
                        Quantity multiplied by unit price
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 text-3xl font-bold text-slate-950">
                    {currency(summary.totalSalesAmount)}
                  </p>
                </div>
              </section>

              {/* Sales Performance chart */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Sales Performance
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Actual sales revenue for the last six months
                  </p>
                </div>

                {salesLoading ? (
                  <p className="py-10 text-center text-sm text-slate-500">
                    Loading sales data...
                  </p>
                ) : salesError ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {salesError}
                    <button
                      type="button"
                      onClick={loadSalesChart}
                      className="ml-2 font-semibold underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={salesChartData}
                        margin={{
                          top: 10,
                          right: 12,
                          left: 12,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis dataKey="month" />
                        <YAxis
                          tickFormatter={(value) =>
                            `₹${Number(value).toLocaleString("en-IN")}`
                          }
                          width={85}
                        />
                        <Tooltip
                          formatter={(value) => [
                            currency(value),
                            "Sales revenue",
                          ]}
                        />
                        <Bar
                          dataKey="sales"
                          name="Sales Revenue"
                          fill="#2563eb"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              {/* Inventory Stock Levels chart */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Inventory Stock Levels
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      The 10 products with the lowest current stock.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-red-700">
                      <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                      Low stock (0–5)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                      Reorder soon (6–10)
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                      In stock (above 10)
                    </span>
                  </div>
                </div>

                {inventoryLoading ? (
                  <p className="py-10 text-center text-sm text-slate-500">
                    Loading inventory stock levels...
                  </p>
                ) : inventoryError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {inventoryError}
                    <button
                      type="button"
                      onClick={loadInventoryChart}
                      className="ml-3 font-semibold underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : inventoryChartData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No inventory products available.
                  </p>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={inventoryChartData}
                        margin={{
                          top: 10,
                          right: 12,
                          left: 0,
                          bottom: 35,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          angle={-25}
                          textAnchor="end"
                          interval={0}
                          height={65}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip
                          formatter={(value) => [
                            `${value} units`,
                            "Current stock",
                          ]}
                          labelFormatter={(label) => `Product: ${label}`}
                        />
                        <Bar
                          dataKey="stock"
                          name="Current Stock"
                          radius={[6, 6, 0, 0]}
                        >
                          {inventoryChartData.map((item, index) => (
                            <Cell
                              key={`${item.name}-${index}`}
                              fill={
                                item.stock <= 5
                                  ? "#ef4444"
                                  : item.stock <= 10
                                    ? "#f59e0b"
                                    : "#10b981"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              {/* Demand Forecast */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Stock Trends & Demand Prediction
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Estimate upcoming demand using the existing forecasting
                    service and a selected product's sales history.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    value={selectedProductId}
                    onChange={(event) => {
                      setSelectedProductId(event.target.value);
                      setForecast(null);
                      setForecastError("");
                    }}
                    disabled={
                      inventoryLoading || forecastProducts.length === 0
                    }
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {forecastProducts.length === 0 ? (
                      <option value="">No products available</option>
                    ) : (
                      forecastProducts.map((product) => (
                        <option
                          key={product._id}
                          value={String(product._id)}
                        >
                          {product.name} — stock: {product.currentStock}
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={generateForecast}
                    disabled={forecastLoading || !selectedProductId}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {forecastLoading
                      ? "Generating forecast..."
                      : "Generate Forecast"}
                  </button>
                </div>

                {forecastError && (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
                  >
                    <p className="font-semibold">Forecast unavailable</p>
                    <p className="mt-1">{forecastError}</p>
                    {forecastError.toLowerCase().includes("5 weeks") && (
                      <p className="mt-1">
                        This product needs at least 5 weeks of sales history.
                        Record sufficient sales history and try again.
                      </p>
                    )}
                  </div>
                )}

                {forecast && (
                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-blue-50 p-4">
                        <p className="text-sm text-blue-700">
                          Predicted weekly demand
                        </p>
                        <p className="mt-2 text-2xl font-bold text-blue-950">
                          {predictedDemand.toLocaleString("en-IN")} units
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-100 p-4">
                        <p className="text-sm text-slate-600">
                          Current stock
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-950">
                          {forecastCurrentStock.toLocaleString("en-IN")} units
                        </p>
                      </div>

                      <div
                        className={`rounded-xl p-4 ${
                          stockOutRisk ? "bg-red-50" : "bg-emerald-50"
                        }`}
                      >
                        <p className="text-sm text-slate-700">
                          Stock-out risk (next week)
                        </p>
                        <p
                          className={`mt-2 text-lg font-bold ${
                            stockOutRisk
                              ? "text-red-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {stockOutRisk
                            ? "Potential risk"
                            : "Stock covers estimate"}
                        </p>
                      </div>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              category: "Current stock",
                              units: forecastCurrentStock,
                            },
                            {
                              category: "Predicted weekly demand",
                              units: predictedDemand,
                            },
                          ]}
                          margin={{
                            top: 10,
                            right: 15,
                            left: 0,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis dataKey="category" />
                          <YAxis allowDecimals={false} />
                          <Tooltip
                            formatter={(value) => [
                              `${value} units`,
                              "Quantity",
                            ]}
                          />
                          <Bar
                            dataKey="units"
                            name="Units"
                            radius={[6, 6, 0, 0]}
                          >
                            <Cell fill="#2563eb" />
                            <Cell fill="#8b5cf6" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          Suggested reorder quantity
                        </p>
                        <p className="text-xl font-bold text-slate-950">
                          {suggestedQuantity.toLocaleString("en-IN")} units
                        </p>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        Model: {forecast.selectedModel || "Not specified"}.
                        This is a recommendation only; no purchase request
                        was created.
                      </p>

                      {forecast.note && (
                        <p className="mt-2 text-xs text-slate-500">
                          {forecast.note}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Inventory Health and low-stock alerts */}
              <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">
                    Inventory Health
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Current stock summary from your inventory.
                  </p>

                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Package size={23} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        {Number(
                          summary.totalProducts || 0
                        ).toLocaleString("en-IN")}
                      </p>
                      <p className="text-sm text-slate-500">
                        Products tracked
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${
                        Number(summary.lowStockProducts || 0) > 0
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${
                          Number(summary.totalProducts || 0) > 0
                            ? Math.min(
                                100,
                                (Number(summary.lowStockProducts || 0) /
                                  Number(summary.totalProducts)) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {Number(summary.lowStockProducts || 0)} low-stock out of{" "}
                    {Number(summary.totalProducts || 0)} products
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                      <AlertTriangle size={22} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Low-stock alerts
                      </h2>
                      <p className="text-sm text-slate-500">
                        Products that may need replenishment
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-3xl font-bold text-slate-950">
                    {Number(summary.lowStockProducts || 0)}
                  </p>

                  {Number(summary.lowStockProducts || 0) > 0 ? (
                    <>
                      <p className="mt-1 text-sm text-amber-700">
                        Review your stock and plan replenishment.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/inventory")}
                        className="mt-4 rounded-lg bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        Review inventory
                      </button>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-emerald-700">
                      No low-stock products reported by the dashboard API.
                    </p>
                  )}
                </div>
              </section>
            </>
          ) : (
            !error && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                No dashboard data available.
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
}
