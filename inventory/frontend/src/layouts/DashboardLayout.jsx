
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Upload,
  ShoppingCart,
  TrendingUp,
  ClipboardList,
  CheckCircle,
  FileText,
  Menu,
  X,
  LogOut,
  Boxes,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Inventory", path: "/inventory", icon: Package },
  { name: "Upload Data", path: "/upload-data", icon: Upload },
  { name: "Sales Entry", path: "/sales", icon: ShoppingCart },
  { name: "AI Forecast", path: "/forecast", icon: TrendingUp },
  { name: "Purchase Requests", path: "/purchase-requests", icon: ClipboardList },
  { name: "Approvals", path: "/approvals", icon: CheckCircle },
  { name: "Reports", path: "/reports", icon: FileText },
];

export default function DashboardLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#eaf3ff] text-slate-800">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#142447] text-white shadow-xl transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
              <Boxes size={24} />
            </div>
            <div>
              <h1 className="font-bold">StockSmart AI</h1>
              <p className="text-xs text-blue-200">
                Inventory Management
              </p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <p className="px-5 pb-2 pt-7 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Main Menu
        </p>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-500 text-white shadow-lg"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={19} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-red-500/15 hover:text-red-300"
          >
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen lg:pl-64">

        {/* Common dark header for all pages */}
        <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-[#d6ad45] bg-[#071b42] px-4 shadow-sm sm:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div>
            <h2 className="text-xl font-bold text-white">
              {title || "Dashboard"}
            </h2>
            <p className="text-xs text-blue-200">
              Inventory & Procurement Management
            </p>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
