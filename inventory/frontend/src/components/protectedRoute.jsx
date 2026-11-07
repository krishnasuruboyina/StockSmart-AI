import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, isAuthenticated, loading } = useAuth();

  // Wait until authentication check completes
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-semibold text-blue-600">
          Checking authentication...
        </p>
      </div>
    );
  }

  // Redirect unauthenticated users to Welcome page
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  // Normalize role
  const userRole = String(user.role || "").toLowerCase();

  // Invalid role
  if (!userRole) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return <Navigate to="/" replace />;
  }

  // Check allowed roles
  const normalizedAllowedRoles = allowedRoles.map((role) =>
    String(role).toLowerCase()
  );

  if (
    normalizedAllowedRoles.length > 0 &&
    !normalizedAllowedRoles.includes(userRole)
  ) {
    // Supplier dashboard
    if (userRole === "supplier") {
      return (
        <Navigate to="/supplier-dashboard" replace />
      );
    }

    // Admin and Employee dashboard
    if (userRole === "admin" || userRole === "employee") {
      return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  // Authorized user
  return <Outlet />;
}