import { useEffect, useState, useCallback } from "react";
import {
  getSuppliers,
  addSupplier,
} from "../services/supplierService";

import { useAuth } from "../context/AuthContext";

import {
  Eye,
  EyeOff,
  RefreshCw,
  Users,
} from "lucide-react";

export default function SupplierManagement() {
  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });

  const isAdmin = user?.role?.toLowerCase() === "admin";

  // FETCH SUPPLIERS
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getSuppliers();
      const payload = response?.data ?? response;

      const supplierList = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.suppliers)
          ? payload.suppliers
          : Array.isArray(payload)
            ? payload
            : [];

      setSuppliers(supplierList);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to load suppliers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchSuppliers();
    } else {
      setLoading(false);
    }
  }, [isAdmin, fetchSuppliers]);

  // FORM CHANGE
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ADD SUPPLIER
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAdmin || submitting) return;

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.phone.trim() ||
      !form.address.trim()
    ) {
      setError("Please fill all supplier details.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await addSupplier({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
        address: form.address.trim(),
      });

      setMessage("Supplier added successfully!");

      setForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        address: "",
      });

      setShowPassword(false);

      await fetchSuppliers();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to add supplier."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ADMIN ACCESS
  if (!isAdmin) {
    return (
      <div className="page-container">
        <h2>Access Restricted</h2>
        <p>Only Admin can manage suppliers.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf3ff] p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 rounded-2xl border border-[#d6ad45] bg-[#071b42] p-6 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
              <Users className="text-[#f5c451]" />
              Supplier Management
            </h1>

            <p className="mt-2 text-sm text-blue-200">
              Add and manage your company suppliers.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSuppliers}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#d6ad45] bg-[#102c59] px-4 py-3 font-medium text-white hover:bg-[#193b70] disabled:opacity-60"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {message}
          </div>
        )}

        {/* ADD SUPPLIER FORM */}
        <section className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-6 shadow-sm">

          <h2 className="mb-5 text-lg font-bold text-slate-800">
            Add New Supplier
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {/* SUPPLIER NAME */}
            <input
              type="text"
              name="name"
              placeholder="Supplier Name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-[#d6ad45] bg-white p-3 outline-none focus:border-blue-500"
            />

            {/* SUPPLIER EMAIL */}
            <input
              type="email"
              name="email"
              placeholder="Supplier Email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-[#d6ad45] bg-white p-3 outline-none focus:border-blue-500"
            />

            {/* SUPPLIER PASSWORD */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Supplier Password"
                value={form.password}
                onChange={handleChange}
                minLength={8}
                required
                className="w-full rounded-lg border border-[#d6ad45] bg-white p-3 pr-12 outline-none focus:border-blue-500"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-700"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>

            {/* PHONE */}
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={form.phone}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-[#d6ad45] bg-white p-3 outline-none focus:border-blue-500"
            />

            {/* ADDRESS */}
            <textarea
              name="address"
              placeholder="Supplier Address"
              value={form.address}
              onChange={handleChange}
              required
              rows={3}
              className="w-full rounded-lg border border-[#d6ad45] bg-white p-3 outline-none focus:border-blue-500 md:col-span-2"
            />

            {/* SUBMIT */}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#d6ad45] bg-[#e5b94c] px-6 py-3 font-semibold text-[#142447] transition hover:bg-[#f0ca69] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && (
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                )}

                {submitting
                  ? "Adding Supplier..."
                  : "Add Supplier"}
              </button>
            </div>
          </form>
        </section>

        {/* SUPPLIER LIST */}
        <section className="overflow-hidden rounded-xl border border-[#d6ad45] bg-[#f8fbff] shadow-sm">

          <div className="border-b border-[#d6ad45] p-5">
            <h2 className="font-semibold text-slate-800">
              Supplier List ({suppliers.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              <RefreshCw
                size={28}
                className="mx-auto mb-3 animate-spin text-blue-600"
              />
              Loading suppliers...
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No suppliers found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#eaf3ff] text-slate-600">
                  <tr>
                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Name
                    </th>

                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Email
                    </th>

                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Phone
                    </th>

                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Address
                    </th>

                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Company ID
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {suppliers.map((supplier) => (
                    <tr
                      key={supplier._id}
                      className="border-b border-[#e5cf91] transition hover:bg-[#eaf3ff]"
                    >
                      <td className="px-5 py-4 font-medium">
                        {supplier.name}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {supplier.email || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {supplier.phone || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {supplier.address || "-"}
                      </td>

                      {/* DYNAMIC COMPANY ID */}
                      <td className="px-5 py-4 font-medium text-blue-700">
                        {supplier.companyId ||
                          supplier.company?.companyId ||
                          "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}