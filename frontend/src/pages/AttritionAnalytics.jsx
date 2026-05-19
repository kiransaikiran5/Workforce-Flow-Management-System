import { useEffect, useState, useCallback } from "react";
import API from "../api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { toast } from "react-toastify";
import SkeletonLoader from "../components/common/SkeletonLoader";
import Input from "../components/common/Input";            // optional – can use plain inputs

// ── Colour palette ─────────────────────────────────
const RISK_COLORS = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#10b981"
};

// ── Summary Card ───────────────────────────────────
function SummaryCard({ title, value, subtitle, color = "indigo" }) {
  const colorMap = {
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300",
    red: "border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300",
    green: "border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300",
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colorMap[color] || colorMap.indigo}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{title}</p>
      <h2 className="text-3xl font-extrabold mt-1">{value}</h2>
      {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
    </div>
  );
}

// ── Heatmap Component ──────────────────────────────
function Heatmap({ data }) {
  const categories = ["high", "medium", "low"];
  const maxCount = Math.max(...data.map(d => d.total), 1);

  const getColor = (count) => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return "bg-red-500 text-white";
    if (ratio > 0.5) return "bg-orange-400 text-white";
    if (ratio > 0.2) return "bg-yellow-300 text-black";
    return "bg-green-200 text-black";
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Department</th>
            {categories.map(c => <th key={c} className="px-3 py-2 capitalize text-center font-medium">{c}</th>)}
            <th className="px-4 py-2 text-center font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.department} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-4 py-2.5 font-medium">{row.department || "—"}</td>
              {categories.map(cat => (
                <td key={cat} className="px-3 py-2.5 text-center align-middle">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getColor(row[cat])}`}>
                    {row[cat] ?? 0}
                  </span>
                </td>
              ))}
              <td className="px-4 py-2.5 text-center font-bold">{row.total ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Attrition Analytics Page ──────────────────
export default function AttritionAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [yearly, setYearly] = useState([]);
  const [deptTrend, setDeptTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- NEW FILTER STATE ----
  const [yearFilter, setYearFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [riskCategoryFilter, setRiskCategoryFilter] = useState("");   // High, Medium, Low or empty

  // Available departments (can be fetched, but we'll extract from yearly or analytics)
  const [departments, setDepartments] = useState([]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      if (yearFilter) params.append("year", yearFilter);
      if (departmentFilter) params.append("department", departmentFilter);
      if (dateFromFilter) params.append("date_from", dateFromFilter);
      if (dateToFilter) params.append("date_to", dateToFilter);
      if (riskCategoryFilter) params.append("risk_category", riskCategoryFilter);

      const [dashboardRes, yearlyRes, trendRes] = await Promise.all([
        API.get(`/analytics/dashboard?${params.toString()}`),
        API.get("/analytics/yearly-summary"),   // yearly summary doesn't need filters (or adapt)
        API.get(`/analytics/department-trend?${params.toString()}`)
      ]);

      setAnalytics(dashboardRes.data);
      setYearly(yearlyRes.data || []);
      setDeptTrend(trendRes.data || []);

      // Extract unique departments from dashboard heatmap for filter dropdown
      if (dashboardRes.data?.heatmap) {
        const deptSet = new Set(dashboardRes.data.heatmap.map(d => d.department).filter(Boolean));
        setDepartments(Array.from(deptSet));
      }
    } catch (err) {
      toast.error("Failed to load attrition analytics");
    } finally {
      setLoading(false);
    }
  }, [yearFilter, departmentFilter, dateFromFilter, dateToFilter, riskCategoryFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ---- Derived data ----
  const turnoverData = analytics?.turnover_stats?.map(t => ({ department: t.department, rate: t.turnover_rate })) || [];
  const topRiskList = analytics?.top_high_risk || [];
  const heatmap = analytics?.heatmap || [];
  const totalHighRisk = topRiskList.filter(e => e.risk_category === "High").length;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonLoader rows={4} columns={4} />
      </div>
    );
  }

  if (!analytics) {
    return <div className="p-6 text-center text-gray-500 dark:text-gray-400">No data available.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">
            Attrition Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Employee turnover insights, risk distribution, and predictions
          </p>
        </div>
      </div>

      {/* ── FILTERS (NEW) ──────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Years</option>
            {yearly.map(y => (
              <option key={y.year} value={y.year}>{y.year}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
            placeholder="From"
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
          />

          {/* Date To */}
          <input
            type="date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
            placeholder="To"
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
          />

          {/* Risk Category Filter */}
          <select
            value={riskCategoryFilter}
            onChange={(e) => setRiskCategoryFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Risk Levels</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Employees" value={analytics.total_employees || 0} color="indigo" />
        <SummaryCard title="Turnover Rate" value={`${analytics.overall_turnover_rate || 0}%`} color="yellow" />
        <SummaryCard title="High Risk" value={totalHighRisk} subtitle="Employees flagged" color="red" />
        <SummaryCard title="Avg Risk Score" value={`${analytics.average_risk_score || 0}%`} color="green" />
      </div>

      {/* Turnover Bar Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
          Employee Turnover Rate by Department
        </h2>
        {turnoverData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={turnoverData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="department" tick={{ fontSize: 12 }} />
              <YAxis unit="%" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="rate" fill="#6366f1" radius={[6, 6, 0, 0]} name="Turnover Rate" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-10">No turnover data available.</p>
        )}
      </div>

      {/* Top High-Risk Employees Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
          Top 10 High-Risk Employees
        </h2>
        {topRiskList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Employee</th>
                  <th className="px-4 py-2 text-left font-medium">Department</th>
                  <th className="px-4 py-2 text-center font-medium">Risk Score</th>
                  <th className="px-4 py-2 text-center font-medium">Confidence</th>
                  <th className="px-4 py-2 text-center font-medium">Category</th>
                </tr>
              </thead>
              <tbody>
                {topRiskList.map((emp, idx) => (
                  <tr key={emp.identifier || idx} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-2.5 font-medium">{emp.employee_name || emp.identifier}</td>
                    <td className="px-4 py-2.5">{emp.department || "—"}</td>
                    <td className="px-4 py-2.5 text-center">{emp.risk_percentage ?? 0}%</td>
                    <td className="px-4 py-2.5 text-center">{emp.confidence_score ?? 0}%</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        emp.risk_category === "High" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                        emp.risk_category === "Medium" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      }`}>
                        {emp.risk_category || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-10">No high-risk employees found.</p>
        )}
      </div>

      {/* Heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
          Risk Distribution Heatmap
        </h2>
        {heatmap.length > 0 ? (
          <Heatmap data={heatmap} />
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-10">No department data available.</p>
        )}
      </div>

      {/* Department-wise Trend (stacked bar with year filter) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
          Department-wise Attrition {yearFilter ? `(${yearFilter})` : ""}
        </h2>
        {deptTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deptTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="department" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="high_risk" stackId="a" fill={RISK_COLORS.High} name="High" />
              <Bar dataKey="medium_risk" stackId="a" fill={RISK_COLORS.Medium} name="Medium" />
              <Bar dataKey="low_risk" stackId="a" fill={RISK_COLORS.Low} name="Low" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-10">
            No trend data for the selected filters.
          </p>
        )}
      </div>
    </div>
  );
}