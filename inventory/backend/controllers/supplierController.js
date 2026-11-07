const Supplier = require("../models/supplier");
const User = require("../models/user");
const Company = require("../models/company");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// Generate unique Supplier ID (internal use only)
const generateSupplierId = () => {
  return "SUP-" + crypto.randomBytes(3).toString("hex").toUpperCase();
};

// ==========================================
// CREATE SUPPLIER - ADMIN ONLY
// ==========================================

exports.createSupplier = async (req, res) => {
  try {
    if (req.user.role !== "admin" || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Only Admin can create suppliers.",
      });
    }

    const {
      name,
      email,
      phone,
      address,
      leadTimeDays,
      password,
    } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !phone?.trim() ||
      !address?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all supplier details.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const companyId = req.user.company._id || req.user.company;

    const company = await Company.findOne({
      _id: companyId,
      admin: req.user._id,
      isActive: true,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "Company access denied.",
      });
    }

    // Generate unique Supplier ID inside company
    let supplierId;
    let existingSupplier;

    do {
      supplierId = generateSupplierId();

      existingSupplier = await Supplier.findOne({
        company: company._id,
        supplierId,
      });
    } while (existingSupplier);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create supplier profile
    const supplier = await Supplier.create({
      company: company._id,
      name: name.trim(),
      supplierId,
      email: normalizedEmail,
      phone: phone.trim(),
      address: address.trim(),
      leadTimeDays: leadTimeDays ?? 7,
    });

    try {
      // Create supplier login account using EMAIL
      const supplierUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "supplier",
        company: company._id,
        supplierId,
        createdBy: req.user._id,
        isActive: true,
      });

      supplier.user = supplierUser._id;
      await supplier.save();

    } catch (accountError) {
      await Supplier.findByIdAndDelete(supplier._id);
      throw accountError;
    }

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully.",
      data: {
        id: supplier._id,
        name: supplier.name,
        supplierId: supplier.supplierId,
        email: normalizedEmail,
        phone: supplier.phone,
        address: supplier.address,
        leadTimeDays: supplier.leadTimeDays,
        isActive: supplier.isActive,
        companyId: company.companyId,
      },
    });

  } catch (error) {
    console.error("Create supplier error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or Supplier ID already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create supplier.",
    });
  }
};

// ==========================================
// GET SUPPLIERS - COMPANY WISE
// ==========================================

exports.getSuppliers = async (req, res) => {
  try {
    if (req.user.role !== "admin" || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const companyId = req.user.company._id || req.user.company;

    const company = await Company.findOne({
      _id: companyId,
      admin: req.user._id,
      isActive: true,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    const suppliers = await Supplier.find({
      company: company._id,
    })
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    const supplierList = suppliers.map((supplier) => ({
      ...supplier,
      companyId: company.companyId,
    }));

    return res.status(200).json({
      success: true,
      count: supplierList.length,
      data: supplierList,
    });

  } catch (error) {
    console.error("Get suppliers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve suppliers.",
    });
  }
};

// ==========================================
// UPDATE SUPPLIER - ADMIN ONLY
// ==========================================

exports.updateSupplier = async (req, res) => {
  try {
    if (req.user.role !== "admin" || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const {
      name,
      email,
      phone,
      address,
      leadTimeDays,
      isActive,
    } = req.body;

    const companyId = req.user.company._id || req.user.company;

    const company = await Company.findOne({
      _id: companyId,
      admin: req.user._id,
      isActive: true,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "Company access denied.",
      });
    }

    const supplier = await Supplier.findOne({
      _id: req.params.id,
      company: company._id,
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Supplier name cannot be empty.",
        });
      }

      supplier.name = name.trim();
    }

    if (email !== undefined) {
      supplier.email = email.trim().toLowerCase();
    }

    if (phone !== undefined) {
      supplier.phone = phone.trim();
    }

    if (address !== undefined) {
      supplier.address = address.trim();
    }

    if (leadTimeDays !== undefined) {
      const days = Number(leadTimeDays);

      if (!Number.isFinite(days) || days < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid lead time.",
        });
      }

      supplier.leadTimeDays = days;
    }

    if (isActive !== undefined) {
      supplier.isActive = isActive;
    }

    await supplier.save();

    // Sync linked login account
    if (supplier.user) {
      const userUpdates = {};

      if (name !== undefined) {
        userUpdates.name = supplier.name;
      }

      if (email !== undefined) {
        userUpdates.email = supplier.email;
      }

      if (isActive !== undefined) {
        userUpdates.isActive = isActive;
      }

      if (Object.keys(userUpdates).length > 0) {
        await User.updateOne(
          {
            _id: supplier.user,
            company: company._id,
            role: "supplier",
          },
          {
            $set: userUpdates,
          }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully.",
      data: {
        ...supplier.toObject(),
        companyId: company.companyId,
      },
    });

  } catch (error) {
    console.error("Update supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update supplier.",
    });
  }
};

// ==========================================
// DEACTIVATE SUPPLIER - BACKEND ONLY
// ==========================================

exports.deleteSupplier = async (req, res) => {
  try {
    if (req.user.role !== "admin" || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const companyId = req.user.company._id || req.user.company;

    const company = await Company.findOne({
      _id: companyId,
      admin: req.user._id,
      isActive: true,
    });

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "Company access denied.",
      });
    }

    const supplier = await Supplier.findOne({
      _id: req.params.id,
      company: company._id,
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    supplier.isActive = false;
    await supplier.save();

    if (supplier.user) {
      await User.updateOne(
        {
          _id: supplier.user,
          company: company._id,
          role: "supplier",
        },
        {
          $set: { isActive: false },
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Supplier deactivated successfully.",
    });

  } catch (error) {
    console.error("Deactivate supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate supplier.",
    });
  }
};