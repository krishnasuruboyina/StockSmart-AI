
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Boxes,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000";

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      setSuccess("Account created successfully! Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
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
                Start Your
                <br />
                Smart Inventory Journey.
              </h2>

              <p className="mt-5 text-sm leading-7 text-blue-100/70">
                Create your account to access intelligent inventory
                management, AI demand forecasting, and automated
                procurement features.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-blue-100/70">
            <ShieldCheck size={19} className="text-cyan-300" />
            Smart, secure and efficient management
          </div>
        </div>

        {/* Registration form */}
        <div className="bg-white text-slate-800 p-7 sm:p-10">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700 transition mb-7"
          >
            <ArrowLeft size={17} />
            Back to Home
          </button>

          <div className="md:hidden flex items-center gap-2 mb-7">
            <Boxes className="text-blue-700" size={25} />
            <h1 className="text-lg font-bold">
              Inventory<span className="text-blue-600">Pro</span>
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            Create Account
          </h2>

          <p className="text-sm text-slate-500 mt-2 mb-6">
            Register to get started with InventoryPro.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Full Name
              </label>

              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            </div>

            {/* Email */}
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

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Account Role
              </label>

              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="student">Student</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            {/* Password */}
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
                  placeholder="Create a password"
                  className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-700"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Confirm Password
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-700"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-700/20"
            >
              {loading ? "Creating Account..." : "Create Account"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-700 font-bold hover:underline"
            >
              Sign In
            </Link>
          </p>

          <p className="text-center text-[11px] text-slate-400 mt-7">
            © 2026 InventoryPro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
