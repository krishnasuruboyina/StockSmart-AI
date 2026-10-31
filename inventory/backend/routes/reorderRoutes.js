
const express = require("express");
const router = express.Router();

const reorderController = require("../controllers/reorderController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Reorder check requires a valid JWT token
router.get(
  "/",
  authMiddleware,
  reorderController.checkReorderNeeded
);

module.exports = router;
