const mongoose = require("mongoose");
const Sale = require("../models/sales");
const Product = require("../models/product");

// Create a sale (also reduces product stock)
exports.createSale = async (req, res) => {
  try {
    const { product, quantity, unitPrice, saleDate } = req.body;

    // Validate product ID
    if (!product || !mongoose.isValidObjectId(product)) {
      return res.status(400).json({
        success: false,
        message: "A valid product ID is required"
      });
    }

    // Validate quantity
    if (
      quantity === undefined ||
      quantity === null ||
      quantity === "" ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive whole number"
      });
    }

    // Validate unit price
    if (
      unitPrice === undefined ||
      unitPrice === null ||
      unitPrice === "" ||
      !Number.isFinite(Number(unitPrice)) ||
      Number(unitPrice) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Unit price must be a non-negative number"
      });
    }

    // Validate sale date if provided
    if (
      saleDate !== undefined &&
      (typeof saleDate !== "string" || Number.isNaN(Date.parse(saleDate)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid sale date"
      });
    }

    // Check whether product exists
    const existingProduct = await Product.findById(product);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const saleQuantity = Number(quantity);

    // Atomically reduce stock only if enough stock is available
    const stockUpdated = await Product.findOneAndUpdate(
      { _id: product, currentStock: { $gte: saleQuantity } },
      { $inc: { currentStock: -saleQuantity } },
      { new: true }
    );

    if (!stockUpdated) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock for this sale",
        availableStock: existingProduct.currentStock
      });
    }

    let sale;

    try {
      sale = await Sale.create({
        product,
        quantity: saleQuantity,
        unitPrice: Number(unitPrice),
        ...(saleDate !== undefined && {
          saleDate: new Date(saleDate)
        })
      });
    } catch (saleError) {
      // Sale save failed, so give the stock back
      await Product.updateOne(
        { _id: product },
        { $inc: { currentStock: saleQuantity } }
      );
      throw saleError;
    }

    return res.status(201).json({
      success: true,
      message: "Sale recorded successfully",
      remainingStock: stockUpdated.currentStock,
      data: sale
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error("Create sale error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to record sale"
    });
  }
};

// Get all sales
exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate("product", "name sku")
      .sort({ saleDate: -1 });

    return res.status(200).json({
      success: true,
      count: sales.length,
      data: sales
    });
  } catch (error) {
    console.error("Get sales error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales"
    });
  }
};

// Get one sale by ID
exports.getSaleById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale ID"
      });
    }

    const sale = await Sale.findById(req.params.id)
      .populate("product", "name sku");

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error("Get sale error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sale"
    });
  }
};
