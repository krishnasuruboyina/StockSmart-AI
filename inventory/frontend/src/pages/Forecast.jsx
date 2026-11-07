import { useEffect, useState } from "react";
import {
  TrendingUp,
  Brain,
  RefreshCw,
  AlertCircle,
  Package,
  ShoppingCart,
  CheckCircle,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Forecast() {
  const { role } = useAuth();

  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);

  const [forecastData, setForecastData] = useState(null);
  const [error, setError] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestCreated, setRequestCreated] = useState(false);

  // Historical sales upload states
  const [historyFile, setHistoryFile] = useState(null);
  const [uploadingHistory, setUploadingHistory] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSummary, setUploadSummary] = useState(null);
  const [uploadErrors, setUploadErrors] = useState([]);

  const normalizedRole = role?.toLowerCase();

  const isAdmin = normalizedRole === "admin";
  const canCreateRequest = normalizedRole === "employee";

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await api.get("/inventory");
        const result = response.data;

        const productList = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result?.products)
              ? result.products
              : [];

        setProducts(productList);

        if (productList.length > 0) {
          setProductId(
            String(productList[0]._id || productList[0].id)
          );
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Failed to load inventory products."
        );
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  const selectedProduct = products.find(
    (product) =>
      String(product._id || product.id) === String(productId)
  );

  // Historical sales upload - Admin only
  const uploadHistoricalSales = async () => {
    if (!isAdmin) {
      setUploadError("Only Admin can upload historical sales.");
      return;
    }

    if (!historyFile) {
      setUploadError("Please select an Excel or CSV file.");
      return;
    }

    const allowedExtensions = [".xlsx", ".xls", ".csv"];
    const extension = historyFile.name
      .substring(historyFile.name.lastIndexOf("."))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setUploadError("Only XLSX, XLS and CSV files are supported.");
      return;
    }

    if (historyFile.size > 10 * 1024 * 1024) {
      setUploadError("File size must be below 10 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", historyFile);

    setUploadingHistory(true);
    setUploadError("");
    setUploadMessage("");
    setUploadSummary(null);
    setUploadErrors([]);
    setForecastData(null);
    setError("");

    try {
      const response = await api.post(
        "/sales/history/upload",
        formData
      );

      const result = response.data;

      setUploadSummary(result.summary || null);
      setUploadErrors(result.errors || []);

      setUploadMessage(
        result.message || "Historical sales upload completed."
      );

      setHistoryFile(null);

      // Clear native file input
      const fileInput = document.getElementById(
        "historical-sales-file"
      );

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (err) {
      setUploadError(
        err.response?.data?.message ||
          "Failed to upload historical sales."
      );
    } finally {
      setUploadingHistory(false);
    }
  };

  const generateForecast = async () => {
    if (!productId) {
      setError("Please select a product first.");
      return;
    }

    setLoading(true);
    setError("");
    setRequestMessage("");
    setRequestCreated(false);
    setForecastData(null);

    try {
      const response = await api.post("/forecast", {
        productId,
        createPurchaseRequest: false,
      });

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Forecast generation failed."
        );
      }

      setForecastData(response.data?.data || response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to generate forecast."
      );
    } finally {
      setLoading(false);
    }
  };

  const createPurchaseRequest = async () => {
    if (!productId || !forecastData || creatingRequest) {
      return;
    }

    const suggestedQuantity = Number(
      forecastData.orderCalculation?.suggestedQuantity ?? 0
    );

    if (!Number.isFinite(suggestedQuantity) || suggestedQuantity <= 0) {
      setError("No additional stock is required for this product.");
      return;
    }

    setCreatingRequest(true);
    setError("");
    setRequestMessage("");

    try {
      const response = await api.post("/forecast", {
        productId,
        createPurchaseRequest: true,
      });

      const result = response.data?.data || response.data;

      if (result.success === false) {
        throw new Error(
          result.message || "Purchase request could not be created."
        );
      }

      setForecastData(result);

      if (result.purchaseRequestCreated) {
        setRequestCreated(true);
        setRequestMessage(
          `Purchase request created successfully. Quantity: ${
            result.purchaseRequest?.quantity ?? suggestedQuantity
          }. Check the Approvals page for its status.`
        );
      } else {
        setRequestMessage(
          result.message ||
            "The backend did not confirm that a new request was created. Check Purchase Requests before trying again."
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create purchase request."
      );
    } finally {
      setCreatingRequest(false);
    }
  };

  const suggestedQuantity = Number(
    forecastData?.orderCalculation?.suggestedQuantity ?? 0
  );

  if (normalizedRole === "supplier") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        You do not have permission to access AI Forecast.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf3ff] p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Page Header */}
        <div className="flex flex-col gap-4 rounded-2xl border border-[#d6ad45] bg-[#071b42] p-6 shadow-lg sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white md:text-3xl">
              <TrendingUp className="text-[#f5c451]" />
              AI Demand Forecast
            </h1>

            <p className="mt-2 text-sm text-blue-200">
              Predict future product demand and create purchase requests.
            </p>
          </div>
        </div>

        {/* Admin Historical Sales Upload */}
        {isAdmin && (
          <div className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-3">
                <FileSpreadsheet className="text-blue-700" size={25} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Historical Sales Data Upload
                </h2>

                <p className="text-sm text-slate-500">
                  Admin only - Upload past sales records for AI forecasting.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Supported Excel / CSV columns
              </p>

              <p className="mt-2 text-sm text-blue-800">
                Date, SKU, Product Name, Quantity Sold, Unit Price
              </p>

              <p className="mt-2 text-xs text-blue-700">
                Date, SKU or Product Name, and Quantity Sold are required.
                Unit Price is optional. If missing, current product price
                will be used as an estimate.
              </p>
            </div>

            <div className="mt-4">
              <label
                htmlFor="historical-sales-file"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Select Historical Sales File
              </label>

              <input
                id="historical-sales-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  setHistoryFile(e.target.files?.[0] || null);
                  setUploadError("");
                  setUploadMessage("");
                  setUploadSummary(null);
                  setUploadErrors([]);
                }}
                disabled={uploadingHistory}
                className="w-full rounded-lg border border-[#d6ad45] bg-white p-3 text-sm"
              />

              {historyFile && (
                <p className="mt-2 text-sm text-slate-600">
                  Selected: {historyFile.name}
                </p>
              )}

              <button
                onClick={uploadHistoricalSales}
                disabled={!historyFile || uploadingHistory}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#d6ad45] bg-[#e5b94c] px-5 py-3 font-semibold text-[#142447] transition hover:bg-[#f0ca69] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {uploadingHistory ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <Upload size={18} />
                )}

                {uploadingHistory
                  ? "Uploading Historical Sales..."
                  : "Upload Historical Sales"}
              </button>
            </div>

            {uploadError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                {uploadError}
              </div>
            )}

            {uploadMessage && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle size={18} className="mt-0.5 shrink-0" />
                {uploadMessage}
              </div>
            )}

            {uploadSummary && (
              <div className="mt-4">
                <h3 className="mb-3 font-semibold text-slate-800">
                  Import Summary
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Total Rows", uploadSummary.totalRows],
                    ["Imported", uploadSummary.imported],
                    ["Duplicates", uploadSummary.duplicates],
                    ["Skipped", uploadSummary.skipped],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-[#d6ad45] bg-[#eaf3ff] p-3"
                    >
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-1 text-xl font-bold text-slate-800">
                        {value ?? 0}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadErrors.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-semibold text-amber-900">
                  Rows that were skipped
                </h3>

                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                  {uploadErrors.map((item, index) => (
                    <p
                      key={`${item.row}-${index}`}
                      className="text-sm text-amber-800"
                    >
                      Row {item.row}: {item.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product Selection */}
        <div className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5 shadow-sm">
          <label
            htmlFor="forecast-product"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Select Product
          </label>

          <select
            id="forecast-product"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setForecastData(null);
              setError("");
              setRequestMessage("");
              setRequestCreated(false);
            }}
            disabled={loadingProducts || products.length === 0}
            className="w-full rounded-lg border border-[#d6ad45] bg-white p-3 outline-none focus:border-blue-500"
          >
            <option value="">
              {loadingProducts
                ? "Loading products..."
                : products.length === 0
                  ? "No products available"
                  : "Select a product"}
            </option>

            {products.map((product) => (
              <option
                key={product._id || product.id}
                value={product._id || product.id}
              >
                {product.name || product.productName} ({product.sku || "No SKU"})
                {" — Stock: "}
                {product.currentStock ?? product.stock ?? 0}
              </option>
            ))}
          </select>

          {selectedProduct && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#d6ad45] bg-[#eaf3ff] p-3">
                <p className="text-sm text-slate-500">Current Stock</p>
                <p className="text-xl font-bold text-slate-800">
                  {selectedProduct.currentStock ?? selectedProduct.stock ?? 0}
                </p>
              </div>

              <div className="rounded-lg border border-[#d6ad45] bg-[#eaf3ff] p-3">
                <p className="text-sm text-slate-500">Unit Price</p>
                <p className="text-xl font-bold text-slate-800">
                  ₹{selectedProduct.unitPrice ?? 0}
                </p>
              </div>

              <div className="rounded-lg border border-[#d6ad45] bg-[#eaf3ff] p-3">
                <p className="text-sm text-slate-500">Reorder Level</p>
                <p className="text-xl font-bold text-slate-800">
                  {selectedProduct.reorderLevel ?? 10}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={generateForecast}
            disabled={loading || loadingProducts || !productId}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-[#d6ad45] bg-[#e5b94c] px-5 py-3 font-semibold text-[#142447] transition hover:bg-[#f0ca69] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={18} />
            ) : (
              <Brain size={18} />
            )}
            {loading ? "Generating..." : "Generate Forecast"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold">Error</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Purchase Request Message */}
        {requestMessage && (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            <CheckCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold">
                {requestCreated ? "Request Created" : "Request Update"}
              </p>
              <p className="mt-1 text-sm">{requestMessage}</p>
            </div>
          </div>
        )}

        {/* Forecast Loading */}
        {loading && (
          <div className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-10 text-center shadow-sm">
            <RefreshCw
              className="mx-auto animate-spin text-blue-600"
              size={36}
            />
            <p className="mt-4 text-slate-600">
              Generating demand prediction...
            </p>
          </div>
        )}

        {/* Forecast Results */}
        {forecastData && !loading && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5">
                <Package className="mb-3 text-blue-600" size={25} />
                <p className="text-sm text-slate-500">Product</p>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {forecastData.productName ||
                    selectedProduct?.name ||
                    selectedProduct?.productName ||
                    "—"}
                </p>
              </div>

              <div className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5">
                <TrendingUp className="mb-3 text-green-600" size={25} />
                <p className="text-sm text-slate-500">
                  Predicted Weekly Demand
                </p>
                <p className="mt-1 text-3xl font-bold text-slate-800">
                  {forecastData.forecastDemand ??
                    forecastData.predictedNextPeriodDemand ??
                    "—"}
                </p>
              </div>
            </div>

            {forecastData.orderCalculation && (
              <div className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-5">
                <h2 className="mb-4 text-lg font-semibold text-slate-800">
                  Suggested Reorder Analysis
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Current Stock", forecastData.orderCalculation.currentStock],
                    ["Demand During Lead Time", forecastData.orderCalculation.demandDuringLeadTime],
                    ["Safety Stock", forecastData.orderCalculation.safetyStock],
                    ["Incoming Stock", forecastData.orderCalculation.incomingStock],
                    ["Supplier Lead Time (days)", forecastData.orderCalculation.leadTimeDays],
                    ["Suggested Order Quantity", forecastData.orderCalculation.suggestedQuantity],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-[#d6ad45] bg-[#eaf3ff] p-4"
                    >
                      <p className="text-sm text-slate-500">{label}</p>
                      <p className="mt-2 text-xl font-bold text-slate-800">
                          {value ?? "—"}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 text-sm text-slate-500">
                    {forecastData.message}
                  </p>

                  {canCreateRequest &&
                    suggestedQuantity > 0 &&
                    !requestCreated && (
                      <button
                        onClick={createPurchaseRequest}
                        disabled={creatingRequest}
                        className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-[#d6ad45] bg-[#e5b94c] px-5 py-3 font-semibold text-[#142447] transition hover:bg-[#f0ca69] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {creatingRequest ? (
                          <RefreshCw className="animate-spin" size={18} />
                        ) : (
                          <ShoppingCart size={18} />
                        )}

                        {creatingRequest
                          ? "Creating Request..."
                          : "Create Purchase Request"}
                      </button>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
  );
}