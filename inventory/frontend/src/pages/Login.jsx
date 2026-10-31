
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Boxes,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000";

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed. Please try again.");
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.message || "Unable to connect to server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-10 text-white"
      style={{
        background:
          "linear-gradient(120deg, #020817 0%, #061B45 45%, #082D70 75%, #0756B8 100%)",
      }}
    >
      <div className="w-full max-w-5xl grid md:grid-cols-2 overflow-hidden rounded-3xl border border-blue-200/20 shadow-2xl shadow-black/30">
        
        {/* Left information panel */}
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
                Manage Your Inventory Smarter.
              </h2>

              <p className="mt-5 text-sm leading-7 text-blue-100/70">
                Access your inventory dashboard, monitor stock levels,
                explore AI-powered forecasts, and manage purchase requests
                from one place.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-blue-100/70">
            <ShieldCheck size={19} className="text-cyan-300" />
            Secure and intelligent inventory management
          </div>
        </div>

        {/* Login form */}
        <div className="bg-white text-slate-800 p-7 sm:p-10">
          <button
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
            Sign In
          </h2>

          <p className="text-sm text-slate-500 mt-2 mb-8">
            Enter your credentials to access your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-700/20"
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">NEW HERE?</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <p className="text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-blue-700 font-bold hover:underline"
            >
              Create Account
            </Link>
          </p>

          <p className="text-center text-[11px] text-slate-400 mt-8">
            © 2026 InventoryPro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
