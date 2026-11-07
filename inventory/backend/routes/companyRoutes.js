const express = require("express");
const router = express.Router();

const companyController = require("../controllers/companyController");
const { authMiddleware } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// All company routes require authentication
router.use(authMiddleware);

// Get logged-in user's company details
router.get("/me", companyController.getMyCompany);

// Only Admin can update company details
router.put(
  "/me",
  authorizeRoles("admin"),
  companyController.updateMyCompany
);

module.exports = router;