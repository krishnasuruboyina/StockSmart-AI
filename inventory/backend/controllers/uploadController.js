const XLSX = require("xlsx");

const Product = require("../models/product");
const Supplier = require("../models/supplier");
const UploadHistory = require("../models/uploadHistory");

const MAX_ROWS = 5000;

exports.uploadInventoryFile = async (req, res) => {
  let history = null;

  try {
    // Admin-only access
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can upload inventory files",
      });
    }

    if (!req.user.company) {
      return res.status(400).json({
        success: false,
        message: "Company information is missing",
      });
    }

    const companyId = req.user.company._id || req.user.company;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a CSV or Excel file",
      });
    }

    const fileName = req.file.originalname.toLowerCase();

    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx")) {
      return res.status(400).json({
        success: false,
        message: "Only CSV and .xlsx files are allowed",
      });
    }

    const fileType = fileName.endsWith(".csv") ? "CSV" : "XLSX";

    // Create upload history
    history = await UploadHistory.create({
      company: companyId,
      uploadedBy: req.user._id,
      fileName: req.file.originalname,
      fileType,
      status: "Processing",
    });

    // Parse file
    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: false,
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("The uploaded file has no worksheet");
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: true,
    });

    if (rows.length === 0) {
      throw new Error("The uploaded file contains no data");
    }

    if (rows.length > MAX_ROWS) {
      throw new Error(`Maximum ${MAX_ROWS} rows are allowed per upload`);
    }

    const requiredFields = [
      "name",
      "sku",
      "currentStock",
      "unitPrice",
    ];

    const products = [];
    const errors = [];

    // Get suppliers belonging only to this company
    const suppliers = await Supplier.find({
      company: companyId,
      isActive: true,
    });

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;

      let rowError = null;

      for (const field of requiredFields) {
        if (
          row[field] === undefined ||
          row[field] === null ||
          String(row[field]).trim() === ""
        ) {
          rowError = `Row ${rowNumber}: Missing ${field}`;
          break;
        }
      }

      if (rowError) {
        errors.push(rowError);
        continue;
      }

      const name = String(row.name).trim();
      const sku = String(row.sku).trim().toUpperCase();

      const currentStock = Number(row.currentStock);
      const unitPrice = Number(row.unitPrice);

      const reorderLevel =
        row.reorderLevel === "" ||
        row.reorderLevel === undefined ||
        row.reorderLevel === null
          ? 10
          : Number(row.reorderLevel);

      if (
        !name ||
        !sku ||
        !Number.isInteger(currentStock) ||
        currentStock < 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        !Number.isInteger(reorderLevel) ||
        reorderLevel < 0
      ) {
        errors.push(
          `Row ${rowNumber}: Invalid product name, SKU, stock, price, or reorder level`
        );
        continue;
      }

      // Resolve supplier within this company
      let supplier = null;
      let supplierName = "";

      if (row.supplier && String(row.supplier).trim()) {
        const supplierValue = String(row.supplier).trim();

        supplier = suppliers.find(
          (item) =>
            item.supplierId.toLowerCase() === supplierValue.toLowerCase() ||
            item.name.toLowerCase() === supplierValue.toLowerCase()
        );

        if (!supplier) {
          errors.push(
            `Row ${rowNumber}: Supplier "${supplierValue}" was not found in your company`
          );
          continue;
        }

        supplierName = supplier.name;
      }

      products.push({
        company: companyId,
        name,
        sku,
        category: row.category
          ? String(row.category).trim() || "General"
          : "General",
        currentStock,
        reorderLevel,
        unitPrice,
        supplier: supplier ? supplier._id : null,
        supplierName,
      });
    }

    // Reject duplicate SKUs inside the uploaded file
    const skuList = products.map((product) => product.sku);
    const uniqueSkus = new Set(skuList);

    if (uniqueSkus.size !== skuList.length) {
      errors.push("Duplicate SKU found inside the uploaded file");
    }

    // Check duplicate SKUs only within this company
    const existingProducts = await Product.find({
      company: companyId,
      sku: { $in: skuList },
    }).select("sku");

    if (existingProducts.length > 0) {
      errors.push(
        `These SKUs already exist: ${existingProducts
          .map((product) => product.sku)
          .join(", ")}`
      );
    }

    // Do not insert invalid or partially valid files
    if (errors.length > 0) {
      history.status = "Failed";
      history.totalRecords = rows.length;
      history.successfulRecords = 0;
      history.failedRecords = rows.length;
      history.errorMessages = errors;
      await history.save();

      return res.status(400).json({
        success: false,
        message: "Upload failed. Please correct the file and try again.",
        errors,
      });
    }

    // Insert products
    const savedProducts = await Product.insertMany(products, {
      ordered: true,
    });

    history.status = "Completed";
    history.totalRecords = rows.length;
    history.successfulRecords = savedProducts.length;
    history.failedRecords = 0;
    await history.save();

    return res.status(201).json({
      success: true,
      message: "Inventory file imported successfully",
      count: savedProducts.length,
      uploadHistoryId: history._id,
      data: savedProducts,
    });
  } catch (error) {
    console.error("Inventory upload error:", error.message);

    if (history) {
      history.status = "Failed";
      history.errorMessages = [error.message];
      await history.save().catch((saveError) => {
        console.error("Upload history save error:", saveError.message);
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with this SKU already exists in your company",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import inventory file",
    });
  }
};