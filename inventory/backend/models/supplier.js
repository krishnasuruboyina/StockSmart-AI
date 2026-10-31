const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },

    phone: {
      type: String,
      trim: true,
      default: ""
    },

    address: {
      type: String,
      trim: true,
      default: ""
    },

    leadTimeDays: {
      type: Number,
      required: [true, "Supplier lead time is required"],
      min: [0, "Lead time cannot be negative"],
      default: 7
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Supplier", supplierSchema);