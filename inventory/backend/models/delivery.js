const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    orderedQuantity: {
      type: Number,
      required: true,
      min: 1,
    },

    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryStatus: {
      type: String,
      enum: [
        "Pending",
        "Dispatched",
        "Partially Received",
        "Received",
        "Not Received",
      ],
      default: "Pending",
    },

    dispatchedAt: {
      type: Date,
      default: null,
    },

    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    deliveryNotes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

deliverySchema.index(
  { purchaseOrder: 1 },
  { unique: true }
);

deliverySchema.index({ company: 1, deliveryStatus: 1 });

module.exports = mongoose.model("Delivery", deliverySchema);