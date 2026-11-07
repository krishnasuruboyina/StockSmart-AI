const mongoose = require("mongoose");

const Delivery = require("../models/delivery");
const PurchaseOrder = require("../models/purchaseOrder");
const Product = require("../models/product");
const Supplier = require("../models/supplier");
const Notification = require("../models/notification");

const getCompanyId = (req) =>
  req.user?.company?._id || req.user?.company;

// ==========================================
// GET DELIVERIES
// Admin: View all company deliveries
// Supplier: View own deliveries
// Also repairs old Dispatched orders
// ==========================================

exports.getDeliveries = async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company access required.",
      });
    }

    // Supplier access
    if (req.user.role === "supplier") {
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

      const deliveries = await Delivery.find({
        company: companyId,
        supplier: supplier._id,
      })
        .populate("purchaseOrder")
        .populate("product", "name sku currentStock")
        .populate("supplier", "name supplierId")
        .populate("confirmedBy", "name")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: deliveries.length,
        data: deliveries,
      });
    }

    // Only Admin can view all company deliveries
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    // Find old dispatched orders without Delivery records
    const dispatchedOrders = await PurchaseOrder.find({
      company: companyId,
      status: "Dispatched",
    }).lean();

    // Repair missing Delivery records
    for (const order of dispatchedOrders) {
      if (
        !order.supplier ||
        !order.product ||
        !Number.isInteger(order.quantity) ||
        order.quantity < 1
      ) {
        continue;
      }

      try {
        await Delivery.findOneAndUpdate(
          {
            purchaseOrder: order._id,
          },
          {
            $setOnInsert: {
              company: companyId,
              purchaseOrder: order._id,
              supplier: order.supplier,
              product: order.product,
              orderedQuantity: order.quantity,
              receivedQuantity: 0,
              deliveryStatus: "Dispatched",
              dispatchedAt:
                order.dispatchedAt ||
                order.updatedAt ||
                new Date(),
            },
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );
      } catch (error) {
        // Another request may have created this record simultaneously.
        if (error.code !== 11000) {
          throw error;
        }
      }
    }

    // Fetch all company deliveries
    const deliveries = await Delivery.find({
      company: companyId,
    })
      .populate("purchaseOrder")
      .populate("product", "name sku currentStock")
      .populate("supplier", "name supplierId")
      .populate("confirmedBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries,
    });
  } catch (error) {
    console.error("Get deliveries error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve deliveries.",
    });
  }
};

// ==========================================
// SUPPLIER MARKS ORDER AS DISPATCHED
// Creates Delivery record
// ==========================================

exports.markDeliverySent = async (req, res) => {
  try {
    if (req.user.role !== "supplier") {
      return res.status(403).json({
        success: false,
        message: "Supplier access required.",
      });
    }

    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company access required.",
      });
    }

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

    // Create one Delivery record per Purchase Order
    let delivery;

    try {
      delivery = await Delivery.findOneAndUpdate(
        {
          purchaseOrder: order._id,
        },
        {
          $setOnInsert: {
            company: companyId,
            purchaseOrder: order._id,
            supplier: supplier._id,
            product: order.product,
            orderedQuantity: order.quantity,
            receivedQuantity: 0,
          },
          $set: {
            deliveryStatus: "Dispatched",
            dispatchedAt: new Date(),
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Delivery record already exists for this order.",
        });
      }

      throw error;
    }

    order.status = "Dispatched";
    order.dispatchedAt = new Date();

    await order.save();

    // Notify Admin / request creator
    if (order.createdBy) {
      await Notification.create({
        company: companyId,
        recipient: order.createdBy,
        title: "Delivery Dispatched",
        message: `Supplier ${supplier.name} has dispatched your order.`,
        type: "Delivery",
        relatedId: delivery._id,
        relatedModel: "Delivery",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery marked as dispatched.",
      data: delivery,
    });
  } catch (error) {
    console.error("Mark delivery sent error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark delivery as dispatched.",
    });
  }
};

// ==========================================
// ADMIN CONFIRMS ACTUAL RECEIVED QUANTITY
// Stock increases only after confirmation
// Supports partial deliveries
// ==========================================

