import { useEffect, useState } from "react";
import api from "../api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { toast } from "react-toastify";

export default function AdvancedAttritionInsights() {
  // Predictive summary states
  const [predictive, setPredictive] = useState(null);
  // Employee trend states
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeTrend, setEmployeeTrend] = useState([]);
  // Department forecast states
  const [deptForecast, setDeptForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [predictiveRes, employeesRes, deptRes] = await Promise.all([
          api.get("/reports/attrition/predictive-summary"),
          api.get("/employees/?limit=100"),
          api.get("/reports/attrition/department-forecast"),
        ]);
        setPredictive(predictiveRes.data);
        // Handle employee list response format (could be array or object with data property)
        const empList = employeesRes.data.data || employeesRes.data.employees || employeesRes.data;
        setEmployees(Array.isArray(empList) ? empList : []);
        setDeptForecast(deptRes.data);
      } catch {
        toast.error("Failed to load report data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchEmployeeTrend = async (empId) => {
    if (!empId) return;
    try {
      const res = await api.get(`/reports/attrition/employee-trend/${empId}`);
      setEmployeeTrend(res.data);
    } catch {
      toast.error("Failed to load employee trend");
    }
  };

  useEffect(() => {
    fetchEmployeeTrend(selectedEmployee);
  }, [selectedEmployee]);

  // ✅ Corrected export handler – uses authenticated Axios blob download
  const handleExport = async (format) => {
    const params = new URLSearchParams();
    // Optionally add filter params here if needed
    try {
      const res = await api.get(`/reports/attrition/export/${format}`, {
        params,
        responseType: "blob",
      });
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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
        Advanced Attrition Insights
      </h1>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      ) : (
        <>
          {/* Predictive Summary Cards */}
          {predictive && predictive.predicted_next_month && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500">Trend Direction</p>
                <p className="text-2xl font-bold capitalize text-indigo-600">
                  {predictive.trend}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500">Predicted High (Next Month)</p>
                <p className="text-2xl font-bold text-red-600">
                  {predictive.predicted_next_month.high}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500">Predicted Medium</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {predictive.predicted_next_month.medium}
                </p>
              </div>
            </div>
          )}

          {/* Employee Trend Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Employee Risk Trend</h2>
            <div className="mb-4">
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="border px-3 py-2 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                ))}
              </select>
            </div>
            {employeeTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={employeeTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="predicted_at" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="risk_score" stroke="#ef4444" name="Risk Score %" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-10">Select an employee to view trend.</p>
            )}
          </div>

          {/* Department Forecast Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Department Forecast (Next Month)</h2>
            {deptForecast.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deptForecast} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="predicted_high" fill="#ef4444" name="High" radius={[4,4,0,0]} />
                  <Bar dataKey="predicted_medium" fill="#f59e0b" name="Medium" radius={[0,0,4,4]} />
                  <Bar dataKey="predicted_low" fill="#10b981" name="Low" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-10">No department forecast data.</p>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => handleExport("excel")}
              className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition shadow-sm"
            >
              📥 Export Excel
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="inline-flex items-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-sm transition shadow-sm"
            >
              📄 Export PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}