import { useEffect, useState } from "react";
import api from "../api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "react-toastify";

const TrendBadge = ({ trend }) => {
  const colors = {
    improving: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    stable: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    declining: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[trend] || ""}`}>
      {trend}
    </span>
  );
};

export default function WorkforceStabilityDashboard() {
  const [overview, setOverview] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/stability/overview");
        setOverview(res.data.overall);
        setDepartments(res.data.departments || []);
      } catch {
        toast.error("Failed to load stability data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
        Workforce Stability Engine
      </h1>

      {/* Overall Stability Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Stability Score</p>
            <p className="text-3xl font-bold text-indigo-600">{overview.stability_score}%</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Retention Forecast</p>
            <p className="text-3xl font-bold text-emerald-600">{overview.retention_forecast}%</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Avg Risk Score</p>
            <p className="text-3xl font-bold text-red-600">{overview.avg_risk_percentage}%</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">Trend</p>
            <TrendBadge trend={overview.trend} />
          </div>
        </div>
      )}

      {/* Department Stability Table / Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Department Stability Overview</h2>
        {departments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Employees</th>
                  <th className="px-4 py-3 text-left">High Risk</th>
                  <th className="px-4 py-3 text-left">Avg Risk %</th>
                  <th className="px-4 py-3 text-left">Retention %</th>
                  <th className="px-4 py-3 text-left">Stability</th>
                  <th className="px-4 py-3 text-left">Trend</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr key={dept.department} className="border-b dark:border-gray-700">
                    <td className="px-4 py-3 font-medium">{dept.department}</td>
                    <td className="px-4 py-3">{dept.total_employees}</td>
                    <td className="px-4 py-3 text-red-600">{dept.high_risk_count}</td>
                    <td className="px-4 py-3">{dept.avg_risk_percentage}%</td>
                    <td className="px-4 py-3 text-emerald-600">{dept.retention_forecast}%</td>
                    <td className="px-4 py-3 font-bold">{dept.stability_score}%</td>
                    <td className="px-4 py-3"><TrendBadge trend={dept.trend} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No department data available.</p>
        )}
      </div>

      {/* Stability Score Comparison Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Stability Score by Department</h2>
        {departments.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departments}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="stability_score" fill="#6366f1" radius={[4,4,0,0]} name="Stability Score" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No data.</p>
        )}
      </div>
    </div>
  );
}