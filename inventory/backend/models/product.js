const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    sku: {
      type: String,
      required: [true, "SKU is required"],
      trim: true,
      uppercase: true,
    },

    category: {
      type: String,
      trim: true,
      default: "General",
    },

    currentStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    dailySales: {
      type: Number,
      min: 0,
      default: null,
    },

    reorderLevel: {
      type: Number,
      default: 10,
      min: 0,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    supplierName: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    unit: {
      type: String,
      trim: true,
      default: "units",
    },

    // Preserve all original spreadsheet columns and values.
    originalData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Store the confirmed spreadsheet-to-system mapping.
    mappedFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Indicates whether sufficient data is available for forecasting.
    forecastingReady: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index(
  { company: 1, sku: 1 },
  { unique: true }
);

productSchema.index({ company: 1, currentStock: 1 });

module.exports = mongoose.model("Product", productSchema);