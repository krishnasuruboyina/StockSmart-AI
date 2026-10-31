
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import UploadData from "./pages/UploadData";
import SalesEntry from "./pages/SalesEntry";
import Forecast from "./pages/Forecast";
import PurchaseRequests from "./pages/PurchaseRequests";
import Approvals from "./pages/Approvals";
import Reports from "./pages/Reports";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Welcome Page */}
        <Route path="/" element={<Welcome />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Inventory */}
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <Inventory />
            </ProtectedRoute>
          }
        />

        {/* Upload Data */}
        <Route
          path="/upload-data"
          element={
            <ProtectedRoute>
              <UploadData />
            </ProtectedRoute>
          }
        />

        {/* Sales Entry */}
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <SalesEntry />
            </ProtectedRoute>
          }
        />

        {/* AI Forecast */}
        <Route
          path="/forecast"
          element={
            <ProtectedRoute>
              <Forecast />
            </ProtectedRoute>
          }
        />

        {/* Purchase Requests */}
        <Route
          path="/purchase-requests"
          element={
            <ProtectedRoute>
              <PurchaseRequests />
            </ProtectedRoute>
          }
        />

        {/* Approvals */}
        <Route
          path="/approvals"
          element={
            <ProtectedRoute>
              <Approvals />
            </ProtectedRoute>
          }
        />

        {/* Reports */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
