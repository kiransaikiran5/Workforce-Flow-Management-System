import React, { useEffect, useState } from "react";
import api from "../api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import { toast } from "react-toastify";
import RiskBadge from "../components/common/RiskBadge";   // reuse existing badge

const WorkforceRiskDashboard = () => {
  const [healthIndicators, setHealthIndicators] = useState([]);
  const [employeeRisk, setEmployeeRisk] = useState({ items: [], total: 0 });
  const [instabilityPattern, setInstabilityPattern] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ department: "", risk: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.department) params.append("department", filters.department);
      if (filters.risk) params.append("risk_category", filters.risk);
      const [healthRes, employeeRes, instabilityRes] = await Promise.all([
        api.get("/risk-analysis/health-indicators"),
        api.get(`/risk-analysis/employee-risk?${params.toString()}&limit=50`),
        api.get("/risk-analysis/instability-pattern")
      ]);
      setHealthIndicators(healthRes.data);
      setEmployeeRisk(employeeRes.data);
      setInstabilityPattern(instabilityRes.data);
    } catch {
      toast.error("Failed to load risk analysis data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
        Workforce Risk Analysis
      </h1>

      {/* Health Indicators Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthIndicators.map(dept => (
          <div key={dept.department} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold dark:text-white">{dept.department}</h3>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Employees:</span>
                <span className="font-medium dark:text-white">{dept.total_employees}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">High Risk:</span>
                <span className="font-medium text-red-600">{dept.high_risk_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Avg Risk %:</span>
                <span className="font-medium dark:text-white">{dept.avg_risk_score}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Instability:</span>
                <span className="font-medium text-orange-600">{dept.instability_index}</span>
              </div>
            </div>
          </div>
        ))}
        {healthIndicators.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">No health data available.</p>
        )}
      </div>

      {/* Employee Risk Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input type="text" name="department" placeholder="Department filter" value={filters.department}
            onChange={handleFilterChange}
            className="border px-3 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          <select name="risk" value={filters.risk} onChange={handleFilterChange}
            className="border px-3 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">All Risk Levels</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Employee Risk & Retention</h2>
        {employeeRisk.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Risk Score</th>
                  <th className="px-4 py-3 text-left">Retention %</th>
                  <th className="px-4 py-3 text-left">Confidence</th>
                  <th className="px-4 py-3 text-left">Category</th>
                </tr>
              </thead>
              <tbody>
                {employeeRisk.items.map(emp => (
                  <tr key={emp.employee_id || emp.identifier} className="border-b dark:border-gray-700">
                    <td className="px-4 py-3">{emp.employee_name || emp.identifier}</td>
                    <td className="px-4 py-3">{emp.department || "—"}</td>
                    <td className="px-4 py-3">{emp.risk_score}%</td>
                    <td className="px-4 py-3">{emp.retention_score}%</td>
                    <td className="px-4 py-3">{emp.confidence_score}%</td>
                    <td className="px-4 py-3"><RiskBadge level={emp.risk_category} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No employees match the filters.</p>
        )}
      </div>

      {/* Instability Pattern Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Workforce Instability Pattern (12‑Month Trend)</h2>
        {instabilityPattern.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={instabilityPattern}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="high" stroke="#ef4444" name="High Risk" />
              <Line type="monotone" dataKey="medium" stroke="#f59e0b" name="Medium Risk" />
              <Line type="monotone" dataKey="low" stroke="#10b981" name="Low Risk" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No trend data available.</p>
        )}
      </div>
    </div>
  );
};

export default WorkforceRiskDashboard;