// pages/DepartmentManagementPage.jsx
import { useState, useEffect, useCallback } from "react";
import API from "../api";
import { toast } from "react-toastify";
import DataTable from "../components/common/DataTable";
import Breadcrumbs from "../components/common/Breadcrumbs";
import ErrorState from "../components/common/ErrorState";
import SkeletonLoader from "../components/common/SkeletonLoader";
import Modal from "../components/common/Modal";
import Input from "../components/common/Input";

export default function DepartmentManagementPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState({ name: "" });
  const [submitting, setSubmitting] = useState(false);

  // ===================== FETCH =====================
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get("/departments");   // expect array of {id, name, employee_count}
      setDepartments(res.data || []);
    } catch (err) {
      setError("Failed to load departments");
      toast.error("Could not load departments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  // ===================== MODAL =====================
  const openCreateModal = () => {
    setEditingDept(null);
    setForm({ name: "" });
    setModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setForm({ name: dept.name || "" });
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ===================== SAVE =====================
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      return toast.error("Department name is required");
    }
    setSubmitting(true);
    try {
      if (editingDept) {
        await API.put(`/departments/${editingDept.id}`, form);
        toast.success("Department updated");
      } else {
        await API.post("/departments", form);
        toast.success("Department created");
      }
      setModalOpen(false);
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ===================== DELETE =====================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this department? Employees will become 'Not Assigned'.")) return;
    try {
      await API.delete(`/departments/${id}`);
      toast.success("Department deleted");
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    }
  };

  // ===================== TABLE COLUMNS =====================
  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Department Name" },
    {
      key: "employee_count",
      label: "Employees",
      render: (row) => row.employee_count ?? "—",
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-3">
          <button onClick={() => openEditModal(row)} className="text-indigo-600 hover:underline text-sm font-medium">
            Edit
          </button>
          <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:underline text-sm font-medium">
            Delete
          </button>
        </div>
      ),
    },
  ];

  // ===================== RENDER =====================
  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Departments" }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Departments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage departments and employee assignments
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition shadow-sm hover:shadow-md"
        >
          <span className="text-xl leading-none">+</span> Add Department
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchDepartments} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-6"><SkeletonLoader rows={6} columns={columns.length} /></div>
          ) : (
            <DataTable columns={columns} data={departments} emptyMessage="No departments found." />
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingDept ? "Edit Department" : "Add Department"}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Department Name"
            name="name"
            value={form.name}
            onChange={handleFormChange}
            required
            placeholder="e.g. Engineering"
          />
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingDept ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}