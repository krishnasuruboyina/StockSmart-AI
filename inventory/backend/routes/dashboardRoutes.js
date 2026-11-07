const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const { authMiddleware } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Dashboard requires authentication
router.use(authMiddleware);

// Admin and Employee dashboard access
router.get(
  "/",
  authorizeRoles("admin", "employee"),
  dashboardController.getDashboardSummary
);

module.exports = router;