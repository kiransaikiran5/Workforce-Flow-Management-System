// LeaveApprovalPage.jsx – Workforce Flow Management System (final, correct)
import { useState, useEffect, useCallback } from "react";
import API from "../api";
import toast from "react-hot-toast";
import DataTable from "../components/common/DataTable";
import Breadcrumbs from "../components/common/Breadcrumbs";
import ErrorState from "../components/common/ErrorState";
import Badge from "../components/common/Badge";

export default function LeaveApprovalPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Correct endpoint – returns pending requests
      const res = await API.get("/leave/pending");
      setRequests(res.data || []);
    } catch (err) {
      setError("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const approve = async (id) => {
    try {
      await API.put(`/leave/${id}/approve`);
      toast.success("Request approved");
      fetchRequests();
    } catch (err) {
      toast.error("Failed to approve");
    }
  };

  const reject = async (id) => {
    try {
      await API.put(`/leave/${id}/reject`);
      toast.success("Request rejected");
      fetchRequests();
    } catch (err) {
      toast.error("Failed to reject");
    }
  };

  const getStatusBadge = (status) => {
    if (status === "approved") return <Badge variant="success">Approved</Badge>;
    if (status === "rejected") return <Badge variant="danger">Rejected</Badge>;
    return <Badge variant="warning">Pending</Badge>;
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "employee_id", label: "Employee ID" },
    { key: "leave_type", label: "Type" },
    { key: "start_date", label: "Start" },
    { key: "end_date", label: "End" },
    { key: "reason", label: "Reason" },
    { key: "status", label: "Status", render: (row) => getStatusBadge(row.status) },
    {
      key: "actions",
      label: "Actions",
      render: (row) =>
        row.status === "pending" ? (
          <div className="flex gap-2">
            <button onClick={() => approve(row.id)} className="text-green-600 hover:underline text-sm">
              Approve
            </button>
            <button onClick={() => reject(row.id)} className="text-red-600 hover:underline text-sm">
              Reject
            </button>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
  ];

  return (
    <div className="page-container space-y-6">
      <Breadcrumbs
        items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Leave Approval" }]}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Leave Approval
        </h1>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchRequests} />
      ) : (
        <DataTable
          columns={columns}
          data={requests}
          loading={loading}
          emptyMessage="No pending leave requests."
        />
      )}
    </div>
  );
}