import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

// Global CSS
import "./App.css";

// Public Pages
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Common Pages
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import SalesEntry from "./pages/SalesEntry";
import Forecast from "./pages/Forecast";
import PurchaseRequests from "./pages/PurchaseRequests";
import Notifications from "./pages/Notifications";

// Admin Pages
import UploadData from "./pages/UploadData";
import Approvals from "./pages/Approvals";
import Reports from "./pages/Reports";
import DeliveryConfirmation from "./pages/DeliveryConfirmation";
import EmployeeManagement from "./pages/EmployeeManagement";
import SupplierManagement from "./pages/SupplierManagement";

// Employee Pages
import MyPurchaseRequests from "./pages/MyPurchaseRequests";

// Supplier Pages
import SupplierDashboard from "./pages/SupplierDashboard";
import SupplierOrders from "./pages/SupplierOrders";

// Components and Layout
import ProtectedRoute from "./components/protectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= PUBLIC ROUTES ================= */}

        <Route path="/" element={<Welcome />} />

        <Route path="/register" element={<Register />} />

        {/* Separate Login Pages */}
        <Route path="/admin-login" element={<Login />} />

        <Route path="/employee-login" element={<Login />} />

        <Route path="/supplier-login" element={<Login />} />

        {/* Old Login URL Redirect */}
        <Route
          path="/login"
          element={<Navigate to="/" replace />}
        />


        {/* ================= ADMIN ROUTES ================= */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["admin"]} />
          }
        >
          <Route element={<DashboardLayout />}>

            <Route
              path="/employees"
              element={<EmployeeManagement />}
            />

            <Route
              path="/suppliers"
              element={<SupplierManagement />}
            />

            <Route
              path="/upload"
              element={<UploadData />}
            />

            <Route
              path="/upload-data"
              element={<UploadData />}
            />

            <Route
              path="/approvals"
              element={<Approvals />}
            />

            <Route
              path="/reports"
              element={<Reports />}
            />

            <Route
              path="/delivery-confirmation"
              element={<DeliveryConfirmation />}
            />

          </Route>
        </Route>


        {/* ================= ADMIN AND EMPLOYEE ROUTES ================= */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["admin", "employee"]}
            />
          }
        >
          <Route element={<DashboardLayout />}>

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/inventory"
              element={<Inventory />}
            />

            <Route
              path="/sales"
              element={<SalesEntry />}
            />

            <Route
              path="/forecast"
              element={<Forecast />}
            />

            <Route
              path="/purchase-requests"
              element={<PurchaseRequests />}
            />

          </Route>
        </Route>


        {/* ================= EMPLOYEE ROUTES ================= */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["employee"]} />
          }
        >
          <Route element={<DashboardLayout />}>

            <Route
              path="/my-purchase-requests"
              element={<MyPurchaseRequests />}
            />

          </Route>
        </Route>


        {/* ================= SUPPLIER ROUTES ================= */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["supplier"]} />
          }
        >
          <Route element={<DashboardLayout />}>

            <Route
              path="/supplier-dashboard"
              element={<SupplierDashboard />}
            />

            <Route
              path="/supplier-orders"
              element={<SupplierOrders />}
            />

          </Route>
        </Route>


        {/* ================= NOTIFICATIONS ================= */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["admin", "employee", "supplier"]}
            />
          }
        >
          <Route element={<DashboardLayout />}>

            <Route
              path="/notifications"
              element={<Notifications />}
            />

          </Route>
        </Route>


        {/* ================= UNKNOWN ROUTES ================= */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}
