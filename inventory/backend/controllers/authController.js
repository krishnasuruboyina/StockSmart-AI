const User = require("../models/user");
const Company = require("../models/company");
const Supplier = require("../models/supplier");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// ==========================================
// GENERATE UNIQUE COMPANY ID
// ==========================================

const generateCompanyId = () => {
  return "COMP-" + crypto.randomBytes(4).toString("hex").toUpperCase();
};

// ==========================================
// GENERATE JWT TOKEN
// ==========================================

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// ==========================================
// FORMAT USER RESPONSE
// ==========================================

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email || "",
  role: user.role,

  company: user.company
    ? {
        id: user.company._id || user.company,
        companyName: user.company.companyName || "",
        companyId: user.company.companyId || "",
      }
    : null,

  employeeId: user.employeeId || "",
  supplierId: user.supplierId || "",
});

// ==========================================
// REGISTER COMPANY AND ADMIN
// ==========================================

exports.register = async (req, res) => {
  let createdCompany = null;
  let createdUser = null;

  try {
    const {
      name,
      companyName,
      email,
      password,
      phone,
      address,
    } = req.body;

    if (!name || !companyName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, company name, email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Authentication configuration is missing.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingAdmin = await User.findOne({
      email: normalizedEmail,
      role: "admin",
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Email already registered.",
      });
    }

    // Create Company
    const companyId = generateCompanyId();

    createdCompany = await Company.create({
      companyName: companyName.trim(),
      companyId,
      email: normalizedEmail,
      phone: phone || "",
      address: address || "",
    });

    // Hash Admin Password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create Admin
    createdUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
      company: createdCompany._id,
    });

    // Link Admin to Company
    createdCompany.admin = createdUser._id;
    await createdCompany.save();

    const user = await User.findById(createdUser._id)
      .populate("company", "companyName companyId");

    return res.status(201).json({
      success: true,
      message: "Company registered successfully.",
      companyId: createdCompany.companyId,
      data: {
        user: formatUser(user),
      },
    });

  } catch (error) {
    console.error("Registration error:", error);

    if (createdUser) {
      await User.findByIdAndDelete(createdUser._id).catch(() => {});
    }

    if (createdCompany) {
      await Company.findByIdAndDelete(createdCompany._id).catch(() => {});
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or company ID already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Company registration failed.",
    });
  }
};

// ==========================================
// LOGIN ADMIN, EMPLOYEE AND SUPPLIER
// ==========================================

exports.login = async (req, res) => {
  try {
    const {
      email,
      companyId,
      employeeId,
      password,
      role,
    } = req.body;

    // Validate Password
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    // Validate JWT Secret
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Authentication configuration is missing.",
      });
    }

    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedCompanyId = companyId?.trim().toUpperCase();
    const normalizedRole = role?.trim().toLowerCase();

    let user = null;

    // ======================================
    // ADMIN LOGIN: EMAIL + PASSWORD
    // ======================================

    if (normalizedRole === "admin" && normalizedEmail && !normalizedCompanyId) {

      user = await User.findOne({
        email: normalizedEmail,
        role: "admin",
      })
        .select("+password")
        .populate("company", "companyName companyId");
    }

    // ======================================
    // EMPLOYEE / SUPPLIER LOGIN
    // COMPANY ID REQUIRED
    // ======================================

    else if (normalizedCompanyId) {

      // Find Company
      const company = await Company.findOne({
        companyId: normalizedCompanyId,
        isActive: true,
      });

      if (!company) {
        return res.status(401).json({
          success: false,
          message: "Invalid login credentials or inactive account.",
        });
      }

      // ==================================
      // SUPPLIER LOGIN
      // COMPANY ID + SUPPLIER EMAIL
      // ==================================

      if (normalizedRole === "supplier" && normalizedEmail) {

        // First find supplier profile using company and email
        const supplier = await Supplier.findOne({
          company: company._id,
          email: normalizedEmail,
          isActive: true,
        });

        if (supplier && supplier.user) {

          // Find linked User account
          user = await User.findOne({
            _id: supplier.user,
            company: company._id,
            role: "supplier",
          })
            .select("+password")
            .populate("company", "companyName companyId");

        } else {

          // Fallback for supplier accounts
          // where User email is already saved
          user = await User.findOne({
            company: company._id,
            email: normalizedEmail,
            role: "supplier",
          })
            .select("+password")
            .populate("company", "companyName companyId");
        }
      }

      // ==================================
      // EMPLOYEE LOGIN
      // COMPANY ID + EMPLOYEE EMAIL
      // ==================================

      else if (normalizedRole === "employee" && normalizedEmail) {

        user = await User.findOne({
          company: company._id,
          email: normalizedEmail,
          role: "employee",
        })
          .select("+password")
          .populate("company", "companyName companyId");
      }

      // ==================================
      // EMPLOYEE LOGIN
      // COMPANY ID + EMPLOYEE ID
      // BACKWARD COMPATIBILITY
      // ==================================

      else if (normalizedRole === "employee" && employeeId) {

        user = await User.findOne({
          company: company._id,
          employeeId: employeeId.trim().toUpperCase(),
          role: "employee",
        })
          .select("+password")
          .populate("company", "companyName companyId");
      }

      else {
        return res.status(400).json({
          success: false,
          message: "Please provide valid login details.",
        });
      }
    }

    else {
      return res.status(400).json({
        success: false,
        message: "Please provide valid login details.",
      });
    }

    // ======================================
    // VERIFY USER ACCOUNT
    // ======================================

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials or inactive account.",
      });
    }

    // ======================================
    // VERIFY PASSWORD
    // ======================================

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials or inactive account.",
      });
    }

    // ======================================
    // GENERATE TOKEN
    // ======================================

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      data: {
        user: formatUser(user),
      },
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
};