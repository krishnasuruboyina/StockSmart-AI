const Supplier = require("../models/supplier");

// Get all suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    console.error("Get suppliers error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch suppliers"
    });
  }
};

// Create supplier
exports.createSupplier = async (req, res) => {
  try {
    const { name, email, phone, address, leadTimeDays } = req.body;

    // Validate supplier name
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required"
      });
    }

    // Validate email if provided
    if (
      email !== undefined &&
      email !== "" &&
      (typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    // Validate lead time
    if (
      leadTimeDays !== undefined &&
      (
        leadTimeDays === null ||
        leadTimeDays === "" ||
        !Number.isInteger(Number(leadTimeDays)) ||
        Number(leadTimeDays) < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Lead time must be a non-negative whole number"
      });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : "",
      phone: typeof phone === "string" ? phone.trim() : "",
      address: typeof address === "string" ? address.trim() : "",
      leadTimeDays:
        leadTimeDays === undefined ? 7 : Number(leadTimeDays)
    });

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error("Create supplier error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create supplier"
    });
  }
};

// Get supplier by ID
exports.getSupplierById = async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID"
      });
    }

    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error("Get supplier error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch supplier"
    });
  }
};

// Update supplier
exports.updateSupplier = async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID"
      });
    }

    const allowedFields = [
      "name",
      "email",
      "phone",
      "address",
      "leadTimeDays"
    ];

    const updates = {};

    for (const key of Object.keys(req.body)) {
      if (!allowedFields.includes(key)) {
        return res.status(400).json({
          success: false,
          message: `Field '${key}' cannot be updated`
        });
      }

      updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update"
      });
    }

    if (
      "name" in updates &&
      (typeof updates.name !== "string" || !updates.name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Supplier name cannot be empty"
      });
    }

    if ("name" in updates) {
      updates.name = updates.name.trim();
    }

    if ("email" in updates) {
      if (
        typeof updates.email !== "string" ||
        (updates.email.trim() !== "" &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email.trim()))
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address"
        });
      }

      updates.email = updates.email.trim().toLowerCase();
    }

    for (const field of ["phone", "address"]) {
      if (field in updates) {
        if (typeof updates[field] !== "string") {
          return res.status(400).json({
            success: false,
            message: `${field} must be text`
          });
        }

        updates[field] = updates[field].trim();
      }
    }

    if ("leadTimeDays" in updates) {
      if (
        updates.leadTimeDays === null ||
        updates.leadTimeDays === "" ||
        !Number.isInteger(Number(updates.leadTimeDays)) ||
        Number(updates.leadTimeDays) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Lead time must be a non-negative whole number"
        });
      }

      updates.leadTimeDays = Number(updates.leadTimeDays);
    }

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error("Update supplier error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update supplier"
    });
  }
};

// Delete supplier
exports.deleteSupplier = async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID"
      });
    }

    const supplier = await Supplier.findByIdAndDelete(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Supplier deleted successfully"
    });
  } catch (error) {
    console.error("Delete supplier error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete supplier"
    });
  }
};