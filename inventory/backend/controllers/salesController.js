const mongoose = require("mongoose");
const crypto = require("crypto");
const XLSX = require("xlsx");

const Sale = require("../models/sales");
const Product = require("../models/product");

// ==========================================
// HELPER: Parse Historical Sales Date
// ==========================================

const parseHistoricalDate = (value) => {
  // Excel may return a JavaScript Date object
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      Date.UTC(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      )
    );
  }

  // Excel serial date
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) return null;

    return new Date(
      Date.UTC(
        parsed.y,
        parsed.m - 1,
        parsed.d
      )
    );
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const dateString = value.trim();

  // YYYY-MM-DD
  let match = dateString.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  );

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(
      Date.UTC(year, month - 1, day)
    );

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  match = dateString.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/
  );

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(
      Date.UTC(year, month - 1, day)
    );

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }

  return null;
};

// ==========================================
// CREATE SALE - ADMIN AND EMPLOYEE
// ==========================================

exports.createSale = async (req, res) => {
  let stockUpdated = false;
  let saleQuantity = 0;
  let productId = null;
  let companyId = null;

  try {
    if (!["admin", "employee"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admins and employees can record sales",
      });
    }

    companyId = req.user.company?._id || req.user.company;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company information is missing",
      });
    }

    const { product, quantity, unitPrice, saleDate } = req.body;

    if (!product || !mongoose.isValidObjectId(product)) {
      return res.status(400).json({
        success: false,
        message: "A valid product ID is required",
      });
    }

    if (
      quantity === undefined ||
      quantity === null ||
      quantity === "" ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive whole number",
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
        message: "Unit price must be a non-negative number",
      });
    }

    if (
      saleDate !== undefined &&
      (typeof saleDate !== "string" ||
        Number.isNaN(Date.parse(saleDate)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid sale date",
      });
    }

    productId = product;
    saleQuantity = Number(quantity);

    // Product must belong to logged-in company
    const existingProduct = await Product.findOne({
      _id: productId,
      company: companyId,
      isActive: true,
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found in your company",
      });
    }

    // Use actual product price
    const actualUnitPrice = existingProduct.unitPrice;
    const totalAmount = saleQuantity * actualUnitPrice;

    // Atomically reduce stock
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: productId,
        company: companyId,
        isActive: true,
        currentStock: { $gte: saleQuantity },
      },
      {
        $inc: { currentStock: -saleQuantity },
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock for this sale",
        availableStock: existingProduct.currentStock,
      });
    }

    stockUpdated = true;

    const sale = await Sale.create({
      company: companyId,
      product: productId,
      quantity: saleQuantity,
      unitPrice: actualUnitPrice,
      totalAmount,
      soldBy: req.user._id,
      ...(saleDate !== undefined && {
        saleDate: new Date(saleDate),
      }),
    });

    stockUpdated = false;

    return res.status(201).json({
      success: true,
      message: "Sale recorded successfully",
      remainingStock: updatedProduct.currentStock,
      data: sale,
    });
  } catch (error) {
    // Restore stock if sale creation fails
    if (stockUpdated && productId && companyId) {
      await Product.updateOne(
        {
          _id: productId,
          company: companyId,
        },
        {
          $inc: { currentStock: saleQuantity },
        }
      ).catch((rollbackError) => {
        console.error(
          "Stock rollback failed:",
          rollbackError.message
        );
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Create sale error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to record sale",
    });
  }
};

// ==========================================
// IMPORT HISTORICAL SALES - ADMIN ONLY
// ==========================================

