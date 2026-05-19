// pages/AttritionReports.jsx
import { useEffect, useState, useCallback } from "react";
import API from "../api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";
import { toast } from "react-toastify";

// ✅ Default imports
import Breadcrumbs from "../components/common/Breadcrumbs";
import SkeletonLoader from "../components/common/SkeletonLoader";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";

// ✅ Named imports – because these files use `export { Component }` or `export const Component`
import { SummaryCard } from "../components/common/SummaryCard";
import { DynamicTable } from "../components/common/DynamicTable";
import { ChartContainer } from "../components/common/ChartContainer";
import { FilterBar } from "../components/common/FilterBar";

const RISK_COLORS = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#10b981",
};

export default function AttritionReports() {
  const [department, setDepartment] = useState("");
  const [riskCategory, setRiskCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [summary, setSummary] = useState(null);
  const [highRiskData, setHighRiskData] = useState([]);
  const [deptSummary, setDeptSummary] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Safe error message extractor (handles FastAPI validation arrays) ──
  const extractErrorMessage = (err) => {
    const data = err.response?.data;
    if (!data) return "Failed to load report data";
    if (data.detail && Array.isArray(data.detail)) {
      return data.detail.map(e => e.msg).join(", ");
    }
    if (typeof data.detail === "string") return data.detail;
    return "Failed to load report data";
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (department) params.append("department", department);
      if (riskCategory) params.append("risk_category", riskCategory);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      // ✅ limit = 200 (max allowed by backend)
      const [summaryRes, highRiskRes, deptRes, trendRes] = await Promise.all([
        API.get("/predictions/summary"),
        API.get(`/reports/attrition/high-risk?${params.toString()}&limit=200`),
        API.get(`/reports/attrition/department-summary?${params.toString()}`),
        API.get(`/reports/attrition/monthly-trend?${params.toString()}`),
      ]);

      setSummary(summaryRes.data);
      setHighRiskData(highRiskRes.data.items || []);
      setDeptSummary(deptRes.data);
      setMonthlyTrend(trendRes.data);
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [department, riskCategory, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async (format) => {
    const params = new URLSearchParams();
    if (department) params.append("department", department);
    if (riskCategory) params.append("risk_category", riskCategory);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const url = `/reports/attrition/export/${format}?${params.toString()}`;
    try {
      const res = await API.get(url, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `attrition_report.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch {
      toast.error("Export failed");
    }
  };

  // Table columns for DynamicTable
  const tableColumns = [
    {
      key: "employee_name",
      label: "Employee",
      sortable: true,
      render: (row) => row.employee_name || row.identifier,
    },
    {
      key: "department",
      label: "Department",
      sortable: true,
      render: (row) => row.department || "—",
    },
    {
      key: "risk_score",
      label: "Risk Score (%)",
      sortable: true,
      render: (row) => row.risk_score + "%",
    },
    {
      key: "risk_category",
      label: "Category",
      sortable: true,
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.risk_category === "High"
            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            : row.risk_category === "Medium"
            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
        }`}>
          {row.risk_category}
        </span>
      ),
    },
    {
      key: "predicted_at",
      label: "Predicted At",
      sortable: true,
      render: (row) => new Date(row.predicted_at).toLocaleDateString(),
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-8">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Attrition Reports" }]} />

      {/* Header + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            Attrition Reports
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Detailed attrition analytics and high‑risk employee tracking
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleExport("excel")} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition shadow-sm">
            📥 Export Excel
          </button>
          <button onClick={() => handleExport("pdf")} className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-sm transition shadow-sm">
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Predictions" value={summary.total} icon="📊" bgLight="bg-blue-100" textLight="text-blue-700" />
          <SummaryCard title="High Risk" value={summary.high} icon="🔴" bgLight="bg-red-100" textLight="text-red-700" />
          <SummaryCard title="Medium Risk" value={summary.medium} icon="🟡" bgLight="bg-yellow-100" textLight="text-yellow-700" />
          <SummaryCard title="Low Risk" value={summary.low} icon="🟢" bgLight="bg-green-100" textLight="text-green-700" />
        </div>
      )}

      {/* Filters */}
      <FilterBar onApply={fetchData}>
        <input
          type="text" placeholder="Department" value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
        />
        <select value={riskCategory}
          onChange={(e) => setRiskCategory(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Risk Levels</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <input type="date" value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
        />
        <input type="date" value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
        />
      </FilterBar>

      {loading ? (
        <div className="space-y-6">
          <SkeletonLoader rows={5} columns={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Department‑wise Attrition">
              <SkeletonLoader rows={3} columns={2} />
            </ChartContainer>
            <ChartContainer title="Monthly Trend">
              <SkeletonLoader rows={3} columns={2} />
            </ChartContainer>
          </div>
        </div>
      ) : (
        <>
          {/* High‑Risk Employees – DynamicTable */}
          <ChartContainer title={`High‑Risk Employees (${highRiskData.length})`}>
            {highRiskData.length > 0 ? (
              <DynamicTable columns={tableColumns} data={highRiskData} pageSize={10} />
            ) : (
              <EmptyState />
            )}
          </ChartContainer>

          {/* Charts side‑by‑side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Department‑wise Attrition">
              {deptSummary.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={deptSummary} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
                    <Tooltip contentStyle={{ borderRadius: "8px" }} />
                    <Legend verticalAlign="top" />
                    <Bar dataKey="high" stackId="a" name="High" fill={RISK_COLORS.High} radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="medium" stackId="a" name="Medium" fill={RISK_COLORS.Medium} radius={[0, 0, 4, 4]} barSize={20} />
                    <Bar dataKey="low" stackId="a" name="Low" fill={RISK_COLORS.Low} radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </ChartContainer>

            <ChartContainer title="Monthly Trend">
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyTrend} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
                    <Tooltip contentStyle={{ borderRadius: "8px" }} />
                    <Legend verticalAlign="top" />
                    <Bar dataKey="high" stackId="a" name="High" fill={RISK_COLORS.High} radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="medium" stackId="a" name="Medium" fill={RISK_COLORS.Medium} radius={[0, 0, 4, 4]} barSize={20} />
                    <Bar dataKey="low" stackId="a" name="Low" fill={RISK_COLORS.Low} radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </ChartContainer>
          </div>
        </>
      )}
    </div>
  );
}