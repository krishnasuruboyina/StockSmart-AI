const express = require("express");
const router = express.Router();

const purchaseOrderController = require("../controllers/purchaseOrderController");
const { authMiddleware } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// All purchase order routes require authentication
router.use(authMiddleware);

// Admin creates a purchase order from an approved request
router.post(
  "/",
  authorizeRoles("admin"),
  purchaseOrderController.createPurchaseOrder
);

// Admin, Employee and Supplier can view their permitted orders
router.get(
  "/",
  authorizeRoles("admin", "employee", "supplier"),
  purchaseOrderController.getPurchaseOrders
);

// Supplier accepts or rejects an order
router.patch(
  "/:id/status",
  authorizeRoles("supplier"),
  purchaseOrderController.respondToPurchaseOrder
);

// Supplier marks an accepted order as dispatched
router.patch(
  "/:id/dispatched",
  authorizeRoles("supplier"),
  purchaseOrderController.markOrderDispatched
);

module.exports = router;