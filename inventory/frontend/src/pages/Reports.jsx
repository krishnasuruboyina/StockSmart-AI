
import { useEffect, useState } from "react";
import {
  FileText,
  Package,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  IndianRupee,
  Download,
} from "lucide-react";
import api from "../services/api";
import DashboardLayout from "../layouts/DashboardLayout";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = async () => {
    setLoading(true);
    setError("");

    try {
      const [inventoryResponse, salesResponse] = await Promise.all([
        api.get("/inventory"),
        api.get("/sales"),
      ]);

      const inventoryResult = inventoryResponse.data;
      const salesResult = salesResponse.data;

      const inventoryList = Array.isArray(inventoryResult)
        ? inventoryResult
        : inventoryResult.data || inventoryResult.products || [];

      const salesList = Array.isArray(salesResult)
        ? salesResult
        : salesResult.data || salesResult.sales || [];

      setInventory(inventoryList);
      setSales(salesList);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load reports. Please check the backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const totalProducts = inventory.length;

  const totalStockUnits = inventory.reduce(
    (sum, product) =>
      sum + Number(product.currentStock ?? product.stock ?? 0),
    0
  );

  const lowStockProducts = inventory.filter((product) => {
    const stock = Number(product.currentStock ?? product.stock ?? 0);
    const reorderLevel = Number(product.reorderLevel ?? 10);
    return stock <= reorderLevel;
  });

  const totalSales = sales.reduce(
    (sum, sale) =>
      sum +
      Number(
        sale.totalAmount ??
          sale.totalPrice ??
          Number(sale.quantity || 0) * Number(sale.unitPrice || 0)
      ),
    0
  );

  const totalUnitsSold = sales.reduce(
    (sum, sale) => sum + Number(sale.quantity || 0),
    0
  );

  const formatCurrency = (value) =>
    `₹${Number(value).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const getProductName = (sale) => {
    if (sale.product && typeof sale.product === "object") {
      return sale.product.name || sale.product.productName || "Product";
    }

    return sale.productName || sale.name || "Product";
  };

  const getSaleDate = (sale) => {
    const date = sale.saleDate || sale.createdAt;
    return date ? new Date(date).toLocaleDateString("en-IN") : "—";
  };

  // Download Excel report
  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ["Inventory Report"],
      ["Generated Date", new Date().toLocaleDateString("en-IN")],
      ["Total Products", totalProducts],
      ["Units in Stock", totalStockUnits],
      ["Units Sold", totalUnitsSold],
      ["Total Sales Value", totalSales],
      ["Low Stock Products", lowStockProducts.length],
    ];

    const inventoryData = inventory.map((product) => ({
      Product: product.name || product.productName || "Product",
      SKU: product.sku || "",
      "Current Stock": Number(
        product.currentStock ?? product.stock ?? 0
      ),
      "Reorder Level": Number(product.reorderLevel ?? 10),
    }));

    const salesData = sales.map((sale) => ({
      Product: getProductName(sale),
      Quantity: Number(sale.quantity || 0),
      "Unit Price": Number(sale.unitPrice || 0),
      "Total Amount": Number(
        sale.totalAmount ??
          sale.totalPrice ??
          Number(sale.quantity || 0) * Number(sale.unitPrice || 0)
      ),
      Date: getSaleDate(sale),
    }));

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(summaryData),
      "Summary"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(inventoryData),
      "Inventory"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(salesData),
      "Sales"
    );

    XLSX.writeFile(workbook, "Inventory_Report.xlsx");
  };

  // Download PDF report
  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Inventory AI - Reports", 14, 18);

    doc.setFontSize(10);
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-IN")}`,
      14,
      26
    );

    autoTable(doc, {
      startY: 34,
      head: [["Metric", "Value"]],
      body: [
        ["Total Products", String(totalProducts)],
        ["Units in Stock", String(totalStockUnits)],
        ["Units Sold", String(totalUnitsSold)],
        ["Total Sales Value", formatCurrency(totalSales)],
        ["Low Stock Products", String(lowStockProducts.length)],
      ],
    });

    let nextY = doc.lastAutoTable.finalY + 12;

    doc.setFontSize(14);
    doc.text("Low Stock Products", 14, nextY);

    autoTable(doc, {
      startY: nextY + 4,
      head: [["Product", "SKU", "Stock", "Reorder Level"]],
      body:
        lowStockProducts.length > 0
          ? lowStockProducts.map((product) => [
              product.name || product.productName || "Product",
              product.sku || "-",
              String(product.currentStock ?? product.stock ?? 0),
              String(product.reorderLevel ?? 10),
            ])
          : [["No low-stock products", "-", "-", "-"]],
    });

    nextY = doc.lastAutoTable.finalY + 12;

    if (nextY > 250) {
      doc.addPage();
      nextY = 20;
    }

    doc.setFontSize(14);
    doc.text("Recent Sales", 14, nextY);

    autoTable(doc, {
      startY: nextY + 4,
      head: [["Product", "Quantity", "Unit Price", "Sale Date"]],
      body:
        sales.length > 0
          ? sales.slice(0, 10).map((sale) => [
              getProductName(sale),
              String(sale.quantity ?? "-"),
              formatCurrency(sale.unitPrice ?? 0),
              getSaleDate(sale),
            ])
          : [["No sales records", "-", "-", "-"]],
    });

    doc.save("Inventory_Report.pdf");
  };

  const summaryCards = [
    {
      title: "Total Products",
      value: totalProducts.toLocaleString("en-IN"),
      icon: Package,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
      border: "border-[#d6ad45]",
    },
    {
      title: "Units in Stock",
      value: totalStockUnits.toLocaleString("en-IN"),
      icon: Package,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-100",
      border: "border-[#d6ad45]",
    },
    {
      title: "Units Sold",
      value: totalUnitsSold.toLocaleString("en-IN"),
      icon: TrendingUp,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100",
      border: "border-[#d6ad45]",
    },
    {
      title: "Total Sales Value",
      value: formatCurrency(totalSales),
      icon: IndianRupee,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100",
      border: "border-[#d6ad45]",
    },
  ];

  return (
    <DashboardLayout title="Reports">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Page heading */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-md">
              <FileText size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#142447] md:text-3xl">
                Inventory Reports
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Review inventory levels, sales performance and low-stock
                products.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadReports}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                className={loading ? "animate-spin" : ""}
              />
              Refresh Reports
            </button>

            <button
              onClick={downloadExcel}
              disabled={loading || !!error}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={18} />
              Download Excel
            </button>

            <button
              onClick={downloadPDF}
              disabled={loading || !!error}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={18} />
              Download PDF
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Reports Error</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#d6ad45] bg-white p-12 text-center text-slate-500 shadow-sm">
            <RefreshCw
              size={32}
              className="mx-auto mb-3 animate-spin text-blue-600"
            />
            <p className="font-medium">Loading report data...</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className={`rounded-2xl border ${card.border} bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-500">
                          {card.title}
                        </p>
                        <p className="mt-3 break-words text-2xl font-bold text-[#142447]">
                          {card.value}
                        </p>
                      </div>

                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.iconBg} ${card.iconColor}`}
                      >
                        <Icon size={25} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Low stock report */}
            <section className="overflow-hidden rounded-2xl border border-[#d6ad45] bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#d6ad45] bg-gradient-to-r from-orange-50 to-white p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <AlertTriangle size={23} />
                </div>

                <div>
                  <h2 className="font-bold text-[#142447]">
                    Low Stock Report
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Products at or below their reorder level.
                  </p>
                </div>

                <span className="ml-auto rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
                  {lowStockProducts.length}
                </span>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="p-10 text-center">
                  <Package
                    size={36}
                    className="mx-auto mb-3 text-emerald-500"
                  />
                  <p className="font-semibold text-slate-700">
                    No low-stock products found
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#EEF1FF] text-slate-600">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Product</th>
                        <th className="px-5 py-4 font-semibold">SKU</th>
                        <th className="px-5 py-4 font-semibold">
                          Current Stock
                        </th>
                        <th className="px-5 py-4 font-semibold">
                          Reorder Level
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-indigo-50">
                      {lowStockProducts.map((product, index) => (
                        <tr
                          key={product._id || product.sku || index}
                          className="transition hover:bg-indigo-50/50"
                        >
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {product.name || product.productName || "Product"}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {product.sku || "—"}
                          </td>
                          <td className="px-5 py-4 font-bold text-orange-600">
                            {product.currentStock ?? product.stock ?? 0}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {product.reorderLevel ?? 10}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Recent sales */}
            <section className="overflow-hidden rounded-2xl border border-[#d6ad45] bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#d6ad45] bg-gradient-to-r from-blue-50 to-white p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <TrendingUp size={23} />
                </div>

                <div>
                  <h2 className="font-bold text-[#142447]">Recent Sales</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Sales records retrieved from your backend.
                  </p>
                </div>
              </div>

              {sales.length === 0 ? (
                <div className="p-10 text-center">
                  <TrendingUp
                    size={36}
                    className="mx-auto mb-3 text-blue-500"
                  />
                  <p className="font-semibold text-slate-700">
                    No sales records found
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#EEF1FF] text-slate-600">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Product</th>
                        <th className="px-5 py-4 font-semibold">Quantity</th>
                        <th className="px-5 py-4 font-semibold">Unit Price</th>
                        <th className="px-5 py-4 font-semibold">Sale Date</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-indigo-50">
                      {sales.slice(0, 10).map((sale, index) => (
                        <tr
                          key={sale._id || index}
                          className="transition hover:bg-indigo-50/50"
                        >
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {getProductName(sale)}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {sale.quantity ?? "—"}
                          </td>
                          <td className="px-5 py-4 font-medium text-emerald-700">
                            {formatCurrency(sale.unitPrice ?? 0)}
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            {getSaleDate(sale)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
