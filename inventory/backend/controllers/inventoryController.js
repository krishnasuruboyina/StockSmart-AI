const Product = require("../models/product");

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products"
    });
  }
};

// Add product with validation
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      currentStock,
      reorderLevel,
      unitPrice
    } = req.body;

    // Check product name
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required"
      });
    }

    // Check SKU
    if (typeof sku !== "string" || !sku.trim()) {
      return res.status(400).json({
        success: false,
        message: "SKU is required"
      });
    }

    // Check current stock
    if (
      currentStock === undefined ||
      currentStock === null ||
      currentStock === "" ||
      !Number.isFinite(Number(currentStock)) ||
      Number(currentStock) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Current stock must be a valid non-negative number"
      });
    }

    // Check unit price
    if (
      unitPrice === undefined ||
      unitPrice === null ||
      unitPrice === "" ||
      !Number.isFinite(Number(unitPrice)) ||
      Number(unitPrice) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Unit price must be a valid non-negative number"
      });
    }

    // Check reorder level when provided
    if (
      reorderLevel !== undefined &&
      (
        reorderLevel === null ||
        reorderLevel === "" ||
        !Number.isFinite(Number(reorderLevel)) ||
        Number(reorderLevel) < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Reorder level must be a valid non-negative number"
      });
    }

    // Check duplicate SKU
    const existingProduct = await Product.findOne({
      sku: sku.trim()
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "SKU already exists"
      });
    }

    // Create product
    const product = await Product.create({
      ...req.body,
      name: name.trim(),
      sku: sku.trim(),
      currentStock: Number(currentStock),
      unitPrice: Number(unitPrice),
      ...(reorderLevel !== undefined && {
        reorderLevel: Number(reorderLevel)
      })
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "SKU already exists"
      });
    }

    if (error.name === "ValidationError" ||
        error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error("Create product error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get one product
exports.getProductById = async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product"
    });
  }
};

// Update product with validation
exports.updateProduct = async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const allowedFields = [
      "name",
      "sku",
      "category",
      "currentStock",
      "reorderLevel",
      "unitPrice",
      "supplier"
    ];

    const updates = {};

    for (const key of Object.keys(req.body)) {
      if (!allowedFields.includes(key)) {
        return res.status(400).json({
          success: false,
          message: `Field '${key}' cannot be updated`
        });
      }

      updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update"
      });
    }

    if (
      "name" in updates &&
      (typeof updates.name !== "string" || !updates.name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Product name cannot be empty"
      });
    }

    if (
      "sku" in updates &&
      (typeof updates.sku !== "string" || !updates.sku.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "SKU cannot be empty"
      });
    }

    if ("name" in updates) {
      updates.name = updates.name.trim();
    }

    if ("sku" in updates) {
      updates.sku = updates.sku.trim();
    }

    for (const field of [
      "currentStock",
      "reorderLevel",
      "unitPrice"
    ]) {
      if (field in updates) {
        const value = updates[field];

        if (
          value === null ||
          value === "" ||
          !Number.isFinite(Number(value)) ||
          Number(value) < 0
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a valid non-negative number`
          });
        }

        updates[field] = Number(value);
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "SKU already exists"
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error("Update product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product"
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product"
    });
  }
};