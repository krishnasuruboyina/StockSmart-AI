const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company ID is required"],
      index: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number",
      },
    },

    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },

    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },

    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sale creator is required"],
    },

    saleDate: {
      type: Date,
      required: [true, "Sale date is required"],
      default: Date.now,
    },

    // Used only for imported historical sales
    importRowKey: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

saleSchema.index({ company: 1, saleDate: -1 });
saleSchema.index({ company: 1, product: 1 });

// Prevent the same imported row from being inserted twice
saleSchema.index(
  { company: 1, importRowKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      importRowKey: { $type: "string" },
    },
  }
);

module.exports = mongoose.model("Sale", saleSchema);