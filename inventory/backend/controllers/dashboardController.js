const Product = require("../models/product");
const Supplier = require("../models/supplier");
const Sale = require("../models/sales");

exports.getDashboardSummary = async (req, res) => {
  try {
    if (!["admin", "employee"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view dashboard data",
      });
    }

    const companyId = req.user.company?._id || req.user.company;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company information is missing",
      });
    }

    const [
      totalProducts,
      totalSuppliers,
      totalSalesRecords,
      lowStockProducts,
      salesSummary,
    ] = await Promise.all([
      Product.countDocuments({
        company: companyId,
        isActive: true,
      }),

      Supplier.countDocuments({
        company: companyId,
        isActive: true,
      }),

      Sale.countDocuments({
        company: companyId,
      }),

      Product.countDocuments({
        company: companyId,
        isActive: true,
        $expr: {
          $lte: ["$currentStock", "$reorderLevel"],
        },
      }),

      Sale.aggregate([
        {
          $match: {
            company: companyId,
          },
        },
        {
          $group: {
            _id: null,
            totalUnitsSold: {
              $sum: "$quantity",
            },
            totalSalesAmount: {
              $sum: "$totalAmount",
            },
          },
        },
      ]),
    ]);

    const summary = salesSummary[0] || {
      totalUnitsSold: 0,
      totalSalesAmount: 0,
    };

    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalSuppliers,
        totalSalesRecords,
        lowStockProducts,
        totalUnitsSold: summary.totalUnitsSold,
        totalSalesAmount: summary.totalSalesAmount,
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary",
    });
  }
};