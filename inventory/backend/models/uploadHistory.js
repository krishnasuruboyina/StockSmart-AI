const mongoose = require("mongoose");

const uploadHistorySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    fileType: {
      type: String,
      enum: ["CSV", "XLSX", "XLS"],
      required: true,
    },

    totalRecords: {
      type: Number,
      default: 0,
      min: 0,
    },

    successfulRecords: {
      type: Number,
      default: 0,
      min: 0,
    },

    failedRecords: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Processing", "Completed", "Failed"],
      default: "Processing",
    },

    errorMessages: {
      type: [String],
      default: [],
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

uploadHistorySchema.index({
  company: 1,
  uploadedAt: -1,
});

module.exports = mongoose.model(
  "UploadHistory",
  uploadHistorySchema
);