const mongoose = require("mongoose");

const purchaseRequestSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"]
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

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    supplier: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected","Received"],
      default: "Pending"
    },

    requestedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "PurchaseRequest",
  purchaseRequestSchema
);