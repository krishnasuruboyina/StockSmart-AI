const Company = require("../models/company");

// Get logged-in Admin's company details
exports.getMyCompany = async (req, res) => {
  try {
    if (!req.user || !req.user.company) {
      return res.status(404).json({
        success: false,
        message: "Company not found for this account.",
      });
    }

    const company = await Company.findOne({
      _id: req.user.company._id || req.user.company,
      isActive: true,
    }).populate("admin", "name email");

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("Get company error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve company details.",
    });
  }
};

// Update logged-in Admin's company details
exports.updateMyCompany = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin" || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Only company Admin can update company details.",
      });
    }

    const { companyName, email, phone, address } = req.body;

    const updateFields = {};

    if (companyName !== undefined) {
      if (!companyName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Company name cannot be empty.",
        });
      }

      updateFields.companyName = companyName.trim();
    }

    if (email !== undefined) {
      if (!email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Company email cannot be empty.",
        });
      }

      updateFields.email = email.trim().toLowerCase();
    }

    if (phone !== undefined) {
      updateFields.phone = phone.trim();
    }

    if (address !== undefined) {
      updateFields.address = address.trim();
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid company details provided.",
      });
    }

    const companyId = req.user.company._id || req.user.company;

    const company = await Company.findOneAndUpdate(
      {
        _id: companyId,
        admin: req.user._id,
        isActive: true,
      },
      {
        $set: updateFields,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("admin", "name email");

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found or update not permitted.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Company details updated successfully.",
      data: company,
    });
  } catch (error) {
    console.error("Update company error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update company details.",
    });
  }
};