const mongoose = require("mongoose");

const Sale = require("../models/sales");
const Product = require("../models/product");
const Supplier = require("../models/supplier");
const PurchaseRequest = require("../models/purchaseRequest");
const PurchaseOrder = require("../models/purchaseOrder");
const Notification = require("../models/notification");
const Company = require("../models/company");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_HISTORY_DAYS = 35;

// Get product sales history and actual date coverage
const getWeeklySales = async (productId, companyId) => {
  // Find earliest and latest actual sale dates
  const dateRange = await Sale.aggregate([
    {
      $match: {
        product: productId,
        company: companyId,
      },
    },
    {
      $group: {
        _id: null,
        firstSaleDate: { $min: "$saleDate" },
        lastSaleDate: { $max: "$saleDate" },
        totalRecords: { $sum: 1 },
      },
    },
  ]);

  if (!dateRange.length) {
    return {
      sales: [],
      availableDays: 0,
      firstSaleDate: null,
      lastSaleDate: null,
    };
  }

  const {
    firstSaleDate,
    lastSaleDate,
  } = dateRange[0];

  // Count inclusive calendar days
  const firstDay = Date.UTC(
    firstSaleDate.getUTCFullYear(),
    firstSaleDate.getUTCMonth(),
    firstSaleDate.getUTCDate()
  );

  const lastDay = Date.UTC(
    lastSaleDate.getUTCFullYear(),
    lastSaleDate.getUTCMonth(),
    lastSaleDate.getUTCDate()
  );

  const availableDays =
    Math.floor((lastDay - firstDay) / DAY_MS) + 1;

  // Aggregate weekly sales
  const weekly = await Sale.aggregate([
    {
      $match: {
        product: productId,
        company: companyId,
      },
    },
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: "$saleDate",
            unit: "week",
          },
        },
        total: {
          $sum: "$quantity",
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  if (!weekly.length) {
    return {
      sales: [],
      availableDays,
      firstSaleDate,
      lastSaleDate,
    };
  }

  const totalsByWeek = new Map(
    weekly.map((week) => [
      week._id.getTime(),
      week.total,
    ])
  );

  const firstWeek = weekly[0]._id.getTime();
  const lastWeek = weekly[weekly.length - 1]._id.getTime();

  const sales = [];

  for (
    let time = firstWeek;
    time <= lastWeek;
    time += WEEK_MS
  ) {
    sales.push(totalsByWeek.get(time) || 0);
  }

  return {
    sales,
    availableDays,
    firstSaleDate,
    lastSaleDate,
  };
};

const forecastSales = async (req, res) => {
  try {
    if (!["admin", "employee"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to generate forecasts",
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

    const {
      productId,
      createPurchaseRequest = false,
    } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid productId",
      });
    }

    // Product must belong to the logged-in user's company
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

    // Get actual historical sales coverage
    const history = await getWeeklySales(
      product._id,
      companyId
    );

    const {
      sales,
      availableDays,
      firstSaleDate,
      lastSaleDate,
    } = history;

    // Require at least 35 calendar days of actual history
    if (availableDays < MIN_HISTORY_DAYS) {
      return res.status(400).json({
        success: false,
        message: `At least ${MIN_HISTORY_DAYS} calendar days of sales history are required`,
        availableDays,
        requiredDays: MIN_HISTORY_DAYS,
        firstSaleDate,
        lastSaleDate,
      });
    }

    if (sales.length < 5) {
      return res.status(400).json({
        success: false,
        message: "At least 5 weekly sales buckets are required",
        availableWeeks: sales.length,
        availableDays,
      });
    }

    // Call ML forecasting service
    const mlServiceUrl =
      process.env.ML_SERVICE_URL ||
      "http://127.0.0.1:8000";

    const response = await fetch(
      `${mlServiceUrl}/predict`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sales,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    let result;

    try {
      result = await response.json();
    } catch {
      return res.status(502).json({
        success: false,
        message: "ML service returned an invalid response",
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "ML service failed to generate a forecast",
      });
    }

    const prediction = Number(
      result.predictedNextPeriodDemand
    );

    if (
      !Number.isFinite(prediction) ||
      prediction < 0
    ) {
      return res.status(502).json({
        success: false,
        message: "ML service returned an invalid prediction",
      });
    }

    const forecastDemand = Math.ceil(prediction);

    // Get supplier lead time
    const supplierDoc = product.supplier
      ? await Supplier.findOne({
          _id: product.supplier,
          company: companyId,
          isActive: true,
        })
      : null;

    const leadTimeDays =
      supplierDoc?.leadTimeDays ?? 7;

    const leadTimeWeeks = Math.max(
      leadTimeDays / 7,
      1 / 7
    );

    const demandDuringLeadTime = Math.ceil(
      prediction * leadTimeWeeks
    );

    const mae = Number(result.validationMAE) || 0;

    const safetyStock = Math.ceil(
      mae * Math.sqrt(leadTimeWeeks)
    );

    // Incoming stock from open purchase requests
    const requestIncoming =
      await PurchaseRequest.aggregate([
        {
          $match: {
            company: companyId,
            product: product._id,
            status: {
              $in: ["Pending", "Approved"],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$quantity",
            },
          },
        },
      ]);

    // Incoming stock from purchase orders
    const orderIncoming =
      await PurchaseOrder.aggregate([
        {
          $match: {
            company: companyId,
            product: product._id,
            status: {
              $in: [
                "Pending",
                "Accepted",
                "Dispatched",
                "Partially Received",
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$quantity",
            },
          },
        },
      ]);

    // Converted requests must not be counted twice
    const convertedRequestIncoming =
      await PurchaseRequest.aggregate([
        {
          $match: {
            company: companyId,
            product: product._id,
            status: "Converted",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$quantity",
            },
          },
        },
      ]);

    const requestTotal =
      requestIncoming[0]?.total || 0;

    const orderTotal =
      orderIncoming[0]?.total || 0;

    const convertedTotal =
      convertedRequestIncoming[0]?.total || 0;

    const incomingStock =
      requestTotal +
      Math.max(0, orderTotal - convertedTotal);

    // Suggested order quantity
    const quantity = Math.max(
      0,
      demandDuringLeadTime +
        safetyStock -
        product.currentStock -
        incomingStock
    );

    const orderCalculation = {
      forecastPeriod: "week",
      leadTimeDays,
      demandDuringLeadTime,
      safetyStock,
      incomingStock,
      currentStock: product.currentStock,
      suggestedQuantity: quantity,
    };

    // Common forecast response
    const forecastResponse = {
      success: true,
      productId: product._id,
      productName: product.name,
      currentStock: product.currentStock,
      forecastDemand,
      predictedNextPeriodDemand: prediction,
      orderCalculation,
      history: {
        availableDays,
        requiredDays: MIN_HISTORY_DAYS,
        availableWeeks: sales.length,
        firstSaleDate,
        lastSaleDate,
      },
      purchaseRequestCreated: false,
      message: "Demand forecast generated successfully",
      ...result,
    };

    // Forecast-only mode
    if (createPurchaseRequest !== true) {
      return res.status(200).json(
        forecastResponse
      );
    }

    // Check for existing open request or order
    const existingRequest =
      await PurchaseRequest.findOne({
        company: companyId,
        product: product._id,
        status: {
          $in: ["Pending", "Approved", "Converted"],
        },
      });

    if (existingRequest) {
      return res.status(200).json({
        ...forecastResponse,
        existingRequestId: existingRequest._id,
        message: "An open purchase request already exists",
      });
    }

    if (quantity === 0) {
      return res.status(200).json({
        ...forecastResponse,
        message:
          "Current and incoming stock cover the expected demand",
      });
    }

    // Only employees should create purchase requests
    if (req.user.role !== "employee") {
      return res.status(403).json({
        success: false,
        message: "Only employees can create purchase requests from forecasts",
      });
    }

    const purchaseRequest =
      await PurchaseRequest.create({
        company: companyId,
        product: product._id,
        requestedBy: req.user._id,
        quantity,
        unitPrice: product.unitPrice,
        totalAmount: quantity * product.unitPrice,
        supplier: product.supplier || null,
        reason: "AI forecast generated purchase request",
        status: "Pending",
      });

    // Notify company admin
    const company = await Company.findById(
      companyId
    ).select("admin");

    const adminId = company?.admin;

    if (adminId) {
      await Notification.create({
        company: companyId,
        recipient: adminId,
        title: "AI Forecast Purchase Request",
        message: `AI forecast suggested ${quantity} units of ${product.name}`,
        type: "Purchase Request",
        relatedId: purchaseRequest._id,
        relatedModel: "PurchaseRequest",
      });
    }

    return res.status(201).json({
      ...forecastResponse,
      purchaseRequestCreated: true,
      purchaseRequest: {
        requestId: purchaseRequest._id,
        quantity: purchaseRequest.quantity,
        unitPrice: purchaseRequest.unitPrice,
        totalAmount: purchaseRequest.totalAmount,
        supplier: purchaseRequest.supplier,
        status: purchaseRequest.status,
      },
      message: "Purchase request created successfully",
    });
  } catch (error) {
    console.error("Forecast error:", error);

    return res.status(503).json({
      success: false,
      message: "Could not generate forecast or purchase request",
    });
  }
};

module.exports = { forecastSales };