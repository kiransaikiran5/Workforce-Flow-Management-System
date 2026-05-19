import { useState, useEffect, useCallback } from "react";
import API from "../api";
import toast from "react-hot-toast";
import DataTable from "../components/common/DataTable";
import Breadcrumbs from "../components/common/Breadcrumbs";
import ErrorState from "../components/common/ErrorState";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Badge from "../components/common/Badge";

export default function RoleManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("employee");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get("/admin/users");
      setUsers(res.data || []);
    } catch (err) {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openRoleModal = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setModalOpen(true);
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !selectedRole) return;
    try {
      await API.put(`/admin/users/${selectedUser.id}/role`, { role: selectedRole });
      toast.success(`Role updated to ${selectedRole}`);
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update role");
    }
  };

  const getRoleBadge = (role) => {
    if (role === "admin") return <Badge variant="danger">Admin</Badge>;
    // if (role === "manager") return <Badge variant="warning">Manager</Badge>;
    if (role === "hr") return <Badge variant="info">HR</Badge>;
    return <Badge>Employee</Badge>;
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: (row) => getRoleBadge(row.role) },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button onClick={() => openRoleModal(row)} className="text-indigo-600 hover:underline text-sm">
          Change Role
        </button>
      ),
    },
  ];

  return (
    <div className="page-container space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Role Management" }]} />
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Role Management</h1>

      {error ? (
        <ErrorState message={error} onRetry={fetchUsers} />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="No users found."
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Change Role for ${selectedUser?.name}`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRoleChange}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Current role: {selectedUser?.role}</p>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full border rounded-lg p-2.5 dark:bg-gray-700 dark:text-white"
          >
            <option value="employee">Employee</option>
            {/* <option value="manager">Manager</option> */}
            <option value="hr">HR</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}