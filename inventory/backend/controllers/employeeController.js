const User = require("../models/user");
const Company = require("../models/company");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// Generate unique Employee ID
const generateEmployeeId = () => {
  return "EMP-" + crypto.randomBytes(3).toString("hex").toUpperCase();
};

// ==========================================
// CREATE EMPLOYEE
// ==========================================

exports.createEmployee = async (req, res) => {
  try {
    if (req.user.role !== "admin" || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Only Admin can create employees.",
      });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Employee name, email and password are required.",
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

    // Verify Admin's company
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

    // Check duplicate employee email within company
    const existingEmployee = await User.findOne({
      company: company._id,
      email: normalizedEmail,
      role: "employee",
    });

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: "This employee email is already registered.",
      });
    }

    // Generate unique Employee ID
    let employeeId;
    let duplicateId;

    do {
      employeeId = generateEmployeeId();

      duplicateId = await User.findOne({
        company: company._id,
        employeeId,
      });
    } while (duplicateId);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create employee
    const employee = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "employee",
      company: company._id,
      employeeId,
      createdBy: req.user._id,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully.",
      data: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        companyId: company.companyId,
        role: employee.role,
        isActive: employee.isActive,
      },
    });

  } catch (error) {
    console.error("Create employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create employee.",
    });
  }
};

// ==========================================
// GET EMPLOYEES
// ==========================================

exports.getEmployees = async (req, res) => {
  try {
    if (req.user.role !== "admin" || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const companyId = req.user.company._id || req.user.company;

    // Verify Admin's company
    const company = await Company.findOne({
      _id: companyId,
      admin: req.user._id,
      isActive: true,
    }).select("companyId");

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "Company access denied.",
      });
    }

    // Fetch only employees belonging to this company
    const employees = await User.find({
      company: companyId,
      role: "employee",
      isActive: true,
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    // Attach actual Company ID dynamically
    const employeesWithCompanyId = employees.map((employee) => ({
      ...employee,
      companyId: company.companyId,
    }));

    return res.status(200).json({
      success: true,
      count: employeesWithCompanyId.length,
      data: employeesWithCompanyId,
    });

  } catch (error) {
    console.error("Get employees error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve employees.",
    });
  }
};

// ==========================================
// UPDATE EMPLOYEE
// ==========================================

exports.updateEmployee = async (req, res) => {
  try {
    if (req.user.role !== "admin" || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const { name, email, password, isActive } = req.body;

    const companyId = req.user.company._id || req.user.company;

    // Verify company belongs to logged-in Admin
    const company = await Company.findOne({
      _id: companyId,
      admin: req.user._id,
      isActive: true,
    }).select("companyId");

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "Company access denied.",
      });
    }

    // Find employee within Admin's company
    const employee = await User.findOne({
      _id: req.params.id,
      company: companyId,
      role: "employee",
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    // Update name
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Employee name cannot be empty.",
        });
      }

      employee.name = name.trim();
    }

    // Update email
    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Employee email is required.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const duplicateEmail = await User.findOne({
        company: companyId,
        email: normalizedEmail,
        role: "employee",
        _id: { $ne: employee._id },
      });

      if (duplicateEmail) {
        return res.status(409).json({
          success: false,
          message: "This email is already used by another employee.",
        });
      }

      employee.email = normalizedEmail;
    }

    // Update password
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must contain at least 8 characters.",
        });
      }

      employee.password = await bcrypt.hash(password, 12);
    }

    // Update active status
    if (isActive !== undefined) {
      employee.isActive = isActive;
    }

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully.",
      data: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        companyId: company.companyId,
        role: employee.role,
        isActive: employee.isActive,
      },
    });

  } catch (error) {
    console.error("Update employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update employee.",
    });
  }
};

// ==========================================
// DELETE EMPLOYEE - PERMANENT DELETE
// ==========================================

exports.deleteEmployee = async (req, res) => {
  try {
    if (req.user.role !== "admin" || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const companyId = req.user.company._id || req.user.company;

    // Verify Admin's company
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

    // Permanently delete only employee belonging to this company
    const employee = await User.findOneAndDelete({
      _id: req.params.id,
      company: company._id,
      role: "employee",
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee permanently deleted successfully.",
      employeeId: employee._id,
    });

  } catch (error) {
    console.error("Delete employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete employee.",
    });
  }
};