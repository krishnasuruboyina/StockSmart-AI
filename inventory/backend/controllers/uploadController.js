
const XLSX = require("xlsx");
const Product = require("../models/product");

const MAX_ROWS = 5000;

exports.uploadInventoryFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a CSV or Excel file",
      });
    }

    // Verify file extension
    const fileName = req.file.originalname.toLowerCase();

    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx")) {
      return res.status(400).json({
        success: false,
        message: "Only CSV and .xlsx files are allowed",
      });
    }

    // Parse uploaded file
    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: false,
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: "The uploaded file has no worksheet",
      });
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: true,
    });

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "The uploaded file contains no data",
      });
    }

    if (rows.length > MAX_ROWS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_ROWS} rows are allowed per upload`,
      });
    }

    const requiredFields = [
      "name",
      "sku",
      "currentStock",
      "unitPrice",
    ];

    // Validate and normalize each product
    const products = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;

      for (const field of requiredFields) {
        const value = row[field];

        if (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        ) {
          return res.status(400).json({
            success: false,
            message: `Row ${rowNumber}: Missing ${field}`,
          });
        }
      }

      const name = String(row.name).trim();
      const sku = String(row.sku).trim();

      const currentStock = Number(row.currentStock);
      const unitPrice = Number(row.unitPrice);

      const reorderLevel =
        row.reorderLevel === "" ||
        row.reorderLevel === undefined ||
        row.reorderLevel === null
          ? 10
          : Number(row.reorderLevel);

      if (!name || !sku) {
        return res.status(400).json({
          success: false,
          message: `Row ${rowNumber}: Name and SKU cannot be empty`,
        });
      }

      if (
        !Number.isFinite(currentStock) ||
        !Number.isInteger(currentStock) ||
        currentStock < 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        !Number.isFinite(reorderLevel) ||
        !Number.isInteger(reorderLevel) ||
        reorderLevel < 0
      ) {
        return res.status(400).json({
          success: false,
          message: `Row ${rowNumber}: Invalid stock, price, or reorder level`,
        });
      }

      products.push({
        name,
        sku,
        category: row.category
          ? String(row.category).trim() || "General"
          : "General",
        currentStock,
        reorderLevel,
        unitPrice,
        supplier: row.supplier
          ? String(row.supplier).trim()
          : "",
      });
    }

    // Detect duplicate SKUs within the uploaded file
    const skus = products.map((product) => product.sku);
    const uniqueSkus = new Set(skus);

    if (uniqueSkus.size !== skus.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate SKU found in the uploaded file",
      });
    }

    // Check for existing products
    const existingProducts = await Product.find({
      sku: { $in: skus },
    }).select("sku");

    if (existingProducts.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Some SKUs already exist",
        duplicateSkus: existingProducts.map((product) => product.sku),
      });
    }

    // Insert only after all rows pass validation
    const savedProducts = await Product.insertMany(products, {
      ordered: true,
    });

    return res.status(201).json({
      success: true,
      message: "Inventory file imported successfully",
      count: savedProducts.length,
      data: savedProducts,
    });
  } catch (error) {
    console.error("Inventory upload error:", error.message);

    // Duplicate-key conflict
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with this SKU already exists",
      });
    }

    // Database or unexpected server errors
    return res.status(500).json({
      success: false,
      message: "Failed to import inventory file",
    });
  }
};
