const express = require("express");
const router = express.Router();

const deliveryController = require("../controllers/deliveryController");
const { authMiddleware } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// All delivery routes require authentication
router.use(authMiddleware);

// Admin and Supplier can view their permitted deliveries
router.get(
  "/",
  authorizeRoles("admin", "supplier"),
  deliveryController.getDeliveries
);

// Supplier marks an order as sent/dispatched
router.patch(
  "/:id/sent",
  authorizeRoles("supplier"),
  deliveryController.markDeliverySent
);

// Only Admin confirms physical receipt of goods
router.patch(
  "/:id/received",
  authorizeRoles("admin"),
  deliveryController.confirmDeliveryReceived
);

module.exports = router;