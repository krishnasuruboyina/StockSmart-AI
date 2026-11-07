const express = require("express");
const router = express.Router();

const reorderController = require("../controllers/reorderController");
const { authMiddleware } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// All reorder routes require authentication
router.use(authMiddleware);

// Admin and Employee can run automatic reorder checks
router.get(
  "/",
  authorizeRoles("admin", "employee"),
  reorderController.checkReorderNeeded
);

module.exports = router;