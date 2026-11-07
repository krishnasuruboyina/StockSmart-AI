const express = require("express");
const router = express.Router();

const forecastController = require("../controllers/forecastController");
const { authMiddleware } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// All forecast routes require authentication
router.use(authMiddleware);

// Admin and Employee can generate forecasts
router.post(
  "/",
  authorizeRoles("admin", "employee"),
  forecastController.forecastSales
);

module.exports = router;