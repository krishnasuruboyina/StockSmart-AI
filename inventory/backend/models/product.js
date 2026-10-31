const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    category: {
  type: String,
  trim: true,
  default: "General"
},
    currentStock: {
      type: Number,
      required: true,
      min: 0
    },
    reorderLevel: {
      type: Number,
      default: 10,
      min: 0
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    supplier: {
  type: String,
  trim: true,
  default: ""
}
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);