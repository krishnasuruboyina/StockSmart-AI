import { useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Search,
  Trash2,
  Download,
  Database,
  X,
  RefreshCw,
  Sparkles,
  ArrowRightLeft,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const SYSTEM_FIELDS = [
  {
    key: "product",
    label: "Product Name",
    required: true,
    aliases: [
      "product",
      "product name",
      "item",
      "item name",
      "material",
      "material name",
      "product title",
      "description",
      "name",
    ],
  },
  {
    key: "stock",
    label: "Current Stock",
    required: true,
    aliases: [
      "current stock",
      "stock",
      "stock qty",
      "stock quantity",
      "available stock",
      "available qty",
      "available quantity",
      "quantity",
      "qty",
      "inventory",
      "on hand",
      "closing stock",
    ],
  },
  {
    key: "dailySales",
    label: "Daily Sales",
    required: true,
    aliases: [
      "daily sales",
      "sales",
      "sales per day",
      "avg daily sales",
      "average daily sales",
      "daily demand",
      "units sold",
      "sold quantity",
      "sales qty",
      "daily consumption",
    ],
  },
  {
    key: "sku",
    label: "SKU / Product ID",
    required: false,
    aliases: [
      "sku",
      "product id",
      "item id",
      "product code",
      "item code",
      "code",
    ],
  },
  {
    key: "category",
    label: "Category",
    required: false,
    aliases: ["category", "product category", "item category", "type"],
  },
  {
    key: "unitPrice",
    label: "Unit Price",
    required: false,
    aliases: [
      "unit price",
      "price",
      "cost",
      "rate",
      "purchase price",
      "selling price",
    ],
  },
  {
    key: "leadTime",
    label: "Lead Time",
    required: false,
    aliases: [
      "lead time",
      "lead time days",
      "delivery days",
      "supplier lead time",
    ],
  },
  {
    key: "date",
    label: "Date",
    required: false,
    aliases: [
      "date",
      "sales date",
      "transaction date",
      "order date",
      "record date",
    ],
  },
];

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");

const getSuggestedColumn = (columns, aliases) => {
  return (
    columns.find((column) => {
      const normalized = normalizeHeader(column);

      return aliases.some(
        (alias) => normalized === normalizeHeader(alias)
      );
    }) || ""
  );
};

export default function UploadData() {
  const { role } = useAuth();
  const isAdmin = role?.toLowerCase() === "admin";

  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [errors, setErrors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [mappingConfirmed, setMappingConfirmed] = useState(false);

  const requiredFields = SYSTEM_FIELDS.filter(
    (field) => field.required
  );

  const clearData = () => {
    setFile(null);
    setData([]);
    setColumns([]);
    setMapping({});
    setErrors([]);
    setMessage("");
    setSearch("");
    setMappingConfirmed(false);

    const input = document.getElementById("inventory-file");

    if (input) input.value = "";
  };

  const handleFileChange = async (e) => {
    if (!isAdmin) {
      setMessage("Only Admin can upload inventory data.");
      return;
    }

    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    clearData();
    setFile(selectedFile);

    const validExtensions = [".xlsx", ".xls", ".csv"];

    const extension = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (!validExtensions.includes(extension)) {
      setErrors(["Please upload an Excel or CSV file."]);
      return;
    }

    try {
      setLoading(true);

      const buffer = await selectedFile.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error("No worksheet found.");
      }

      const worksheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
        blankrows: false,
      });

      if (!rows.length) {
        throw new Error("The uploaded file is empty.");
      }

      const fileColumns = Object.keys(rows[0]);

      if (!fileColumns.length) {
        throw new Error("No columns found in the uploaded file.");
      }

      setColumns(fileColumns);
      setData(rows);

      // Automatically suggest matching columns.
      const suggestedMapping = {};

      SYSTEM_FIELDS.forEach((field) => {
        suggestedMapping[field.key] = getSuggestedColumn(
          fileColumns,
          field.aliases
        );
      });

      setMapping(suggestedMapping);
      setMappingConfirmed(false);

      setMessage(
        `${rows.length} records and ${fileColumns.length} columns detected successfully. Please verify column mapping.`
      );
    } catch (error) {
      setErrors([
        error.message || "Unable to read the uploaded file.",
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (fieldKey, columnName) => {
    setMapping((previous) => ({
      ...previous,
      [fieldKey]: columnName,
    }));

    setMappingConfirmed(false);
    setErrors([]);
    setMessage("");
  };

  const validateMapping = () => {
    const selectedColumns = Object.entries(mapping)
      .filter(([, column]) => column)
      .map(([, column]) => column);

    const duplicateColumns = selectedColumns.filter(
      (column, index) => selectedColumns.indexOf(column) !== index
    );

    if (duplicateColumns.length > 0) {
      setErrors([
        "One Excel column cannot be assigned to multiple system fields. Please correct the mapping.",
      ]);
      return false;
    }

    const missingFields = requiredFields.filter(
      (field) => !mapping[field.key]
    );

    if (missingFields.length > 0) {
      setErrors([
        `Please map these required fields: ${missingFields
          .map((field) => field.label)
          .join(", ")}`,
      ]);
      return false;
    }

    return true;
  };

  const confirmMapping = () => {
    if (!validateMapping()) return;

    const invalidRows = [];

    data.forEach((row, index) => {
      const product = String(
        row[mapping.product] ?? ""
      ).trim();

      const stockValue = row[mapping.stock];
      const salesValue = row[mapping.dailySales];

      const stock = Number(stockValue);
      const sales = Number(salesValue);

      const rowErrors = [];

      if (!product) {
        rowErrors.push("Product name is missing");
      }

      if (
        stockValue === "" ||
        stockValue === null ||
        stockValue === undefined ||
        !Number.isFinite(stock) ||
        stock < 0
      ) {
        rowErrors.push("Invalid Current Stock");
      }

      if (
        salesValue === "" ||
        salesValue === null ||
        salesValue === undefined ||
        !Number.isFinite(sales) ||
        sales < 0
      ) {
        rowErrors.push("Invalid Daily Sales");
      }

      if (rowErrors.length > 0) {
        invalidRows.push({
          rowNumber: index + 2,
          errors: rowErrors,
        });
      }
    });

    setErrors(invalidRows);

    if (invalidRows.length > 0) {
      setMappingConfirmed(false);

      setMessage(
        `${data.length - invalidRows.length} valid rows found. ${invalidRows.length} rows need correction.`
      );

      return;
    }

    setMappingConfirmed(true);

    setMessage(
      `Mapping confirmed! All ${data.length} records passed basic validation.`
    );
  };

  const filteredData = data.filter((row) => {
    const searchValue = search.toLowerCase();

    return columns.some((column) =>
      String(row[column] ?? "")
        .toLowerCase()
        .includes(searchValue)
    );
  });

  const downloadData = () => {
    if (!data.length) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Original Inventory Data"
    );

    XLSX.writeFile(
      workbook,
      "inventory_data.xlsx"
    );
  };

  const uploadToBackend = async () => {
    if (!isAdmin) {
      setMessage("Only Admin can upload inventory data.");
      return;
    }

    if (!file || !data.length || !mappingConfirmed) {
      setMessage("Please complete and confirm column mapping first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const formData = new FormData();

      formData.append("file", file);

      // Send confirmed column mapping to backend.
      formData.append("mapping", JSON.stringify(mapping));

      // Send original headers as additional metadata.
      formData.append("columns", JSON.stringify(columns));

      const response = await api.post(
        "/inventory/upload",
        formData
      );

      setMessage(
        response.data?.message ||
          "Inventory data uploaded successfully!"
      );

      clearData();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to upload data to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#eaf3ff] p-5 md:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle
            size={40}
            className="mx-auto text-red-500"
          />

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Access Restricted
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Only Admin users can upload inventory data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf3ff] p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 rounded-2xl border border-[#d6ad45] bg-[#071b42] p-6 shadow-lg sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Upload Inventory Data
            </h1>

            <p className="mt-2 text-sm text-blue-200">
              Upload any inventory spreadsheet with dynamic columns.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#f5c451]">
            <Database size={18} />
            Inventory Data Management
          </div>
        </div>

        {/* Upload */}
        <div className="mb-6 rounded-2xl border border-[#d6ad45] bg-[#f8fbff] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-3 text-[#a47b19]">
              <FileSpreadsheet size={23} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-[#172554]">
                Upload Excel / CSV File
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                XLSX, XLS and CSV. Dynamic columns supported.
              </p>
            </div>
          </div>

          <label
            htmlFor="inventory-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#d6ad45] bg-[#eaf3ff] p-10 transition hover:bg-[#e2edff]"
          >
            <div className="rounded-full bg-amber-100 p-4 text-[#a47b19]">
              <Upload size={28} />
            </div>

            <p className="text-sm font-semibold text-[#172554]">
              Click to browse your file
            </p>

            <p className="text-xs text-slate-500">
              Any number of columns and custom headers supported
            </p>

            <input
              id="inventory-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {file && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#d6ad45] bg-[#eaf3ff] p-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet
                  size={19}
                  className="text-[#a47b19]"
                />

                <span className="text-sm text-slate-700">
                  {file.name}
                </span>
              </div>

              <button
                type="button"
                onClick={clearData}
                className="text-red-500 hover:text-red-700"
                aria-label="Clear selected file"
              >
                <X size={19} />
              </button>
            </div>
          )}

          {loading && (
            <p className="mt-4 flex items-center gap-2 text-sm text-[#a47b19]">
              <RefreshCw size={16} className="animate-spin" />
              Processing file...
            </p>
          )}
        </div>

        {/* Detected Columns */}
        {columns.length > 0 && (
          <div className="mb-6 rounded-2xl border border-[#d6ad45] bg-[#f8fbff] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-[#a47b19]" />

              <h2 className="font-semibold text-[#172554]">
                Detected Spreadsheet Columns
              </h2>
            </div>

            <p className="mb-3 text-xs text-slate-500">
              {columns.length} columns and {data.length} records detected.
              All original columns will be preserved.
            </p>

            <div className="flex flex-wrap gap-2">
              {columns.map((column) => (
                <span
                  key={column}
                  className="rounded-lg border border-[#d6ad45] bg-amber-50 px-3 py-2 text-xs text-[#806015]"
                >
                  {column}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Mapping */}
        {columns.length > 0 && (
          <div className="mb-6 rounded-2xl border border-[#d6ad45] bg-[#f8fbff] p-5">
            <div className="mb-4 flex items-center gap-2">
              <ArrowRightLeft
                size={20}
                className="text-[#a47b19]"
              />

              <h2 className="font-semibold text-[#172554]">
                Inventory Column Mapping
              </h2>
            </div>

            <p className="mb-5 text-xs text-slate-500">
              Match your spreadsheet columns with the inventory fields.
              Suggested matches are automatically selected. Please verify
              them before continuing.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {SYSTEM_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="mb-2 block text-xs font-semibold text-[#172554]">
                    {field.label}

                    {field.required ? (
                      <span className="ml-1 text-red-500">*</span>
                    ) : (
                      <span className="ml-1 text-slate-400">
                        (Optional)
                      </span>
                    )}
                  </label>

                  <select
                    value={mapping[field.key] || ""}
                    onChange={(e) =>
                      handleMappingChange(
                        field.key,
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-[#d6ad45] bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-amber-500"
                  >
                    <option value="">
                      -- Select spreadsheet column --
                    </option>

                    {columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={confirmMapping}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-[#17213A] hover:bg-amber-300 disabled:opacity-50"
              >
                <CheckCircle size={17} />
                Validate & Confirm Mapping
              </button>

              <button
                type="button"
                onClick={() => {
                  const suggested = {};

                  SYSTEM_FIELDS.forEach((field) => {
                    suggested[field.key] = getSuggestedColumn(
                      columns,
                      field.aliases
                    );
                  });

                  setMapping(suggested);
                  setMappingConfirmed(false);
                  setErrors([]);
                  setMessage("Automatic suggestions restored.");
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#d6ad45] bg-white px-5 py-3 text-sm font-semibold text-[#806015]"
              >
                <RefreshCw size={16} />
                Auto Suggest
              </button>
            </div>

            {mappingConfirmed && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle size={18} />
                Column mapping confirmed. Ready to upload.
              </div>
            )}
          </div>
        )}

        {/* Status */}
        {message && (
          <div
            role="status"
            className="mb-5 flex items-start gap-2 rounded-xl border border-[#d6ad45] bg-amber-50 p-4 text-sm text-[#806015]"
          >
            <CheckCircle size={18} className="shrink-0" />
            {message}
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-red-600">
              <AlertCircle size={19} />

              <h3 className="text-sm font-semibold">
                Validation Issues ({errors.length})
              </h3>
            </div>

            {errors.map((error, index) => (
              <div
                key={index}
                className="mb-2 text-xs text-red-600"
              >
                {typeof error === "string"
                  ? error
                  : `Row ${error.rowNumber}: ${error.errors.join(", ")}`}
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        {data.length > 0 && (
          <div className="rounded-2xl border border-[#d6ad45] bg-[#f8fbff] p-5">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <h2 className="text-lg font-bold text-[#172554]">
                  Original Data Preview
                </h2><p className="mt-1 text-xs text-slate-500">
                  {data.length} records | {columns.length} columns
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadData}
                  className="flex items-center gap-2 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-[#17213A] hover:bg-amber-300"
                >
                  <Download size={15} />
                  Download
                </button>

                <button
                  type="button"
                  onClick={clearData}
                  className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
                >
                  <Trash2 size={15} />
                  Clear
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search all columns..."
                className="w-full rounded-lg border border-[#d6ad45] bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-amber-500"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#d6ad45] bg-[#eaf3ff] text-[#806015]">
                    {columns.map((column) => (
                      <th
                        key={column}
                        className="whitespace-nowrap px-4 py-3 font-semibold"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredData.slice(0, 100).map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-[#e5cf91] hover:bg-[#eaf3ff]"
                    >
                      {columns.map((column) => (
                        <td
                          key={column}
                          className="whitespace-nowrap px-4 py-3 text-slate-700"
                        >
                          {String(row[column] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredData.length > 100 && (
              <p className="mt-3 text-xs text-slate-500">
                Showing first 100 records. Download to view all records.
              </p>
            )}

            {/* Upload Button */}
            <button
              type="button"
              onClick={uploadToBackend}
              disabled={
                loading ||
                errors.length > 0 ||
                !mappingConfirmed
              }
              className="mt-6 w-full rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-[#17213A] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {loading ? "Uploading..." : "Upload to Inventory"}
            </button>

            {!mappingConfirmed && (
              <p className="mt-2 text-xs text-slate-500">
                Confirm the column mapping and validation before uploading.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}