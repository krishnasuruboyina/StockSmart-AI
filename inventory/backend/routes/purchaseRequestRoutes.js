const express = require("express");
const router = express.Router();

const purchaseRequestController = require("../controllers/purchaseRequestController");

const { authMiddleware } = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// All routes require authentication
router.use(authMiddleware);

// Admin and Employee can create purchase requests
router.post(
  "/",
  authorizeRoles("admin", "employee"),
  purchaseRequestController.createPurchaseRequest
);

// Admin sees all company requests; Employee sees own requests
router.get(
  "/",
  authorizeRoles("admin", "employee"),
  purchaseRequestController.getPurchaseRequests
);

// Only Admin can approve or reject requests
router.patch(
  "/:id/status",
  authorizeRoles("admin"),
  purchaseRequestController.updatePurchaseRequestStatus
);

// Stock updates happen only through delivery confirmation
router.patch(
  "/:id/received",
  authorizeRoles("admin"),
  purchaseRequestController.markPurchaseRequestReceived
);

module.exports = router;