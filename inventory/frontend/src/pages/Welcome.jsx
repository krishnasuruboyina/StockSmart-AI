import { useNavigate } from "react-router-dom";

import {
  Boxes,
  Package,
  TrendingUp,
  ShoppingCart,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ClipboardCheck,
  Users,
  Truck,
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

          {/* Register Company */}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="text-sm font-semibold px-5 py-2 rounded-lg border border-amber-300/60 text-[#f5c451] hover:bg-amber-400/10 hover:border-amber-300 transition"
          >
            Register Company
          </button>
        </nav>

        {/* Main content - Dashboard Preview removed */}
        <main className="max-w-5xl mx-auto py-16 lg:py-20">

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

            {/* Get Started */}
            <div className="mt-8">
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-[#061B45] font-bold text-sm px-6 py-3 rounded-xl transition shadow-lg shadow-cyan-500/20"
              >
                Get Started
                <ArrowRight size={17} />
              </button>
            </div>

            {/* Login Buttons */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-blue-100 mb-3">
                Login to Your Account
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">

                {/* Admin Login */}
                <button
                  type="button"
                  onClick={() => navigate("/admin-login")}
                  className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-amber-300/60 text-[#f5c451] hover:bg-amber-400/10 transition text-sm font-semibold"
                >
                  <ShieldCheck size={18} />
                  Admin
                </button>

                {/* Employee Login */}
                <button
                  type="button"
                  onClick={() => navigate("/employee-login")}
                  className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-cyan-300/50 text-cyan-200 hover:bg-cyan-400/10 transition text-sm font-semibold"
                >
                  <Users size={18} />
                  Employee
                </button>

                {/* Supplier Login */}
                <button
                  type="button"
                  onClick={() => navigate("/supplier-login")}
                  className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-blue-300/50 text-blue-200 hover:bg-blue-400/10 transition text-sm font-semibold"
                >
                  <Truck size={18} />
                  Supplier
                </button>

              </div>
            </div>

            {/* Trust information */}
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