import { useState, useEffect, useCallback } from "react";
import API from "../api";
import { toast } from "react-toastify";
import Input from "../components/common/Input";
import AvatarUpload from "../components/common/AvatarUpload";
import DataTable from "../components/common/DataTable";
import Breadcrumbs from "../components/common/Breadcrumbs";
import ErrorState from "../components/common/ErrorState";

// =====================================================
// DEBOUNCE HOOK
// =====================================================
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// =====================================================
// PAGINATION COMPONENT
// =====================================================
function Pagination({ page, perPage, total, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-6 px-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                     disabled:opacity-40 disabled:cursor-not-allowed
                     hover:bg-gray-50 dark:hover:bg-gray-700
                     text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition"
        >
          Previous
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                     disabled:opacity-40 disabled:cursor-not-allowed
                     hover:bg-gray-50 dark:hover:bg-gray-700
                     text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// =====================================================
// MODAL COMPONENT (professional style)
// =====================================================
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// =====================================================
// CONSTANTS
// =====================================================
const DEPARTMENTS = [
  "Software Engineering",
  "Marketing",
  "IT",
  "HR",
  "Sales",
  "Finance",
];

const DESIGNATIONS = [
  "Software Engineer",
  "Python Developer",
  "Full Stack Developer",
  "HR Executive",
  "Manager",
  "Data Analyst",
  "Sales Executive",
  "Java Developer",
  "Dotnet Developer",
  "Accountant",
];

const SYSTEM_ROLES = ["employee", "hr", "admin"];

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const limit = 10;

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 400);
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [systemRole, setSystemRole] = useState("");

  // Modal & Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    department: "",
    designation: "",
    system_role: "employee",
    salary: "",
    profile_image: "",
  });

  // =====================================================
  // FETCH EMPLOYEES
  // =====================================================
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (department) params.append("department", department);
      if (designation) params.append("designation", designation);
      if (systemRole) params.append("system_role", systemRole);
      params.append("skip", (page - 1) * limit);
      params.append("limit", limit);

      const res = await API.get(`/employees/?${params.toString()}`);
      setEmployees(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      setError("Failed to load employees");
      toast.error(err.response?.data?.detail || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [search, department, designation, systemRole, page]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // =====================================================
  // MODAL HANDLERS
  // =====================================================
  const openCreateModal = () => {
    setEditingEmployee(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      department: "",
      designation: "",
      system_role: "employee",
      salary: "",
      profile_image: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setForm({
      name: emp.name || "",
      email: emp.email || "",
      phone: emp.phone || "",
      address: emp.address || "",
      department: emp.department || "",
      designation: emp.designation || "",
      system_role: emp.system_role || "employee",
      salary: emp.salary || "",
      profile_image: emp.profile_image || "",
    });
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // =====================================================
  // SAVE EMPLOYEE
  // =====================================================
  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.department || !form.designation) {
      return toast.error("Please fill all required fields");
    }

    try {
      const payload = {
        ...form,
        salary: Number(form.salary || 0),
      };

      if (editingEmployee) {
        await API.put(`/employees/${editingEmployee.id}`, payload);
        toast.success("Employee updated successfully");
      } else {
        await API.post("/employees/", payload);
        toast.success("Employee created successfully");
      }

      setModalOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Operation failed");
    }
  };

  // =====================================================
  // DELETE EMPLOYEE
  // =====================================================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;

    try {
      await API.delete(`/employees/${id}`);
      toast.success("Employee deleted");
      fetchEmployees();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  // =====================================================
  // TABLE COLUMNS
  // =====================================================
  const columns = [
    {
      key: "name",
      label: "Name",
    },
    {
      key: "email",
      label: "Email",
    },
    {
      key: "department",
      label: "Department",
    },
    {
      key: "designation",
      label: "Designation",
    },
    {
      key: "salary",
      label: "Salary",
      render: (emp) =>
        emp.salary ? `₹${Number(emp.salary).toLocaleString()}` : "—",
    },
    {
      key: "system_role",
      label: "Role",
      render: (emp) => (
        <span className="px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
          {emp.system_role || "employee"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (emp) => (
        <div className="flex gap-3">
          <button
            onClick={() => openEditModal(emp)}
            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(emp.id)}
            className="text-red-600 hover:text-red-800 dark:text-red-400 font-medium text-sm"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs
        items={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Employees" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Employee Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage all employees, departments, and roles
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition shadow-sm hover:shadow-md"
        >
          <span className="text-xl leading-none">+</span> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          placeholder="Search employee..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 transition"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select
          value={designation}
          onChange={(e) => {
            setDesignation(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 transition"
        >
          <option value="">All Designations</option>
          {DESIGNATIONS.map((des) => (
            <option key={des} value={des}>{des}</option>
          ))}
        </select>
        <select
          value={systemRole}
          onChange={(e) => {
            setSystemRole(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 transition"
        >
          <option value="">All Roles</option>
          {SYSTEM_ROLES.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      {/* Table / Error */}
      {error ? (
        <ErrorState message={error} onRetry={fetchEmployees} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <DataTable
            columns={columns}
            data={employees || []}
            loading={loading}
            emptyMessage="No employees found"
          />
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} perPage={limit} total={total} onChange={setPage} />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEmployee ? "Edit Employee" : "Add Employee"}
      >
        <form onSubmit={handleSave} className="space-y-5">
          {editingEmployee && (
            <div className="flex justify-center pb-2">
              <AvatarUpload
                employeeId={editingEmployee.id}
                currentUrl={form.profile_image || editingEmployee.profile_image}
                onUpload={(url) => setForm({ ...form, profile_image: url })}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" name="name" value={form.name} onChange={handleFormChange} required />
            <Input label="Email" type="email" name="email" value={form.email} onChange={handleFormChange} required />
            <Input label="Phone" name="phone" value={form.phone} onChange={handleFormChange} />
            <Input label="Address" name="address" value={form.address} onChange={handleFormChange} />
            <Input label="Salary" name="salary" type="number" value={form.salary} onChange={handleFormChange} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department *</label>
              <select
                name="department"
                value={form.department}
                onChange={handleFormChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Designation *</label>
              <select
                name="designation"
                value={form.designation}
                onChange={handleFormChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select Designation</option>
                {DESIGNATIONS.map((des) => (
                  <option key={des} value={des}>{des}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">System Role</label>
              <select
                name="system_role"
                value={form.system_role}
                onChange={handleFormChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
              >
                {SYSTEM_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition shadow-sm hover:shadow-md"
            >
              {editingEmployee ? "Update Employee" : "Create Employee"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}