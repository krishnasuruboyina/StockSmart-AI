import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { getNotifications } from "../services/notificationService";
import { useAuth } from "../context/AuthContext";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const response = await getNotifications();
        const data = response?.data ?? response;

        const notifications = Array.isArray(data)
          ? data
          : data?.notifications || [];

        const count = notifications.filter(
          (notification) =>
            notification.isRead !== true &&
            notification.read !== true
        ).length;

        if (isMounted) {
          setUnreadCount(count);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    };

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleClick = () => {
    navigate("/notifications");
  };

  return (
    <button
      type="button"
      className="notification-bell"
      onClick={handleClick}
      aria-label={`${unreadCount} unread notifications`}
      title="Notifications"
    >
      <Bell size={22} />

      {unreadCount > 0 && (
        <span className="notification-count">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}