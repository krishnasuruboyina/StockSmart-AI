const mongoose = require("mongoose");
const Sale = require("../models/sales");
const Product = require("../models/product");
const Supplier = require("../models/supplier");
const PurchaseRequest = require("../models/purchaseRequest");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Convert sales records into continuous weekly totals (missing weeks = 0)
const getWeeklySales = async (productObjectId) => {
  const weekly = await Sale.aggregate([
    { $match: { product: productObjectId } },
    {
      $group: {
        _id: { $dateTrunc: { date: "$saleDate", unit: "week" } },
        total: { $sum: "$quantity" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  if (weekly.length === 0) {
    return [];
  }

  const totalsByWeek = new Map(
    weekly.map((week) => [week._id.getTime(), week.total])
  );

  const first = weekly[0]._id.getTime();
  const last = weekly[weekly.length - 1]._id.getTime();
  const series = [];

  for (let time = first; time <= last; time += WEEK_MS) {
    series.push(totalsByWeek.get(time) || 0);
  }

  return series;
};

const forecastSales = async (req, res) => {
  try {
    const { productId, createPurchaseRequest = false } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid productId",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const sales = await getWeeklySales(product._id);

    if (sales.length < 5) {
      return res.status(400).json({
        success: false,
        message: "At least 5 weeks of sales history are required",
        availableWeeks: sales.length,
      });
    }

    const mlServiceUrl =
      process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

    const response = await fetch(`${mlServiceUrl}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sales }),
      signal: AbortSignal.timeout(10000),
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(result);
    }

    const prediction = Number(result.predictedNextPeriodDemand);

    if (!Number.isFinite(prediction) || prediction < 0) {
      return res.status(502).json({
        success: false,
        message: "ML service returned an invalid prediction",
      });
    }

    const forecastDemand = Math.ceil(prediction);

    // ---- Order quantity calculation ----

    // Supplier lead time (product.supplier stores the supplier name)
    const supplierDoc = product.supplier
      ? await Supplier.findOne({ name: product.supplier })
      : null;
    const leadTimeDays = supplierDoc ? supplierDoc.leadTimeDays : 7;
    const leadTimeWeeks = Math.max(leadTimeDays / 7, 1 / 7);

    // Demand expected until the new stock arrives (forecast is per week)
    const demandDuringLeadTime = Math.ceil(prediction * leadTimeWeeks);

    // Simple safety stock based on forecast error (MAE)
    const mae = Number(result.validationMAE) || 0;
    const safetyStock = Math.ceil(mae * Math.sqrt(leadTimeWeeks));

    // Stock already ordered but not yet received
    const incomingAgg = await PurchaseRequest.aggregate([
      {
        $match: {
          product: product._id,
          status: { $in: ["Pending", "Approved"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$quantity" } } },
    ]);
    const incomingStock = incomingAgg[0] ? incomingAgg[0].total : 0;

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

    // Forecast-only mode is the default.
    if (createPurchaseRequest !== true) {
      return res.status(200).json({
        success: true,
        productId,
        productName: product.name,
        currentStock: product.currentStock,
        forecastDemand,
        orderCalculation,
        purchaseRequestCreated: false,
        message: "Demand forecast generated successfully",
        ...result,
      });
    }

    // Avoid duplicate pending requests.
    const existingRequest = await PurchaseRequest.findOne({
      product: product._id,
      status: "Pending",
    });

    if (existingRequest) {
      return res.status(200).json({
        success: true,
        productId,
        forecastDemand,
        orderCalculation,
        purchaseRequestCreated: false,
        existingRequestId: existingRequest._id,
        message: "A pending purchase request already exists",
        ...result,
      });
    }

    if (quantity === 0) {
      return res.status(200).json({
        success: true,
        productId,
        forecastDemand,
        currentStock: product.currentStock,
        orderCalculation,
        purchaseRequestCreated: false,
        message: "Current and incoming stock cover the expected demand",
        ...result,
      });
    }

    const purchaseRequest = await PurchaseRequest.create({
      product: product._id,
      quantity,
      unitPrice: product.unitPrice,
      totalAmount: quantity * product.unitPrice,
      supplier: product.supplier,
      status: "Pending",
    });

    return res.status(201).json({
      success: true,
      productId,
      productName: product.name,
      currentStock: product.currentStock,
      forecastDemand,
      orderCalculation,
      purchaseRequestCreated: true,
      purchaseRequest: {
        requestId: purchaseRequest._id,
        quantity: purchaseRequest.quantity,
        unitPrice: purchaseRequest.unitPrice,
        totalAmount: purchaseRequest.totalAmount,
        supplier: purchaseRequest.supplier,
        status: purchaseRequest.status,
      },
      ...result,
    });
  } catch (error) {
    console.error("Forecast error:", error.message);

    return res.status(503).json({
      success: false,
      message: "Could not generate forecast or purchase request",
    });
  }
};

module.exports = { forecastSales };
