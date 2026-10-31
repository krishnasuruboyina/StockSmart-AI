
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  Package,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ClipboardCheck,
} from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Package size={19} />,
      title: "Smart Inventory",
      description: "Monitor stock levels and product availability.",
    },
    {
      icon: <TrendingUp size={19} />,
      title: "AI Forecasting",
      description: "Predict future demand using sales patterns.",
    },
    {
      icon: <ShoppingCart size={19} />,
      title: "Automated Procurement",
      description: "Generate purchase requests automatically.",
    },
  ];

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{
        backgroundColor: "#020817",
        backgroundImage:
          "linear-gradient(120deg, #020817 0%, #061B45 40%, #082D70 72%, #0756B8 100%)",
      }}
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6 lg:px-12">

        {/* Navbar */}
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-300/20">
              <Boxes size={25} className="text-cyan-300" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-wide">
                Inventory<span className="text-cyan-300">Pro</span>
              </h1>
              <p className="text-[10px] text-blue-200">
                INTELLIGENT INVENTORY MANAGEMENT
              </p>
            </div>
          </div>

          {/* Sign Up Button */}
          <button
            onClick={() => navigate("/register")}
            className="text-sm font-semibold px-5 py-2 rounded-lg border border-amber-300/60 text-[#f5c451] hover:bg-amber-400/10 hover:border-amber-300 transition"
          >
            Sign Up
          </button>
        </nav>

        {/* Main section */}
        <main className="grid lg:grid-cols-2 gap-12 items-center py-16 lg:py-20">

          {/* Left content */}
          <section>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 text-xs mb-6">
              <Sparkles size={14} />
              AI-Powered Inventory Platform
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold leading-tight">
              Manage Your
              <br />
              Inventory <span className="text-cyan-300">Smarter.</span>
            </h2>

            <p className="mt-5 text-sm sm:text-base leading-7 text-blue-100/75 max-w-lg">
              Simplify inventory management with intelligent demand
              forecasting, automated purchase requests, and real-time
              stock monitoring.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">

              {/* Get Started */}
              <button
                onClick={() => navigate("/register")}
                className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-[#061B45] font-bold text-sm px-6 py-3 rounded-xl transition shadow-lg shadow-cyan-500/20"
              >
                Get Started <ArrowRight size={17} />
              </button>

              {/* Login */}
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-3 rounded-xl border border-amber-300/60 text-[#f5c451] hover:bg-amber-400/10 hover:border-amber-300 text-sm font-semibold transition"
              >
                Login
              </button>
            </div>

            <div className="flex flex-wrap gap-6 mt-9 text-xs text-blue-100/80">
              <div className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-cyan-300" />
                Secure Access
              </div>
              <div className="flex items-center gap-2">
                <ClipboardCheck size={17} className="text-cyan-300" />
                Smart Automation
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid sm:grid-cols-3 gap-3 mt-12">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="rounded-xl p-4 border border-blue-300/15 bg-[#071E49]/80 hover:bg-[#0B2B61] transition"
                >
                  <div className="text-cyan-300 mb-3">
                    {feature.icon}
                  </div>

                  <h3 className="text-xs font-bold mb-2">
                    {feature.title}
                  </h3>

                  <p className="text-[10px] leading-5 text-blue-100/60">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Right dashboard illustration */}
          <section className="relative">
            <div className="rounded-2xl border border-blue-200/20 bg-[#071B42]/80 backdrop-blur-xl p-5 shadow-2xl shadow-black/30">

              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-blue-200/60">
                    INVENTORY OVERVIEW
                  </p>
                  <h3 className="text-lg font-bold mt-1">
                    Dashboard Preview
                  </h3>
                </div>

                <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-300">
                  <BarChart3 size={22} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Products", value: "1,250" },
                  { label: "Stock Available", value: "8,540" },
                  { label: "Purchase Requests", value: "24" },
                  { label: "Low Stock Items", value: "12" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl bg-blue-100/10 border border-blue-100/10 p-4"
                  >
                    <p className="text-[10px] text-blue-100/60">
                      {item.label}
                    </p>
                    <h4 className="text-2xl font-bold mt-2 text-white">
                      {item.value}
                    </h4>
                  </div>
                ))}
              </div>

              {/* Illustration chart */}
              <div className="mt-5 rounded-xl bg-blue-50 p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-slate-800">
                    Inventory Performance
                  </p>
                  <span className="text-[10px] text-green-600 font-semibold">
                    +12.5%
                  </span>
                </div>

                <div className="flex items-end justify-between gap-3 h-32 px-2">
                  {[45, 65, 50, 85, 60, 95, 72, 100, 78, 88].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-md bg-gradient-to-t from-blue-700 to-cyan-400"
                        style={{ height: `${height}%` }}
                      />
                    )
                  )}
                </div>

                <div className="flex justify-between text-[9px] text-slate-500 mt-3">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>

              {/* AI insights */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-cyan-400/10 border border-cyan-300/15 p-3">
                <div className="flex items-center gap-3">
                  <TrendingUp size={20} className="text-cyan-300" />
                  <div>
                    <p className="text-xs font-semibold">
                      AI Demand Insights
                    </p>
                    <p className="text-[10px] text-blue-100/60">
                      Smart inventory recommendations
                    </p>
                  </div>
                </div>
                <ArrowRight size={17} className="text-cyan-300" />
              </div>
            </div>

            <div className="absolute -top-5 -right-4 w-16 h-16 rounded-2xl bg-cyan-400/10 blur-xl" />
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-blue-200/15 pt-5 pb-3 flex flex-col sm:flex-row justify-between gap-3 text-[11px] text-blue-100/50">
          <p>© 2026 InventoryPro. All rights reserved.</p>
          <p>Intelligent Inventory & Procurement Management</p>
        </footer>
      </div>
    </div>
  );
}
