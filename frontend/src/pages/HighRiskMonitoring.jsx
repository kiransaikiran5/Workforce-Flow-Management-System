import React, { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";
import RiskBadge from "../components/common/RiskBadge";

const HighRiskMonitoring = () => {
  const [highRiskEmps, setHighRiskEmps] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [riskHistory, setRiskHistory] = useState([]);

  const fetchData = async () => {
    try {
      const [empRes, alertRes] = await Promise.all([
        api.get("/monitoring/high-risk-employees"),
        api.get("/monitoring/alerts?limit=10")
      ]);
      setHighRiskEmps(empRes.data);
      setAlerts(alertRes.data);
    } catch {
      toast.error("Failed to load monitoring data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const markAsRead = async (alertId) => {
    try {
      await api.put(`/monitoring/alerts/${alertId}/read`);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
      toast.success("Alert marked as read");
    } catch {
      toast.error("Failed to update alert");
    }
  };

  const fetchRiskHistory = async (employeeId) => {
    try {
      const res = await api.get(`/monitoring/employee/${employeeId}/risk-history`);
      setRiskHistory(res.data);
    } catch {
      toast.error("Failed to load risk history");
    }
  };

  const openEmpDetails = (emp) => {
    setSelectedEmp(emp);
    fetchRiskHistory(emp.employee_id);
  };

  const unreadAlerts = alerts.filter(a => !a.is_read).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">High‑Risk Employee Monitoring</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔴</span>
            <div>
              <p className="text-sm text-gray-500">High‑Risk Employees</p>
              <p className="text-2xl font-bold text-red-700">{highRiskEmps.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            <div>
              <p className="text-sm text-gray-500">Unread Alerts</p>
              <p className="text-2xl font-bold text-orange-600">{unreadAlerts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <p className="text-sm text-gray-500">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-700">{alerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* High-risk employees table */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">High‑Risk Employees</h2>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />)}
            </div>
          ) : highRiskEmps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 pr-4">Employee</th>
                    <th className="py-2 pr-4">Department</th>
                    <th className="py-2 pr-4">Risk Score</th>
                    <th className="py-2 pr-4">Last Predicted</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {highRiskEmps.map(emp => (
                    <tr key={emp.employee_id} className="border-b dark:border-gray-700">
                      <td className="py-2 pr-4">{emp.employee_name || emp.identifier}</td>
                      <td className="py-2 pr-4">{emp.department || "—"}</td>
                      <td className="py-2 pr-4">
                        <span className="font-bold text-red-600">{emp.risk_percentage}%</span>
                      </td>
                      <td className="py-2 pr-4">{new Date(emp.predicted_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => openEmpDetails(emp)}
                          className="text-blue-600 hover:underline"
                        >
                          History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No high‑risk employees detected.
            </p>
          )}
        </div>

        {/* Alerts panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Recent Alerts</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${
                  alert.is_read
                    ? "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium dark:text-white">{alert.message}</p>
                  {!alert.is_read && (
                    <button
                      onClick={() => markAsRead(alert.id)}
                      className="text-xs text-blue-600 hover:underline ml-2"
                    >
                      Read
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No alerts.</p>
            )}
          </div>
        </div>
      </div>

      {/* Risk history modal */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold dark:text-white">
                Risk History – {selectedEmp.employee_name || selectedEmp.identifier}
              </h2>
              <button onClick={() => setSelectedEmp(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            {riskHistory.length > 0 ? (
              <ul className="space-y-3">
                {riskHistory.map(log => (
                  <li key={log.id} className="border-b pb-2 dark:border-gray-700">
                    <p className="text-sm dark:text-white">
                      <span className="font-medium">Change:</span> {log.change_type}
                    </p>
                    <p className="text-sm">
                      Risk: {log.previous_risk_score != null ? (log.previous_risk_score * 100).toFixed(1)+"%" : "N/A"} → {(log.new_risk_score * 100).toFixed(1)+"%"}
                      {log.previous_category && log.new_category && (
                        <span className="ml-2">
                          <RiskBadge level={log.previous_category} /> → <RiskBadge level={log.new_category} />
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 py-4">No history available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HighRiskMonitoring;