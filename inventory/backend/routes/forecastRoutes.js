
const express = require("express");
const router = express.Router();

const forecastController = require("../controllers/forecastController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Forecast requires a valid JWT token
router.post(
  "/",
  authMiddleware,
  forecastController.forecastSales
);

module.exports = router;
