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
  Building2,
  Hash,
} from "lucide-react";

import { registerUser } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: "",
    companyId: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
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
      !formData.companyName.trim() ||
      !formData.companyId.trim() ||
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await registerUser({
        companyName: formData.companyName.trim(),
        companyId: formData.companyId.trim(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: "admin",
      });

      setSuccess(
        "Company and Admin account created successfully! Redirecting to login..."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

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
                Register your company and manage inventory,
                employees, suppliers, AI demand forecasting,
                and automated procurement from one place.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-blue-100/70">
            <ShieldCheck size={19} className="text-cyan-300" />
            Secure Company Registration
          </div>
        </div>

        {/* Registration form */}
        <div className="bg-white text-slate-800 p-7 sm:p-10">

          <button
            type="button"
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
            Register Your Company
          </h2>

          <p className="text-sm text-slate-500 mt-2 mb-6">
            Create your company and Admin account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Company Name */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Company Name
              </label>

              <div className="relative">
                <Building2
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* Company ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Company ID
              </label>

              <div className="relative">
                <Hash
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleChange}
                  placeholder="Enter unique company ID"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* Admin Name */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Admin Full Name
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
                  placeholder="Enter Admin name"
                  className={inputClass}
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
                  placeholder="Enter admin email"
                  className={inputClass}
                  required
                />
              </div>
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
                  minLength={8}
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

            {/* Confirm Password */}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-700/20"
            >
              {loading ? "Creating Company..." : "Register Company"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already registered?{" "}
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