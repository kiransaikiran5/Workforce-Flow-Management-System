// AuditLogs.jsx – Workforce Flow Management System
import { useState, useEffect, useCallback } from "react";
import API from "../api";
import { toast } from "react-toastify";
import Breadcrumbs from "../components/common/Breadcrumbs";
import Button from "../components/common/Button";
import Card from "../components/common/Card";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/audit-logs?page=${page}&limit=${limit}`);
      const data = res.data;
      // Handle both possible response shapes
      const logArray = data.logs || data.data || (Array.isArray(data) ? data : []);
      setLogs(logArray);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs
        items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Audit Logs" }]}
      />
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>

      <Card>
        {loading ? (
          <p className="text-center text-gray-500">Loading logs…</p>
        ) : logs.length === 0 ? (
          <p className="text-center text-gray-500">No audit logs found.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="p-2">ID</th>
                <th className="p-2">Performed By</th>
                <th className="p-2">Action</th>
                <th className="p-2">Target</th>
                <th className="p-2">Details</th>
                <th className="p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="p-2">{log.id}</td>
                  <td className="p-2">{log.performed_by}</td>
                  <td className="p-2">{log.action}</td>
                  <td className="p-2">{log.target || "—"}</td>
                  <td className="p-2 text-sm max-w-xs truncate">{log.details || "—"}</td>
                  <td className="p-2 text-sm">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-between items-center mt-4">
            <Button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <Button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              variant="outline"
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}