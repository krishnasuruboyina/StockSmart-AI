const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must contain at least 8 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: ["admin", "employee", "supplier"],
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },

    employeeId: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    supplierId: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    createdBy: {
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

// Admin email must be unique.
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: "admin",
      email: { $type: "string" },
    },
  }
);

// Employee ID must be unique within each company.
userSchema.index(
  { company: 1, employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: "employee",
      employeeId: { $type: "string" },
    },
  }
);

// Supplier ID must be unique within each company.
userSchema.index(
  { company: 1, supplierId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: "supplier",
      supplierId: { $type: "string" },
    },
  }
);

module.exports = mongoose.model("User", userSchema);