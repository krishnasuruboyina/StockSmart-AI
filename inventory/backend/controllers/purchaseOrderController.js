const PurchaseOrder = require("../models/purchaseOrder");
const PurchaseRequest = require("../models/purchaseRequest");
const Supplier = require("../models/supplier");
const Notification = require("../models/notification");

// Create Purchase Order from approved request - Admin only
exports.createPurchaseOrder = async (req, res) => {
  try {
    if (req.user.role !== "admin" || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Only Admin can create purchase orders.",
      });
    }

    const { purchaseRequestId, supplierId, notes, expectedDeliveryDate } =
      req.body;

    if (!purchaseRequestId || !supplierId) {
      return res.status(400).json({
        success: false,
        message: "Purchase request and supplier are required.",
      });
    }

    const companyId = req.user.company._id || req.user.company;

    const request = await PurchaseRequest.findOne({
      _id: purchaseRequestId,
      company: companyId,
      status: "Approved",
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Approved purchase request not found.",
      });
    }

    const existingOrder = await PurchaseOrder.findOne({
      purchaseRequest: request._id,
      company: companyId,
    });

    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: "Purchase order already exists for this request.",
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
        message: "Active supplier or supplier login account not found.",
      });
    }

    const purchaseOrder = await PurchaseOrder.create({
      company: companyId,
      purchaseRequest: request._id,
      product: request.product,
      supplier: supplier._id,
      quantity: request.quantity,
      unitPrice: request.unitPrice,
      totalAmount: request.totalAmount,
      createdBy: req.user._id,
      notes: notes || "",
      expectedDeliveryDate: expectedDeliveryDate || null,
    });

    request.supplier = supplier._id;
    request.status = "Converted";
    await request.save();

    await Notification.create({
      company: companyId,
      recipient: supplier.user,
      title: "New Purchase Order",
      message: `You have received a new purchase order for ${request.quantity} units.`,
      type: "Purchase Order",
      relatedId: purchaseOrder._id,
      relatedModel: "PurchaseOrder",
    });

    return res.status(201).json({
      success: true,
      message: "Purchase order created and supplier notified.",
      data: purchaseOrder,
    });
  } catch (error) {
    console.error("Create purchase order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create purchase order.",
    });
  }
};

// Get purchase orders
exports.getPurchaseOrders = async (req, res) => {
  try {
    if (!req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Company access required.",
      });
    }

    const companyId = req.user.company._id || req.user.company;
    const filter = { company: companyId };

    if (req.user.role === "supplier") {
      const supplier = await Supplier.findOne({
        company: companyId,
        user: req.user._id,
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier profile not found.",
        });
      }

      filter.supplier = supplier._id;
    } else if (!["admin", "employee"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const orders = await PurchaseOrder.find(filter)
      .populate("product", "name sku category")
      .populate("supplier", "name supplierId email phone")
      .populate("purchaseRequest", "requestedBy requestedAt")
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Get purchase orders error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve purchase orders.",
    });
  }
};

// Supplier accepts or rejects an order
exports.respondToPurchaseOrder = async (req, res) => {
  try {
    if (req.user.role !== "supplier" || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Supplier access required.",
      });
    }

    const { status, notes } = req.body;

    if (!["Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Accepted or Rejected.",
      });
    }

    const companyId = req.user.company._id || req.user.company;

    const supplier = await Supplier.findOne({
      company: companyId,
      user: req.user._id,
      isActive: true,
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier profile not found.",
      });
    }

    const order = await PurchaseOrder.findOne({
      _id: req.params.id,
      company: companyId,
      supplier: supplier._id,
      status: "Pending",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Pending purchase order not found.",
      });
    }

    order.status = status;
    order.supplierResponseAt = new Date();

    if (notes !== undefined) {
      order.notes = notes;
    }

    await order.save();

    await Notification.create({
      company: companyId,
      recipient: order.createdBy,
      title: `Supplier ${status} Purchase Order`,
      message: `Supplier ${supplier.name} has ${status.toLowerCase()} your purchase order.`,
      type: "Supplier Update",
      relatedId: order._id,
      relatedModel: "PurchaseOrder",
    });

    return res.status(200).json({
      success: true,
      message: `Purchase order ${status.toLowerCase()} successfully.`,
      data: order,
    });
  } catch (error) {
    console.error("Supplier response error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update purchase order.",
    });
  }
};

// Supplier marks accepted order as dispatched
exports.markOrderDispatched = async (req, res) => {
  try {
    if (req.user.role !== "supplier" || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Supplier access required.",
      });
    }

    const companyId = req.user.company._id || req.user.company;

    const supplier = await Supplier.findOne({
      company: companyId,
      user: req.user._id,
      isActive: true,
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier profile not found.",
      });
    }

    const order = await PurchaseOrder.findOne({
      _id: req.params.id,
      company: companyId,
      supplier: supplier._id,
      status: "Accepted",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Accepted purchase order not found.",
      });
    }

    order.status = "Dispatched";
    order.dispatchedAt = new Date();

    await order.save();

    await Notification.create({
      company: companyId,
      recipient: order.createdBy,
      title: "Order Dispatched",
      message: `Supplier ${supplier.name} has dispatched your order.`,
      type: "Delivery",
      relatedId: order._id,
      relatedModel: "PurchaseOrder",
    });

    return res.status(200).json({
      success: true,
      message: "Order marked as dispatched.",
      data: order,
    });
  } catch (error) {
    console.error("Dispatch order error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to dispatch order.",
    });
  }
};