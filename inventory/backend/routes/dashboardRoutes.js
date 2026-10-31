
const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Dashboard access requires a valid JWT token
router.get("/", authMiddleware, dashboardController.getDashboardSummary);

module.exports = router;
