const mongoose = require("mongoose");
const XLSX = require("xlsx");

const Product = require("../models/product");
const Supplier = require("../models/supplier");

const getCompanyId = (req) =>
  req.user?.company?._id || req.user?.company;

const isValidId = (id) => mongoose.isValidObjectId(id);

const isAdmin = (req) => req.user?.role === "admin";

// Get all products - Admin and Employee
exports.getProducts = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company information is missing",
      });
    }

    const products = await Product.find({
      company: companyId,
      isActive: true,
    })
      .populate("supplier", "name supplierId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

// Add product - Admin only
exports.createProduct = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only administrators can add products",
      });
    }

    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company information is missing",
      });
    }

    const {
      name,
      sku,
      category,
      currentStock,
      reorderLevel,
      unitPrice,
      supplier,
      description,
      unit,
    } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (typeof sku !== "string" || !sku.trim()) {
      return res.status(400).json({
        success: false,
        message: "SKU is required",
      });
    }

    if (
      currentStock === undefined ||
      currentStock === null ||
      currentStock === "" ||
      !Number.isInteger(Number(currentStock)) ||
      Number(currentStock) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Current stock must be a non-negative whole number",
      });
    }

    if (
      unitPrice === undefined ||
      unitPrice === null ||
      unitPrice === "" ||
      !Number.isFinite(Number(unitPrice)) ||
      Number(unitPrice) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Unit price must be a valid non-negative number",
      });
    }

    const finalReorderLevel =
      reorderLevel === undefined || reorderLevel === ""
        ? 10
        : Number(reorderLevel);

    if (
      !Number.isInteger(finalReorderLevel) ||
      finalReorderLevel < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Reorder level must be a non-negative whole number",
      });
    }

    const normalizedSku = sku.trim().toUpperCase();

    const existingProduct = await Product.findOne({
      company: companyId,
      sku: normalizedSku,
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "SKU already exists in your company",
      });
    }

    let supplierId = null;
    let supplierName = "";

    if (supplier) {
      if (!isValidId(supplier)) {
        return res.status(400).json({
          success: false,
          message: "Invalid supplier ID",
        });
      }

      const supplierRecord = await Supplier.findOne({
        _id: supplier,
        company: companyId,
        isActive: true,
      });

      if (!supplierRecord) {
        return res.status(400).json({
          success: false,
          message: "Supplier not found in your company",
        });
      }

      supplierId = supplierRecord._id;
      supplierName = supplierRecord.name;
    }

    const product = await Product.create({
      company: companyId,
      name: name.trim(),
      sku: normalizedSku,
      category: category ? String(category).trim() : "General",
      currentStock: Number(currentStock),
      reorderLevel: finalReorderLevel,
      unitPrice: Number(unitPrice),
      supplier: supplierId,
      supplierName,
      description: description ? String(description).trim() : "",
      unit: unit ? String(unit).trim() : "units",
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "SKU already exists in your company",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Create product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

// Get one product - Admin and Employee
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = getCompanyId(req);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOne({
      _id: id,
      company: companyId,
      isActive: true,
    }).populate("supplier", "name supplierId");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

// Update product - Admin only
exports.updateProduct = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only administrators can update products",
      });
    }

    const { id } = req.params;
    const companyId = getCompanyId(req);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const allowedFields = [
      "name",
      "sku",
      "category",
      "currentStock",
      "dailySales",
      "reorderLevel",
      "unitPrice",
      "supplier",
      "description",
      "unit",
    ];

    const updates = {};

    for (const key of Object.keys(req.body)) {
      if (!allowedFields.includes(key)) {
        return res.status(400).json({
          success: false,
          message: `Field '${key}' cannot be updated`,
        });
      }

      updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    if ("name" in updates) {
      if (typeof updates.name !== "string" || !updates.name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Product name cannot be empty",
        });
      }

      updates.name = updates.name.trim();
    }

    if ("sku" in updates) {
      if (typeof updates.sku !== "string" || !updates.sku.trim()) {
        return res.status(400).json({
          success: false,
          message: "SKU cannot be empty",
        });
      }

      updates.sku = updates.sku.trim().toUpperCase();
    }

    for (const field of [
      "currentStock",
      "dailySales",
      "reorderLevel",
      "unitPrice",
    ]) {
      if (field in updates) {
        const value = Number(updates[field]);

        if (
          updates[field] === null ||
          updates[field] === "" ||
          !Number.isFinite(value) ||
          value < 0
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a valid non-negative number`,
          });
        }

        if (
          ["currentStock", "reorderLevel"].includes(field) &&
          !Number.isInteger(value)
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a whole number`,
          });
        }

        updates[field] = value;
      }
    }

    if ("supplier" in updates) {
      if (updates.supplier === "" || updates.supplier === null) {
        updates.supplier = null;
        updates.supplierName = "";
      } else {
        if (!isValidId(updates.supplier)) {
          return res.status(400).json({
            success: false,
            message: "Invalid supplier ID",
          });
        }

        const supplierRecord = await Supplier.findOne({
          _id: updates.supplier,
          company: companyId,
          isActive: true,
        });

        if (!supplierRecord) {
          return res.status(400).json({
            success: false,
            message: "Supplier not found in your company",
          });
        }

        updates.supplier = supplierRecord._id;
        updates.supplierName = supplierRecord.name;
      }
    }

    if ("category" in updates) {
      updates.category = String(updates.category || "General").trim();
    }

    if ("description" in updates) {
      updates.description = String(updates.description || "").trim();
    }

    if ("unit" in updates) {
      updates.unit = String(updates.unit || "units").trim();
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        company: companyId,
        isActive: true,
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "SKU already exists in your company",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Update product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

// Soft delete product - Admin only
exports.deleteProduct = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only administrators can delete products",
      });
    }

    const { id } = req.params;
    const companyId = getCompanyId(req);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        company: companyId,
        isActive: true,
      },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};

