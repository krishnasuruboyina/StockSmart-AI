const Product = require("../models/product");
const Supplier = require("../models/supplier");
const Sale = require("../models/sales");

// Get dashboard summary
exports.getDashboardSummary = async (req, res) => {
  try {
    const [
      totalProducts,
      totalSuppliers,
      totalSalesRecords,
      lowStockProducts,
      salesSummary
    ] = await Promise.all([
      Product.countDocuments(),
      Supplier.countDocuments(),
      Sale.countDocuments(),

      Product.countDocuments({
        $expr: {
          $lte: ["$currentStock", "$reorderLevel"]
        }
      }),

      Sale.aggregate([
        {
          $group: {
            _id: null,
            totalUnitsSold: { $sum: "$quantity" },
            totalSalesAmount: {
              $sum: {
                $multiply: ["$quantity", "$unitPrice"]
              }
            }
          }
        }
      ])
    ]);

    const summary = salesSummary[0] || {
      totalUnitsSold: 0,
      totalSalesAmount: 0
    };

    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalSuppliers,
        totalSalesRecords,
        lowStockProducts,
        totalUnitsSold: summary.totalUnitsSold,
        totalSalesAmount: summary.totalSalesAmount
      }
    });
  } catch (error) {
    console.error("Dashboard summary error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary"
    });
  }
};