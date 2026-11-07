const mongoose = require("mongoose");

const PurchaseRequest = require("../models/purchaseRequest");
const PurchaseOrder = require("../models/purchaseOrder");
const Product = require("../models/product");
const Supplier = require("../models/supplier");
const Notification = require("../models/notification");
const Company = require("../models/company");

// Create purchase request - Admin or Employee
exports.createPurchaseRequest = async (req, res) => {
  try {
    if (!["admin", "employee"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admins and employees can create purchase requests",
      });
    }

    const { productId, quantity, reason } = req.body;
    const companyId = req.user.company?._id || req.user.company;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company information is missing",
      });
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid productId",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive whole number",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      company: companyId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found in your company",
      });
    }

    const totalAmount = quantity * product.unitPrice;

    const request = await PurchaseRequest.create({
      company: companyId,
      product: product._id,
      requestedBy: req.user._id,
      quantity,
      unitPrice: product.unitPrice,
      totalAmount,
      supplier: product.supplier || null,
      reason: reason ? String(reason).trim() : "",
    });

    let adminId = req.user._id;

    if (req.user.role !== "admin") {
      const company = await Company.findById(companyId).select("admin");
      adminId = company?.admin;
    }

    if (adminId) {
      await Notification.create({
        company: companyId,
        recipient: adminId,
        title: "New Purchase Request",
        message: `${req.user.name} requested ${quantity} units of ${product.name}`,
        type: "Purchase Request",
        relatedId: request._id,
        relatedModel: "PurchaseRequest",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Purchase request created successfully",
      data: request,
    });
  } catch (error) {
    console.error("Create purchase request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create purchase request",
    });
  }
};

// Get purchase requests
exports.getPurchaseRequests = async (req, res) => {
  try {
    const companyId = req.user.company?._id || req.user.company;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company information is missing",
      });
    }

    const filter = {
      company: companyId,
    };

    if (req.user.role === "employee") {
      filter.requestedBy = req.user._id;
    }

    const requests = await PurchaseRequest.find(filter)
      .populate("product", "name sku currentStock reorderLevel")
      .populate("requestedBy", "name employeeId role")
      .populate("supplier", "name supplierId")
      .populate("reviewedBy", "name")
      .sort({ requestedAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get purchase requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase requests",
    });
  }
};

// Admin approves or rejects a pending request
// Approval automatically creates a Purchase Order
exports.updatePurchaseRequestStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can review purchase requests",
      });
    }

    const { status, rejectionReason } = req.body;
    const { id } = req.params;

    const companyId =
      req.user.company?._id || req.user.company;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company information is missing",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase request ID",
      });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved or Rejected",
      });
    }

    const request = await PurchaseRequest.findOne({
      _id: id,
      company: companyId,
      status: "Pending",
    });

    if (!request) {
      const exists = await PurchaseRequest.exists({
        _id: id,
        company: companyId,
      });

      return res.status(exists ? 400 : 404).json({
        success: false,
        message: exists
          ? "Only pending requests can be reviewed"
          : "Purchase request not found",
      });
    }

    // Reject request
    if (status === "Rejected") {
      request.status = "Rejected";
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      request.rejectionReason = String(
        rejectionReason || ""
      ).trim();

      await request.save();

      await Notification.create({
        company: companyId,
        recipient: request.requestedBy,
        title: "Purchase Request Rejected",
        message: `Your purchase request was rejected. ${request.rejectionReason}`,
        type: "Purchase Request",
        relatedId: request._id,
        relatedModel: "PurchaseRequest",
      });

      return res.status(200).json({
        success: true,
        message: "Purchase request rejected successfully",
        data: request,
      });
    }

    // Check whether an order already exists
    const existingOrder = await PurchaseOrder.findOne({
      company: companyId,
      purchaseRequest: request._id,
    });

    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: "Purchase order already exists for this request",
        purchaseOrderId: existingOrder._id,
      });
    }

    // Get supplier from the request or assigned product
    const product = await Product.findOne({
      _id: request.product,
      company: companyId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found in your company",
      });
    }

    const supplierId = request.supplier || product.supplier;

    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message:
          "No supplier is assigned to this product. Assign a supplier before approving.",
      });
    }

    const supplier = await Supplier.findOne({
      _id: supplierId,
      company: companyId,
      isActive: true,
    });

    if (!supplier || !supplier.user) {
      return res.status(404).json({
        success: false,
        message: "Active supplier or supplier login account not found",
      });
    }

    // Create Purchase Order
    const purchaseOrder = await PurchaseOrder.create({
      company: companyId,
      purchaseRequest: request._id,
      product: request.product,
      supplier: supplier._id,
      quantity: request.quantity,
      unitPrice: request.unitPrice,
      totalAmount: request.totalAmount,
      createdBy: req.user._id,
    });

    // Update request after Purchase Order creation
    request.supplier = supplier._id;
    request.status = "Converted";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    await request.save();

    // Notify employee
    await Notification.create({
      company: companyId,
      recipient: request.requestedBy,
      title: "Purchase Request Approved",
      message: "Your purchase request was approved and sent to the supplier.",
      type: "Purchase Request",
      relatedId: request._id,
      relatedModel: "PurchaseRequest",
    });

    // Notify supplier
    await Notification.create({
      company: companyId,
      recipient: supplier.user,
      title: "New Purchase Order",
      message: `You have received a purchase order for ${request.quantity} units.`,
      type: "Purchase Order",
      relatedId: purchaseOrder._id,
      relatedModel: "PurchaseOrder",
    });

    return res.status(201).json({
      success: true,
      message:
        "Purchase request approved and purchase order sent to supplier",
      data: {
        request,
        purchaseOrder,
      },
    });
  } catch (error) {
    console.error("Update purchase request status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve or reject purchase request",
      error: error.message,
    });
  }
};

// Stock must NOT be updated here.
// Stock increases only through Admin delivery confirmation.
exports.markPurchaseRequestReceived = async (req, res) => {
  return res.status(410).json({
    success: false,
    message:
      "This workflow is disabled. Please use the delivery confirmation process.",
  });
};