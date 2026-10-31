const Product = require("../models/product");
const PurchaseRequest = require("../models/purchaseRequest");

// Check low-stock products and automatically create purchase requests
exports.checkReorderNeeded = async (req, res) => {
  try {
    // Find products whose stock is at or below reorder level
    const products = await Product.find({
      $expr: {
        $lte: ["$currentStock", "$reorderLevel"],
      },
    }).sort({ currentStock: 1 });

    const reorderItems = [];
    const createdRequests = [];
    const skippedRequests = [];

    for (const product of products) {
      // Prevent duplicate orders: skip if a request is still open
      const existingRequest = await PurchaseRequest.findOne({
        product: product._id,
        status: { $in: ["Pending", "Approved"] },
      });

      const shortage = Math.max(
        0,
        product.reorderLevel - product.currentStock
      );

      reorderItems.push({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        currentStock: product.currentStock,
        reorderLevel: product.reorderLevel,
        shortage,
        supplier: product.supplier,
        unitPrice: product.unitPrice,
      });

      if (existingRequest) {
        skippedRequests.push({
          product: product.name,
          reason: `A ${existingRequest.status.toLowerCase()} purchase request already exists`,
          requestId: existingRequest._id,
        });

        continue;
      }

      // Order enough to cover the shortage
      const quantity = Math.max(1, shortage);
      const totalAmount = quantity * product.unitPrice;

      const purchaseRequest = await PurchaseRequest.create({
        product: product._id,
        quantity,
        unitPrice: product.unitPrice,
        totalAmount,
        supplier: product.supplier,
        status: "Pending",
      });

      createdRequests.push({
        requestId: purchaseRequest._id,
        productId: product._id,
        productName: product.name,
        quantity,
        unitPrice: product.unitPrice,
        totalAmount,
        status: purchaseRequest.status,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Automatic reorder check completed",
      lowStockCount: reorderItems.length,
      requestsCreated: createdRequests.length,
      requestsSkipped: skippedRequests.length,
      data: reorderItems,
      createdRequests,
      skippedRequests,
    });
  } catch (error) {
    console.error("Automatic reorder error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to process automatic reorder requests",
    });
  }
};
