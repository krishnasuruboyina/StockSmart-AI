import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Boxes,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Building2,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const loginConfig = {
  admin: {
    title: "Admin Login",
    description: "Sign in to manage your company inventory.",
    dashboard: "/dashboard",
  },
  employee: {
    title: "Employee Login",
    description: "Sign in to access your employee account.",
    dashboard: "/dashboard",
  },
  supplier: {
    title: "Supplier Login",
    description: "Sign in to manage your purchase orders.",
    dashboard: "/supplier-dashboard",
  },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const loginType = {
    "/admin-login": "admin",
    "/employee-login": "employee",
    "/supplier-login": "supplier",
  }[location.pathname];

  const { login, logout, loading } = useAuth();
  const config = loginConfig[loginType];

  const [formData, setFormData] = useState({
    companyId: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (!config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold">Invalid Login Page</h2>
        <Link to="/" className="text-blue-600 underline">
          Back to Home
        </Link>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    let credentials;

    // ADMIN LOGIN
    if (loginType === "admin") {
      if (!formData.email.trim() || !formData.password) {
        setError("Please enter email and password.");
        return;
      }

      credentials = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: "admin",
      };
    }

    // EMPLOYEE LOGIN
    else if (loginType === "employee") {
      if (
        !formData.companyId.trim() ||
        !formData.email.trim() ||
        !formData.password
      ) {
        setError(
          "Please enter Company ID, Employee Email and Password."
        );
        return;
      }

      credentials = {
        companyId: formData.companyId.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: "employee",
      };
    }

    // SUPPLIER LOGIN
    else if (loginType === "supplier") {
      if (
        !formData.companyId.trim() ||
        !formData.email.trim() ||
        !formData.password
      ) {
        setError(
          "Please enter Company ID, Supplier Email and Password."
        );
        return;
      }

      credentials = {
        companyId: formData.companyId.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: "supplier",
      };
    }

    try {
      const user = await login(credentials);

      const actualRole = user?.role?.toLowerCase();

      if (actualRole !== loginType) {
        logout();

        setError(
          `This account is not registered as ${loginType}. Please use the correct login page.`
        );
        return;
      }

      navigate(config.dashboard, { replace: true });

    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Login failed. Please try again."
      );
    }
  };

  const isAdmin = loginType === "admin";
  const isEmployee = loginType === "employee";
  const isSupplier = loginType === "supplier";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-10 text-white"
      style={{
        background:
          "linear-gradient(120deg, #020817 0%, #061B45 45%, #082D70 75%, #0756B8 100%)",
      }}
    >
      <div className="w-full max-w-5xl grid md:grid-cols-2 overflow-hidden rounded-3xl border border-blue-200/20 shadow-2xl shadow-black/30">

        {/* LEFT SECTION */}

        <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-[#123D80] via-[#071941] to-[#1761A8]">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-300/15">
                <Boxes size={27} className="text-cyan-300" />
              </div>

              <div>
                <h1 className="text-xl font-bold">
                  Inventory<span className="text-cyan-300">Pro</span>
                </h1>
                <p className="text-[10px] text-blue-200">
                  SMART INVENTORY MANAGEMENT
                </p>
              </div>
            </div>

            <div className="mt-24">
              <h2 className="text-3xl font-bold leading-tight">
                Welcome Back!
                <br />
                {config.title}
              </h2>

              <p className="mt-5 text-sm leading-7 text-blue-100/70">
                Access your account to manage inventory,
                monitor updates and manage your activities securely.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-blue-100/70">
            <ShieldCheck size={19} className="text-cyan-300" />
            Secure and intelligent inventory management
          </div>
        </div>

        {/* RIGHT SECTION */}

        <div className="bg-white text-slate-800 p-7 sm:p-10">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700 transition mb-8"
          >
            <ArrowLeft size={17} />
            Back to Home
          </button>

          <div className="md:hidden flex items-center gap-2 mb-8">
            <Boxes className="text-blue-700" size={25} />
            <h1 className="text-lg font-bold">
              Inventory<span className="text-blue-600">Pro</span>
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {config.title}
          </h2>

          <p className="text-sm text-slate-500 mt-2 mb-8">
            {config.description}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* COMPANY ID */}

            {!isAdmin && (
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Company ID
                </label>

                <div className="relative">
                  <Building2
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    name="companyId"
                    value={formData.companyId}
                    onChange={handleChange}
                    placeholder="Enter Company ID"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>
            )}

            {/* EMPLOYEE EMAIL */}

            {isEmployee && (
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Employee Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter Employee Email"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>
            )}

            {/* SUPPLIER EMAIL */}

            {isSupplier && (
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Supplier Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter Supplier Email"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>
            )}

            {/* ADMIN EMAIL */}

            {isAdmin && (
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>
            )}

            {/* PASSWORD */}

            <div>
              <label className="block text-sm font-semibold mb-2">
                Password
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* ERROR */}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-700/20"
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight size={17} />}
            </button>

          </form>

          {/* ADMIN REGISTRATION */}

          {isAdmin && (
            <>
              <div className="flex items-center gap-3 my-7">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">NEW COMPANY?</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <p className="text-center text-sm text-slate-500">
                Register your company?{" "}
                <Link
                  to="/register"
                  className="text-blue-700 font-bold hover:underline"
                >
                  Register Company
                </Link>
              </p>
            </>
          )}

          <p className="text-center text-[11px] text-slate-400 mt-8">
            © 2026 InventoryPro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}