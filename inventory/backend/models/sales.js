const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"]
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number"
      }
    },

    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"]
    },

    saleDate: {
      type: Date,
      required: [true, "Sale date is required"],
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Sale", saleSchema);