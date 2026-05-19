import { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  low: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export default function SmartNotifications() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: "", priority: "", acknowledged: "" });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.acknowledged !== "") params.append("acknowledged", filters.acknowledged);
      params.append("page", page);
      params.append("limit", 15);
      const res = await api.get(`/monitoring/smart-alerts?${params.toString()}`);
      setAlerts(res.data.alerts);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filters, page]);

  const acknowledgeAlert = async (id) => {
    try {
      await api.put(`/monitoring/alerts/${id}/acknowledge`);
      toast.success("Alert acknowledged");
      fetchAlerts();
    } catch {
      toast.error("Failed to acknowledge alert");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
        Smart Notifications
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
        <select
          value={filters.category}
          onChange={(e) => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}
          className="border px-3 py-2 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">All Categories</option>
          <option value="risk_escalation">Risk Escalation</option>
          <option value="department_surge">Department Surge</option>
          <option value="persistent_high_risk">Persistent High Risk</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1); }}
          className="border px-3 py-2 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filters.acknowledged}
          onChange={(e) => { setFilters(f => ({ ...f, acknowledged: e.target.value })); setPage(1); }}
          className="border px-3 py-2 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">All Status</option>
          <option value="false">Unacknowledged</option>
          <option value="true">Acknowledged</option>
        </select>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No smart alerts found.</div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-4 flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[alert.priority] || ''}`}>
                    {alert.priority.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 uppercase">{alert.category?.replace('_', ' ')}</span>
                </div>
                <p className="text-sm text-gray-800 dark:text-white">{alert.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(alert.created_at).toLocaleString()} · {alert.employee_name}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {!alert.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full hover:bg-indigo-200 transition"
                  >
                    Acknowledge
                  </button>
                )}
                {alert.acknowledged && (
                  <span className="text-xs text-green-600 font-medium">✓ Acknowledged</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 15 && (
        <div className="flex justify-between mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Previous</button>
          <span className="text-sm">Page {page}</span>
          <button disabled={page * 15 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}