exports.uploadHistoricalSales = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can upload historical sales",
      });
    }

    const companyId =
      req.user.company?._id || req.user.company;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company information is missing",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an Excel or CSV file",
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
        message: "The uploaded file has no worksheet",
      });
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: true,
    });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "The uploaded file contains no sales records",
      });
    }

    // Read values using column aliases
    const getValue = (row, aliases) => {
      const normalized = {};

      Object.keys(row).forEach((key) => {
        normalized[key.trim().toLowerCase()] = row[key];
      });

      for (const alias of aliases) {
        if (normalized[alias.toLowerCase()] !== undefined) {
          return normalized[alias.toLowerCase()];
        }
      }

      return "";
    };

    // Fetch only current company's products
    const products = await Product.find({
      company: companyId,
      isActive: true,
    }).select("_id sku name unitPrice");

    const productMap = new Map();

    products.forEach((product) => {
      if (product.sku) {
        productMap.set(
          String(product.sku).trim().toLowerCase(),
          product
        );
      }
    });

    const imported = [];
    const errors = [];
    const seenInFile = new Set();

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;

      try {
        const sku = String(
          getValue(row, [
            "sku",
            "product sku",
            "item code",
            "product code",
          ])
        ).trim();

        const productName = String(
          getValue(row, [
            "product",
            "product name",
            "item name",
          ])
        ).trim();

        const quantityValue = getValue(row, [
          "quantity sold",
          "quantity",
          "qty",
          "sales quantity",
        ]);

        const dateValue = getValue(row, [
          "date",
          "sale date",
          "sales date",
          "transaction date",
        ]);

        const priceValue = getValue(row, [
          "unit price",
          "selling price",
          "price",
        ]);

        if (!sku && !productName) {
          throw new Error(
            "Product SKU or Product Name is required"
          );
        }

        const product = sku
          ? productMap.get(sku.toLowerCase())
          : products.find(
              (item) =>
                item.name.trim().toLowerCase() ===
                productName.toLowerCase()
            );

        if (!product) {
          throw new Error(
            `Product not found in your company: ${sku || productName}`
          );
        }

        const quantity = Number(quantityValue);

        if (
          !Number.isInteger(quantity) ||
          quantity < 1
        ) {
          throw new Error(
            "Quantity must be a positive whole number"
          );
        }

        // Parse Excel/CSV date correctly
        const parsedDate = parseHistoricalDate(dateValue);

        if (!parsedDate) {
          throw new Error(
            "Invalid sale date. Use DD-MM-YYYY or YYYY-MM-DD format."
          );
        }

        // Compare calendar dates to avoid time-zone issues
        const today = new Date();

        const todayUTC = Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        );

        if (parsedDate.getTime() > todayUTC) {
          throw new Error(
            "Future sale dates are not allowed"
          );
        }

        // Use current product price only as an estimate
        const unitPrice =
          priceValue === "" || priceValue === null
            ? Number(product.unitPrice)
            : Number(priceValue);

        if (
          !Number.isFinite(unitPrice) ||
          unitPrice < 0
        ) {
          throw new Error(
            "Unit price must be a valid non-negative number"
          );
        }

        const totalAmount = quantity * unitPrice;

        // Duplicate fingerprint
        const rowKey = crypto
          .createHash("sha256")
          .update(
            [
              String(companyId),
              String(product._id),
              parsedDate.toISOString(),
              quantity,
              unitPrice,
            ].join("|")
          )
          .digest("hex");

        if (seenInFile.has(rowKey)) {
          throw new Error(
            "Duplicate row in uploaded file"
          );
        }

        seenInFile.add(rowKey);

        imported.push({
          company: companyId,
          product: product._id,
          quantity,
          unitPrice,
          totalAmount,
          saleDate: parsedDate,
          soldBy: req.user._id,
          importRowKey: rowKey,
        });
      } catch (rowError) {
        errors.push({
          row: rowNumber,
          message: rowError.message,
        });
      }
    }

    let insertedCount = 0;
    let duplicateCount = 0;

    if (imported.length) {
      try {
        const result = await Sale.insertMany(
          imported,
          {
            ordered: false,
          }
        );

        insertedCount = result.length;
      } catch (insertError) {
        if (insertError.insertedDocs) {
          insertedCount =
            insertError.insertedDocs.length;
        }

        const writeErrors =
          insertError.writeErrors || [];

        duplicateCount = writeErrors.filter(
          (item) => item.code === 11000
        ).length;

        writeErrors
          .filter((item) => item.code !== 11000)
          .forEach((item) => {
            errors.push({
              row: "Unknown",
              message:
                item.errmsg || "Failed to import row",
            });
          });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Historical sales import completed",
      summary: {
        totalRows: rows.length,
        imported: insertedCount,
        duplicates: duplicateCount,
        skipped: errors.length,
      },
      errors,
      note:
        "Historical imports do not change current inventory stock. Missing historical prices use the current product price as an estimate. Imported by the logged-in admin.",
    });
  } catch (error) {
    console.error(
      "Historical sales import error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to import historical sales",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL SALES - ADMIN AND EMPLOYEE
// ==========================================

exports.getSales = async (req, res) => {
  try {
    if (!["admin", "employee"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view sales",
      });
    }

    const companyId =
      req.user.company?._id || req.user.company;

    const sales = await Sale.find({
      company: companyId,
    })
      .populate("product", "name sku")
      .populate("soldBy", "name employeeId role")
      .sort({ saleDate: -1 });

    return res.status(200).json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    console.error("Get sales error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales",
    });
  }
};

// ==========================================
// GET ONE SALE BY ID - ADMIN AND EMPLOYEE
// ==========================================

exports.getSaleById = async (req, res) => {
  try {
    if (!["admin", "employee"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this sale",
      });
    }

    const { id } = req.params;

    const companyId =
      req.user.company?._id || req.user.company;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale ID",
      });
    }

    const sale = await Sale.findOne({
      _id: id,
      company: companyId,
    })
      .populate("product", "name sku")
      .populate("soldBy", "name employeeId role");

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error("Get sale error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sale",
    });
  }
};