// Dynamic Excel / CSV Upload - Admin only
exports.uploadInventory = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Only administrators can upload inventory data",
      });
    }

    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company information is missing",
      });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Please upload an Excel or CSV file",
      });
    }

    let mapping;
    let columns;

    try {
      mapping = JSON.parse(req.body.mapping || "{}");
      columns = JSON.parse(req.body.columns || "[]");
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid column mapping information",
      });
    }

    if (
      !mapping ||
      typeof mapping !== "object" ||
      Array.isArray(mapping) ||
      !Array.isArray(columns)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid mapping format",
      });
    }

    const requiredFields = ["product", "stock", "dailySales"];

    for (const field of requiredFields) {
      if (
        typeof mapping[field] !== "string" ||
        !mapping[field].trim() ||
        !columns.includes(mapping[field])
      ) {
        return res.status(400).json({
          success: false,
          message: `Valid ${field} column mapping is required`,
        });
      }
    }

    const selectedColumns = Object.values(mapping).filter(Boolean);

    if (new Set(selectedColumns).size !== selectedColumns.length) {
      return res.status(400).json({
        success: false,
        message: "A spreadsheet column cannot map to multiple fields",
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: true,
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: "No worksheet found",
      });
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
      blankrows: false,
    });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Uploaded spreadsheet is empty",
      });
    }

    const actualColumns = Object.keys(rows[0]);

    // Verify that the client mapping matches the uploaded file.
    for (const column of columns) {
      if (!actualColumns.includes(column)) {
        return res.status(400).json({
          success: false,
          message: `Column '${column}' does not exist in uploaded file`,
        });
      }
    }

    const results = {
      totalRows: rows.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;

      try {
        const name = String(row[mapping.product] ?? "").trim();

        const stockValue = row[mapping.stock];
        const salesValue = row[mapping.dailySales];

        const currentStock = Number(stockValue);
        const dailySales = Number(salesValue);

        if (!name) {
          throw new Error("Product name is missing");
        }

        if (
          stockValue === "" ||
          stockValue === null ||
          !Number.isFinite(currentStock) ||
          currentStock < 0
        ) {
          throw new Error("Invalid current stock");
        }

        if (
          salesValue === "" ||
          salesValue === null ||
          !Number.isFinite(dailySales) ||
          dailySales < 0
        ) {
          throw new Error("Invalid daily sales");
        }

        // Use the supplied SKU or generate a unique one.
        const skuValue = mapping.sku
          ? String(row[mapping.sku] ?? "").trim()
          : "";

        const sku = skuValue
          ? skuValue.toUpperCase()
          : `IMP-${new mongoose.Types.ObjectId()
              .toString()
              .slice(-10)
              .toUpperCase()}`;

        const category = mapping.category
          ? String(row[mapping.category] || "General").trim()
          : "General";

        let unitPrice = 0;

        if (mapping.unitPrice) {
          const priceValue = row[mapping.unitPrice];

          if (priceValue !== "" && priceValue !== null) {
            unitPrice = Number(priceValue);

            if (!Number.isFinite(unitPrice) || unitPrice < 0) {
              throw new Error("Invalid unit price");
            }
          }
        }

        const reorderLevel = mapping.reorderLevel
          ? Number(row[mapping.reorderLevel])
          : 10;

        if (
          !Number.isInteger(reorderLevel) ||
          reorderLevel < 0
        ) {
          throw new Error("Invalid reorder level");
        }

        const supplierName = mapping.supplier
          ? String(row[mapping.supplier] || "").trim()
          : "";

        let supplierId = null;

        if (supplierName) {
          const supplierRecord = await Supplier.findOne({
            company: companyId,
            name: supplierName,
            isActive: true,
          });

          if (supplierRecord) {
            supplierId = supplierRecord._id;
          }
        }

        const existingProduct = await Product.findOne({
          company: companyId,
          sku,
        });

        if (existingProduct) {
          throw new Error(`SKU '${sku}' already exists`);
        }

        await Product.create({
          company: companyId,
          name,
          sku,
          category,
          currentStock,
          dailySales,
          reorderLevel,
          unitPrice,
          supplier: supplierId,
          supplierName,
          originalData: row,
          mappedFields: mapping,
          forecastingReady: false,
        });

        results.imported++;
      } catch (error) {
        results.skipped++;

        results.errors.push({
          rowNumber,
          message: error.message,
        });
      }
    }

    return res.status(200).json({
      success: results.skipped === 0,
      message:
        results.imported > 0
          ? "Inventory upload processing completed"
          : "No records could be imported",
      data: results,
    });
  } catch (error) {
    console.error("Inventory upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload inventory data",
    });
  }
};