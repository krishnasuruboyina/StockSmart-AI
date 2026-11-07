const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const { authMiddleware } = require("../middleware/authMiddleware");

// All notification routes require authentication
router.use(authMiddleware);

// Get notifications for logged-in user
router.get(
  "/",
  notificationController.getNotifications
);

// Mark one notification as read
router.patch(
  "/:id/read",
  notificationController.markNotificationRead
);

// Mark all notifications as read
router.patch(
  "/read-all",
  notificationController.markAllNotificationsRead
);

module.exports = router;