exports.confirmDeliveryReceived = async (req, res) => {
  let session;

  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only Admin can confirm deliveries.",
      });
    }

    const companyId = getCompanyId(req);

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company access required.",
      });
    }

    const { receivedQuantity, deliveryNotes } = req.body;

    const quantity = Number(receivedQuantity);

    if (
      receivedQuantity === undefined ||
      receivedQuantity === null ||
      receivedQuantity === "" ||
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid non-negative whole received quantity.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID.",
      });
    }

    session = await mongoose.startSession();

    let result;

    await session.withTransaction(async () => {
      const delivery = await Delivery.findOne({
        _id: req.params.id,
        company: companyId,
      }).session(session);

      if (!delivery) {
        throw new Error("DELIVERY_NOT_FOUND");
      }

      if (
        ![
          "Dispatched",
          "Partially Received",
          "Not Received",
        ].includes(delivery.deliveryStatus)
      ) {
        throw new Error("DELIVERY_NOT_AVAILABLE");
      }

      const remainingQuantity =
        delivery.orderedQuantity - delivery.receivedQuantity;

      if (quantity > remainingQuantity) {
        throw new Error("QUANTITY_EXCEEDS_REMAINING");
      }

      const order = await PurchaseOrder.findOne({
        _id: delivery.purchaseOrder,
        company: companyId,
      }).session(session);

      if (!order) {
        throw new Error("PURCHASE_ORDER_NOT_FOUND");
      }

      const product = await Product.findOne({
        _id: delivery.product,
        company: companyId,
      }).session(session);

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      // Increase stock only by newly confirmed quantity.
      if (quantity > 0) {
        product.currentStock += quantity;
        await product.save({ session });
      }

      // Store cumulative received quantity
      delivery.receivedQuantity += quantity;

      delivery.confirmedBy = req.user._id;
      delivery.confirmedAt = new Date();

      if (deliveryNotes !== undefined) {
        delivery.deliveryNotes = String(deliveryNotes).trim();
      }

      // Update delivery and purchase order statuses
      if (
        delivery.receivedQuantity === delivery.orderedQuantity
      ) {
        delivery.deliveryStatus = "Received";
        order.status = "Received";
      } else if (delivery.receivedQuantity > 0) {
        delivery.deliveryStatus = "Partially Received";
        order.status = "Partially Received";
      } else {
        // Zero quantity received; allow confirmation again later.
        delivery.deliveryStatus = "Not Received";
        order.status = "Dispatched";
      }

      await delivery.save({ session });
      await order.save({ session });

      result = {
        deliveryId: delivery._id,
        orderId: order._id,
        productId: product._id,
        orderedQuantity: delivery.orderedQuantity,
        receivedThisTime: quantity,
        totalReceivedQuantity: delivery.receivedQuantity,
        remainingQuantity:
          delivery.orderedQuantity - delivery.receivedQuantity,
        deliveryStatus: delivery.deliveryStatus,
        newStock: product.currentStock,
        supplierId: delivery.supplier,
      };
    });

    // Notify supplier after successful database transaction.
    const supplier = await Supplier.findOne({
      _id: result.supplierId,
      company: companyId,
    });

    if (supplier?.user) {
      await Notification.create({
        company: companyId,
        recipient: supplier.user,
        title: "Delivery Confirmation Updated",
        message:
          `Admin confirmed ${result.receivedThisTime} units. ` +
          `Total received: ${result.totalReceivedQuantity} ` +
          `of ${result.orderedQuantity}.`,
        type: "Delivery",
        relatedId: result.deliveryId,
        relatedModel: "Delivery",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery confirmation saved successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Delivery confirmation error:", error);

    const errors = {
      DELIVERY_NOT_FOUND: [
        404,
        "Delivery not found.",
      ],
      DELIVERY_NOT_AVAILABLE: [
        400,
        "This delivery is not available for confirmation.",
      ],
      QUANTITY_EXCEEDS_REMAINING: [
        400,
        "Received quantity exceeds the remaining quantity.",
      ],
      PURCHASE_ORDER_NOT_FOUND: [
        404,
        "Purchase order not found.",
      ],
      PRODUCT_NOT_FOUND: [
        404,
        "Product not found.",
      ],
    };

    if (errors[error.message]) {
      return res.status(errors[error.message][0]).json({
        success: false,
        message: errors[error.message][1],
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to confirm delivery.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};