
import React, { useState } from "react";
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
} from "lucide-react";

export default function UploadData() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [errors, setErrors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const requiredColumns = ["Product", "Current Stock", "Daily Sales"];

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setData([]);
    setColumns([]);
    setErrors([]);
    setMessage("");

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
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error("No worksheet found in the uploaded file.");
      }

      const worksheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });

      if (!rows.length) {
        throw new Error("The uploaded file is empty.");
      }

      const fileColumns = Object.keys(rows[0]);
      setColumns(fileColumns);

      const missingColumns = requiredColumns.filter(
        (column) => !fileColumns.includes(column)
      );

      if (missingColumns.length > 0) {
        setErrors([
          `Missing required columns: ${missingColumns.join(", ")}`,
        ]);
        return;
      }

      const invalidRows = [];
      const validRows = [];

      rows.forEach((row, index) => {
        const product = String(row.Product || "").trim();
        const stock = Number(row["Current Stock"]);
        const sales = Number(row["Daily Sales"]);

        const rowErrors = [];

        if (!product) {
          rowErrors.push("Product name is missing");
        }

        if (
          row["Current Stock"] === "" ||
          !Number.isFinite(stock) ||
          stock < 0
        ) {
          rowErrors.push("Invalid Current Stock");
        }

        if (
          row["Daily Sales"] === "" ||
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
        } else {
          validRows.push({
            ...row,
            "Current Stock": stock,
            "Daily Sales": sales,
          });
        }
      });

      setData(validRows);
      setErrors(invalidRows);

      if (invalidRows.length === 0) {
        setMessage("File validated successfully!");
      } else {
        setMessage(
          `${validRows.length} valid rows found. ${invalidRows.length} rows need correction.`
        );
      }
    } catch (error) {
      setErrors([error.message || "Unable to read the uploaded file."]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter((row) =>
    String(row.Product || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const clearData = () => {
    setFile(null);
    setData([]);
    setColumns([]);
    setErrors([]);
    setMessage("");

    const input = document.getElementById("inventory-file");
    if (input) input.value = "";
  };

  const downloadData = () => {
    if (!data.length) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Data");
    XLSX.writeFile(workbook, "validated_inventory_data.xlsx");
  };

  const uploadToBackend = async () => {
    if (!file || data.length === 0) return;

    try {
      setLoading(true);
      setMessage("");

      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000";

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/inventory/upload`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Upload failed.");
      }

      setMessage(
        result.message || "Inventory data uploaded successfully!"
      );
    } catch (error) {
      setMessage(
        error.message || "Unable to upload data to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eaf3ff] p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Dark navy header with gold border */}
        <div className="mb-8 flex flex-col justify-between gap-4 rounded-2xl border border-[#d6ad45] bg-[#071b42] p-6 shadow-lg sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Upload Inventory Data
            </h1>

            <p className="mt-2 text-sm text-blue-200">
              Import, validate and preview your inventory records.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#f5c451]">
            <Database size={18} />
            Inventory Data Management
          </div>
        </div>

        {/* Upload card */}
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
                Supported formats: XLSX, XLS and CSV
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
              Upload your inventory spreadsheet
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
            <p className="mt-4 text-sm text-[#a47b19]">
              Processing file...
            </p>
          )}
        </div>

        {/* Required columns */}
        <div className="mb-6 rounded-2xl border border-[#d6ad45] bg-[#f8fbff] p-5">
          <h3 className="mb-3 font-semibold text-[#172554]">
            Required Columns
          </h3>

          <div className="flex flex-wrap gap-2">
            {requiredColumns.map((column) => (
              <span
                key={column}
                className="rounded-lg border border-[#d6ad45] bg-amber-50 px-3 py-2 text-xs text-[#806015]"
              >
                {column}
              </span>
            ))}
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#d6ad45] bg-amber-50 p-4 text-sm text-[#806015]">
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
              <div key={index} className="mb-2 text-xs text-red-600">
                {typeof error === "string"
                  ? error
                  : `Row ${error.rowNumber}: ${error.errors.join(", ")}`}
              </div>
            ))}
          </div>
        )}

        {/* Data Preview */}
        {data.length > 0 && (
          <div className="rounded-2xl border border-[#d6ad45] bg-[#f8fbff] p-5">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <h2 className="text-lg font-bold text-[#172554]">
                  Data Preview
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {data.length} valid records
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

            <div className="relative mb-4">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-lg border border-[#d6ad45] bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-amber-500"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#d6ad45] bg-[#eaf3ff] text-[#806015]">
                    {columns.map((column) => (
                      <th
                        key={column}
                        className="px-4 py-3 font-semibold"
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
                          className="px-4 py-3 text-slate-700"
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

            <button
              type="button"
              onClick={uploadToBackend}
              disabled={loading || errors.length > 0}
              className="mt-6 w-full rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-[#17213A] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {loading ? "Uploading..." : "Upload to Inventory"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
