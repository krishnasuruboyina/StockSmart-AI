const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company ID is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },

    supplierId: {
      type: String,
      required: [true, "Supplier ID is required"],
      uppercase: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    leadTimeDays: {
      type: Number,
      required: [true, "Supplier lead time is required"],
      min: [0, "Lead time cannot be negative"],
      default: 7,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

// Supplier ID unique within each company.
supplierSchema.index(
  { company: 1, supplierId: 1 },
  { unique: true }
);

supplierSchema.index({ company: 1, name: 1 });

module.exports = mongoose.model("Supplier", supplierSchema);