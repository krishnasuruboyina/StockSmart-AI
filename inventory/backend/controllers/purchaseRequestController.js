const mongoose = require("mongoose");
const PurchaseRequest = require("../models/purchaseRequest");
const Product = require("../models/product");

// Create purchase request
exports.createPurchaseRequest = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid productId"
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive whole number"
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const totalAmount = quantity * product.unitPrice;

    const request = await PurchaseRequest.create({
      product: product._id,
      quantity,
      unitPrice: product.unitPrice,
      totalAmount,
      supplier: product.supplier || ""
    });

    return res.status(201).json({
      success: true,
      message: "Purchase request created successfully",
      data: request
    });
  } catch (error) {
    console.error("Create purchase request error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create purchase request"
    });
  }
};

// Get all purchase requests
exports.getPurchaseRequests = async (req, res) => {
  try {
    const requests = await PurchaseRequest.find()
      .populate("product", "name sku currentStock reorderLevel")
      .sort({ requestedAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error("Get purchase requests error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase requests"
    });
  }
};

// Approve or reject a pending request
exports.updatePurchaseRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase request ID"
      });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved or Rejected"
      });
    }

    // Atomic: only a Pending request can change status
    const request = await PurchaseRequest.findOneAndUpdate(
      { _id: req.params.id, status: "Pending" },
      { $set: { status } },
      { new: true }
    );

    if (!request) {
      const exists = await PurchaseRequest.exists({ _id: req.params.id });

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Purchase request not found"
        });
      }

      return res.status(400).json({
        success: false,
        message: "Only pending requests can be updated"
      });
    }

    return res.status(200).json({
      success: true,
      message: `Purchase request ${status.toLowerCase()} successfully`,
      data: request
    });
  } catch (error) {
    console.error("Update purchase request status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update purchase request status"
    });
  }
};

// Mark purchase request as received and update stock
exports.markPurchaseRequestReceived = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase request ID"
      });
    }

    const request = await PurchaseRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Purchase request not found"
      });
    }

    if (request.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved requests can be marked as received"
      });
    }

    const product = await Product.findById(request.product);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Atomically claim the request: only one call can move Approved -> Received
    const claimed = await PurchaseRequest.findOneAndUpdate(
      { _id: id, status: "Approved" },
      { $set: { status: "Received" } },
      { new: true }
    );

    if (!claimed) {
      return res.status(409).json({
        success: false,
        message: "Request was already received or its status changed"
      });
    }

    try {
      const updatedProduct = await Product.findByIdAndUpdate(
        claimed.product,
        { $inc: { currentStock: claimed.quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        throw new Error("Product disappeared during stock update");
      }

      return res.status(200).json({
        success: true,
        message: "Purchase received and stock updated successfully",
        data: {
          requestId: claimed._id,
          productName: updatedProduct.name,
          receivedQuantity: claimed.quantity,
          updatedStock: updatedProduct.currentStock,
          status: claimed.status
        }
      });
    } catch (stockError) {
      // Stock update failed, so put the request back to Approved
      await PurchaseRequest.updateOne(
        { _id: id, status: "Received" },
        { $set: { status: "Approved" } }
      );
      throw stockError;
    }
  } catch (error) {
    console.error("Mark received error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to mark purchase as received"
    });
  }
};
