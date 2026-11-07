import { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  getEmployees,
  addEmployee,
  deleteEmployee,
} from "../services/EmployeeService";

import { useAuth } from "../context/AuthContext";

export default function EmployeeManagement() {
  const { role } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const isAdmin = role?.toLowerCase() === "admin";

  // FETCH EMPLOYEES
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getEmployees();
      const payload = response?.data ?? response;

      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.employees)
          ? payload.employees
          : Array.isArray(payload)
            ? payload
            : [];

      setEmployees(
        list.filter((employee) => employee.isActive !== false)
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load employees."
      );
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    } else {
      setLoading(false);
    }
  }, [isAdmin, fetchEmployees]);

  // FORM CHANGE
  const handleChange = (e) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  // ADD EMPLOYEE
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Employee name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Employee email is required.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setSubmitting(true);

    try {
      await addEmployee({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      setMessage("Employee added successfully!");

      setForm({
        name: "",
        email: "",
        password: "",
      });

      setShowPassword(false);

      await fetchEmployees();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to add employee."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE EMPLOYEE
  const handleDelete = async (id) => {
    if (!id || deletingId) return;

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this employee?"
    );

    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    setMessage("");

    try {
      await deleteEmployee(id);

      setEmployees((previous) =>
        previous.filter(
          (employee) =>
            String(employee._id || employee.id) !== String(id)
        )
      );

      setMessage("Employee deleted successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete employee."
      );

      await fetchEmployees();
    } finally {
      setDeletingId("");
    }
  };

  // ADMIN ACCESS
  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        You do not have permission to manage employees.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf3ff] p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 rounded-2xl border border-[#d6ad45] bg-[#071b42] p-6 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white md:text-3xl">
              <Users className="text-[#f5c451]" />
              Employee Management
            </h1>

            <p className="mt-2 text-sm text-blue-200">
              Add and manage your company employees.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchEmployees}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#d6ad45] bg-[#102c59] px-4 py-3 font-medium text-white transition hover:bg-[#193b70] disabled:opacity-60"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* SUCCESS */}
        {message && (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            <CheckCircle size={20} className="mt-0.5 shrink-0" />
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* ADD EMPLOYEE FORM */}
        <section className="rounded-xl border border-[#d6ad45] bg-[#f8fbff] p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
              <UserPlus size={24} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Add New Employee
              </h2>

              <p className="text-sm text-slate-500">
                Create an employee account for your company.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <input
              type="text"
              name="name"
              placeholder="Employee Name"
              value={form.name}
              onChange={handleChange}
              required
              className="rounded-lg border border-[#d6ad45] bg-white p-3 outline-none focus:border-blue-500"
            />

            <input
              type="email"
              name="email"
              placeholder="Employee Email"
              value={form.email}
              onChange={handleChange}
              required
              className="rounded-lg border border-[#d6ad45] bg-white p-3 outline-none focus:border-blue-500"
            />

            {/* PASSWORD WITH EYE ICON */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Employee Password"
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

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-lg border border-[#d6ad45] bg-[#e5b94c] px-6 py-3 font-semibold text-[#142447] transition hover:bg-[#f0ca69] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <UserPlus size={18} />
                )}

                {submitting ? "Adding Employee..." : "Add Employee"}
              </button>
            </div>
          </form>
        </section>

        {/* EMPLOYEE LIST */}
        <section className="overflow-hidden rounded-xl border border-[#d6ad45] bg-[#f8fbff] shadow-sm">
          <div className="border-b border-[#d6ad45] p-5">
            <h2 className="font-semibold text-slate-800">
              Employee List ({employees.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw
                size={28}
                className="mx-auto mb-3 animate-spin text-blue-600"
              />
              Loading employees...
            </div>
          ) : employees.length === 0 ? (
            <div className="p-12 text-center">
              <Users
                size={38}
                className="mx-auto mb-3 text-slate-400"
              />

              <p className="font-medium text-slate-700">
                No employees found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Add your first employee using the form above.
              </p>
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
                      Employee ID
                    </th>

                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Company ID
                    </th>

                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Role
                    </th>

                    <th className="border-b border-[#d6ad45] px-5 py-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {employees.map((employee) => {
                    const id = employee._id || employee.id;

                    return (
                      <tr
                        key={id}
                        className="border-b border-[#e5cf91] transition hover:bg-[#eaf3ff]"
                      >
                        <td className="px-5 py-4 font-medium text-slate-800">
                          {employee.name}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {employee.email}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {employee.employeeId || "-"}
                        </td>

                        {/* DYNAMIC COMPANY ID */}
                        <td className="px-5 py-4 font-medium text-blue-700">
                          {employee.companyId ||
                            employee.company?.companyId ||
                            "-"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            {employee.role || "Employee"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => handleDelete(id)}
                            disabled={Boolean(deletingId)}
                            className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-white transition hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingId === id ? (
                              <RefreshCw
                                size={15}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={15} />
                            )}

                            {deletingId === id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
