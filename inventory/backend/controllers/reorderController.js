const Product = require("../models/product");
const PurchaseRequest = require("../models/purchaseRequest");
const Notification = require("../models/notification");
const Company = require("../models/company");

// Check low-stock products and create purchase requests
exports.checkReorderNeeded = async (req, res) => {
  try {
    if (!["admin", "employee"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to run reorder checks",
      });
    }

    const companyId = req.user.company?._id || req.user.company;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company information is missing",
      });
    }

    const products = await Product.find({
      company: companyId,
      isActive: true,
      $expr: {
        $lte: ["$currentStock", "$reorderLevel"],
      },
    }).sort({ currentStock: 1 });

    const reorderItems = [];
    const createdRequests = [];
    const skippedRequests = [];

    for (const product of products) {
      // Check existing open request within this company
      const existingRequest = await PurchaseRequest.findOne({
        company: companyId,
        product: product._id,
        status: { $in: ["Pending", "Approved", "Converted"] },
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

      const quantity = Math.max(1, shortage);
      const totalAmount = quantity * product.unitPrice;

      const purchaseRequest = await PurchaseRequest.create({
        company: companyId,
        product: product._id,
        requestedBy: req.user._id,
        quantity,
        unitPrice: product.unitPrice,
        totalAmount,
        supplier: product.supplier || null,
        reason: "Automatically generated due to low stock",
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

      // Notify company admin if employee triggered the reorder
      const company = await Company.findById(companyId).select("admin");

      const adminId =
        req.user.role === "admin" ? req.user._id : company?.admin;

      if (adminId) {
        await Notification.create({
          company: companyId,
          recipient: adminId,
          title: "Automatic Purchase Request",
          message: `Low stock detected for ${product.name}. A purchase request was generated.`,
          type: "Purchase Request",
          relatedId: purchaseRequest._id,
          relatedModel: "PurchaseRequest",
        });
      }
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