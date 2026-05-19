import React, { useEffect, useState } from "react";
import api from "../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "react-toastify";
import RiskBadge from "../components/common/RiskBadge";

// Small inline confidence bar
const ConfidenceBar = ({ confidence }) => (
  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
    <div
      className="bg-blue-600 h-2.5 rounded-full"
      style={{ width: `${confidence}%` }}
    ></div>
  </div>
);

// Skeleton for loading states
const Skeleton = ({ className }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
  />
);

const AttritionDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [deptData, setDeptData] = useState([]);
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({ department: "", risk: "", page: 1 });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const res = await api.get("/predictions/summary");
      setSummary(res.data);
    } catch {
      toast.error("Could not load overall summary");
    }
  };

  const fetchDepartmentSummary = async () => {
    try {
      const res = await api.get("/predictions/department-summary");
      setDeptData(res.data);
    } catch {
      toast.error("Could not load department summary");
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.department) params.append("department", filters.department);
      if (filters.risk) params.append("risk_category", filters.risk);
      params.append("page", filters.page);
      params.append("limit", 20);
      const res = await api.get(`/predictions/results?${params.toString()}`);
      setResults(res.data);
    } catch {
      toast.error("Could not load predictions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchDepartmentSummary();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [filters]);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
      page: 1,
    }));
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">
        Attrition Prediction Dashboard
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summary ? (
          <>
            <SummaryCard
              title="Total Predicted"
              value={summary.total}
              icon="👥"
              color="bg-blue-50 dark:bg-blue-900/30"
            />
            <SummaryCard
              title="High Risk"
              value={summary.high}
              icon="🔴"
              color="bg-red-50 dark:bg-red-900/30"
              valueColor="text-red-700 dark:text-red-400"
            />
            <SummaryCard
              title="Medium Risk"
              value={summary.medium}
              icon="🟡"
              color="bg-yellow-50 dark:bg-yellow-900/30"
              valueColor="text-yellow-700 dark:text-yellow-400"
            />
            <SummaryCard
              title="Low Risk"
              value={summary.low}
              icon="🟢"
              color="bg-green-50 dark:bg-green-900/30"
              valueColor="text-green-700 dark:text-green-400"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl shadow p-5"
            >
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))
        )}
      </div>

      {/* Department chart + Recent predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">
            Department-wise Attrition Risk
          </h2>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptData}>
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="high_risk"
                  stackId="a"
                  fill="#ef4444"
                  name="High"
                />
                <Bar
                  dataKey="medium_risk"
                  stackId="a"
                  fill="#eab308"
                  name="Medium"
                />
                <Bar
                  dataKey="low_risk"
                  stackId="a"
                  fill="#22c55e"
                  name="Low"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <svg
                className="w-16 h-16 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-sm">
                No department data – predictions are not linked to existing
                employees.
              </p>
              <p className="text-xs mt-1">
                Include an{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  Email
                </code>{" "}
                column in your CSV that matches employee emails.
              </p>
            </div>
          )}
        </div>

        {/* Recent predictions mini cards */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">
            Recent Predictions
          </h2>
          {results.slice(0, 5).map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between py-2 border-b last:border-0 dark:border-gray-700"
            >
              <div>
                <p className="font-medium dark:text-white">
                  {r.employee_name || r.identifier}
                </p>
                <p className="text-xs text-gray-500">
                  {r.risk_percentage}% risk
                </p>
              </div>
              <RiskBadge level={r.risk_category} />
            </div>
          ))}
          {results.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">
              No predictions yet
            </p>
          )}
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input
            type="text"
            name="department"
            placeholder="Filter by department"
            value={filters.department}
            onChange={handleFilterChange}
            className="border rounded-lg px-4 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select
            name="risk"
            value={filters.risk}
            onChange={handleFilterChange}
            className="border rounded-lg px-4 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Risk</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <th className="py-2 pr-4">Employee</th>
                    <th className="py-2 pr-4">Identifier</th>
                    <th className="py-2 pr-4">Department</th>
                    <th className="py-2 pr-4">Risk %</th>
                    <th className="py-2 pr-4">Confidence</th>
                    <th className="py-2 pr-4">Risk Level</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition"
                    >
                      <td className="py-2 pr-4 dark:text-white">
                        {r.employee_name || "—"}
                      </td>
                      <td className="py-2 pr-4 dark:text-white">
                        {r.identifier}
                      </td>
                      <td className="py-2 pr-4 dark:text-white">
                        {r.department || "—"}
                      </td>
                      <td className="py-2 pr-4 dark:text-white">
                        {r.risk_percentage}%
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm dark:text-white">
                            {r.confidence_score}%
                          </span>
                          <ConfidenceBar confidence={r.confidence_score} />
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <RiskBadge level={r.risk_category} />
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => setSelected(r)}
                          className="text-blue-600 hover:underline text-sm font-medium"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {results.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-gray-400"
                      >
                        No predictions match the current filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <button
                disabled={filters.page === 1}
                onClick={() =>
                  setFilters((p) => ({ ...p, page: p.page - 1 }))
                }
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 dark:text-white disabled:opacity-50 hover:bg-gray-200 transition"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {filters.page}
              </span>
              <button
                onClick={() =>
                  setFilters((p) => ({ ...p, page: p.page + 1 }))
                }
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 transition"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal (improved with risk % and confidence) */}
      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold dark:text-white">
                Prediction Details
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Employee
                </p>
                <p className="font-medium dark:text-white">
                  {selected.employee_name || selected.identifier}
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Risk Percentage
                  </p>
                  <p className="font-medium dark:text-white">
                    {selected.risk_percentage}%
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Confidence
                  </p>
                  <p className="font-medium dark:text-white">
                    {selected.confidence_score}%
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Category
                  </p>
                  <RiskBadge level={selected.risk_category} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Risk Score
                  </p>
                  <p className="font-medium dark:text-white">
                    {selected.risk_score.toFixed(3)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Predicted At
                </p>
                <p className="font-medium dark:text-white">
                  {new Date(selected.predicted_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable summary card component
const SummaryCard = ({
  title,
  value,
  icon,
  color,
  valueColor = "text-gray-900 dark:text-white",
}) => (
  <div
    className={`rounded-xl shadow p-5 flex items-center gap-4 ${color} dark:bg-opacity-20`}
  >
    <span className="text-3xl">{icon}</span>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  </div>
);

export default AttritionDashboard;