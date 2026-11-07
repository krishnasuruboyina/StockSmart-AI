import { useEffect, useState } from "react";
import {
  getNotifications,
  markNotificationAsRead,
} from "../services/notificationService";
import { useAuth } from "../context/AuthContext";

export default function Notifications() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getNotifications();
      const data = response?.data ?? response;

      const list = Array.isArray(data)
        ? data
        : data?.notifications || [];

      setNotifications(list);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter(
    (item) => item.isRead !== true && item.read !== true
  ).length;

  const handleMarkAsRead = async (id) => {
    if (updatingId || markingAll) return;

    try {
      setUpdatingId(id);

      await markNotificationAsRead(id);

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === id
            ? { ...item, isRead: true, read: true }
            : item
        )
      );
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Unable to update notification."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (markingAll || unreadCount === 0) return;

    try {
      setMarkingAll(true);

      const unreadNotifications = notifications.filter(
        (item) => item.isRead !== true && item.read !== true
      );

      for (const item of unreadNotifications) {
        await markNotificationAsRead(item._id);
      }

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          isRead: true,
          read: true,
        }))
      );

      alert("All notifications marked as read!");
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Unable to mark all notifications as read."
      );

      await fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "-";

    return parsedDate.toLocaleString();
  };

  return (
    <div className="page-container">
      <h2>Notifications</h2>
      <p>
        Welcome {user?.name || "User"}. Check your latest updates here.
      </p>

      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>Total Notifications</h3>
          <h2>{notifications.length}</h2>
        </div>

        <div className="dashboard-card">
          <h3>Unread Notifications</h3>
          <h2>{unreadCount}</h2>
        </div>

        <div className="dashboard-card">
          <h3>Read Notifications</h3>
          <h2>{notifications.length - unreadCount}</h2>
        </div>
      </div>

      <div className="notification-actions">
        <button
          type="button"
          onClick={fetchNotifications}
          disabled={loading}
        >
          Refresh
        </button>

        <button
          type="button"
          onClick={handleMarkAllAsRead}
          disabled={markingAll || unreadCount === 0}
        >
          {markingAll ? "Updating..." : "Mark All as Read"}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button type="button" onClick={fetchNotifications}>
            Retry
          </button>
        </div>
      )}

      <h3>Recent Notifications</h3>

      {loading ? (
        <p>Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p>No notifications available.</p>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => {
            const isRead =
              notification.isRead === true ||
              notification.read === true;

            return (
              <div
                key={notification._id}
                className={`notification-item ${
                  isRead ? "read" : "unread"
                }`}
              >
                <div className="notification-content">
                  <h4>
                    {notification.title || "Notification"}
                  </h4>

                  <p>
                    {notification.message ||
                      notification.description ||
                      "You have a new notification."}
                  </p>

                  <small>
                    {formatDate(
                      notification.createdAt ||
                      notification.date
                    )}
                  </small>

                  <span className="notification-status">
                    {isRead ? "Read" : "Unread"}
                  </span>
                </div>

                {!isRead && (
                  <button
                    type="button"
                    onClick={() =>
                      handleMarkAsRead(notification._id)
                    }
                    disabled={
                      updatingId !== null || markingAll
                    }
                  >
                    {updatingId === notification._id
                      ? "Updating..."
                      : "Mark as Read"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}