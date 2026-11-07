import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const menus = {
  admin: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Employees", path: "/employees", icon: Users },
    { name: "My Suppliers", path: "/suppliers", icon: Truck },
    { name: "Upload Data", path: "/upload", icon: Upload },
    { name: "Inventory", path: "/inventory", icon: Package },
    { name: "Sales Entry", path: "/sales", icon: ShoppingCart },
    { name: "AI Forecast", path: "/forecast", icon: Brain },
    { name: "Approvals", path: "/approvals", icon: CheckCircle },
    { name: "Delivery Confirmation", path: "/delivery-confirmation", icon: Truck },
    { name: "Reports", path: "/reports", icon: FileText },
    { name: "Notifications", path: "/notifications", icon: Bell },
    
  ],

  employee: [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Inventory", path: "/inventory", icon: Package },
    { name: "Sales Entry", path: "/sales", icon: ShoppingCart },
    { name: "AI Forecast", path: "/forecast", icon: Brain },
    {
      name: "Purchase Requests",
      path: "/my-purchase-requests",
      icon: ClipboardList,
    },
    { name: "Notifications", path: "/notifications", icon: Bell },
  ],

  supplier: [
    { name: "Dashboard", path: "/supplier-dashboard", icon: LayoutDashboard },
    { name: "My Orders", path: "/supplier-orders", icon: Truck },
    { name: "Notifications", path: "/notifications", icon: Bell },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const role = user?.role?.toLowerCase();
  const menuItems = menus[role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Smart Inventory</h2>

      <p className="sidebar-user">
        {user?.name || "User"}
        <br />
        <small>{role || "User"}</small>
      </p>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <button
        type="button"
        className="sidebar-logout"
        onClick={handleLogout}
      >
        Logout
      </button>
    </aside>
  );
}