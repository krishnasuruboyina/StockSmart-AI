
const express = require("express");
const router = express.Router();

const purchaseRequestController = require("../controllers/purchaseRequestController");

const {
  authMiddleware,
  adminMiddleware,
} = require("../middleware/authMiddleware");

// Only admins can create purchase requests
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  purchaseRequestController.createPurchaseRequest
);

// Only admins can view all purchase requests
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  purchaseRequestController.getPurchaseRequests
);

// Only admins can update request status
router.patch(
  "/:id/status",
  authMiddleware,
  adminMiddleware,
  purchaseRequestController.updatePurchaseRequestStatus
);

// Only admins can mark requests as received
router.patch(
  "/:id/received",
  authMiddleware,
  adminMiddleware,
  purchaseRequestController.markPurchaseRequestReceived
);

module.exports = router;
