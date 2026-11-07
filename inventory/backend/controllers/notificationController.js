const Notification = require("../models/notification");

// Get notifications for logged-in user
exports.getNotifications = async (req, res) => {
  try {
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Company access required.",
      });
    }

    const companyId = req.user.company._id || req.user.company;

    const notifications = await Notification.find({
      company: companyId,
      recipient: req.user._id,
    }).sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({
      company: companyId,
      recipient: req.user._id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications.",
    });
  }
};

// Mark a notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Company access required.",
      });
    }

    const companyId = req.user.company._id || req.user.company;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        company: companyId,
        recipient: req.user._id,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      {
        new: true,
      }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
    });
  } catch (error) {
    console.error("Mark notification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update notification.",
    });
  }
};

// Mark all notifications as read
exports.markAllNotificationsRead = async (req, res) => {
  try {
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: "Company access required.",
      });
    }

    const companyId = req.user.company._id || req.user.company;

    const result = await Notification.updateMany(
      {
        company: companyId,
        recipient: req.user._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all notifications error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update notifications.",
    });
  }
};