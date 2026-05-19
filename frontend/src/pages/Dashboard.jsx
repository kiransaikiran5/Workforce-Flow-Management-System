// pages/Dashboard.jsx
import { useEffect, useState, useMemo } from "react";
import API from "../api";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  Legend,
} from "recharts";
import SkeletonLoader from "../components/common/SkeletonLoader";
import ActivityFeed from "../components/common/ActivityFeed";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// ── Reusable SummaryCard (dark‑mode ready) ─────────────────
function SummaryCard({ title, value, icon, bgLight, textLight }) {
  const darkBg = bgLight.replace("bg-", "dark:bg-") + "/30";
  const darkText = textLight.replace("text-", "dark:text-");
  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 overflow-hidden border border-gray-100 dark:border-gray-700">
      <div className="absolute right-0 top-0 w-28 h-28 bg-white/20 dark:bg-gray-700/20 rounded-bl-3xl opacity-70 group-hover:scale-110 transition-transform" />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
          <h2 className={`text-4xl font-extrabold mt-2 ${textLight} ${darkText}`}>{value}</h2>
        </div>
        <div className={`p-3 rounded-xl ${bgLight} ${darkBg} text-2xl`}>{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ date_from: "", date_to: "", department: "" });

  // ✅ Lowercase role for case‑insensitive comparison
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const token = localStorage.getItem("token");

  useEffect(() => {
    // ✅ Allow both admin and HR to fetch dashboard data
    if (role !== "admin" && role !== "hr") {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filters.date_from) params.append("date_from", filters.date_from);
        if (filters.date_to) params.append("date_to", filters.date_to);
        if (filters.department) params.append("department", filters.department);

        const res = await API.get(`/admin/dashboard?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(err.response?.data?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role, filters, token]);

  const handleFilterChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Derived chart data
  const chartData = useMemo(
    () => stats?.departments?.map((d) => ({ name: d.department, value: d.count })) || [],
    [stats?.departments]
  );
  const attendanceData = useMemo(() => stats?.attendance_summary || [], [stats?.attendance_summary]);
  const leaveData = useMemo(() => stats?.leave_summary || [], [stats?.leave_summary]);

  const handlePrint = () => window.print();

  // ── Loading state ─────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-8">
        <SkeletonLoader rows={1} columns={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6"><SkeletonLoader rows={3} columns={2} /></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6"><SkeletonLoader rows={3} columns={2} /></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6"><SkeletonLoader rows={2} columns={1} /></div>
      </div>
    );
  }

  // ── Error state ─────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-10 bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm p-10 rounded-2xl shadow text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Dashboard Error</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Access restriction (non‑admin, non‑hr) ─────────────────
  if (role !== "admin" && role !== "hr") {
    return (
      <div className="min-h-screen flex items-center justify-center p-10 bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm p-10 rounded-2xl shadow text-center max-w-md">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Access Restricted</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  // ── Main Dashboard ─────────────────
  const dashboardTitle = role === "hr" ? "HR Dashboard" : "Admin Dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-gray-800 p-6 md:p-10 space-y-10">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            {dashboardTitle}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Real‑time overview of employees and departments</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange}
            className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
          <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange}
            className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
          <select name="department" value={filters.department} onChange={handleFilterChange}
            className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Marketing">Marketing</option>
            <option value="IT">IT</option>
            <option value="Sales">Sales</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
          </select>
          <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition flex items-center gap-2">
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* Summary Cards – Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title="Total Employees" value={stats?.total_employees || 0} icon="👥" bgLight="bg-indigo-100" textLight="text-indigo-600" />
        <SummaryCard title="Active Users" value={stats?.active_users || 0} icon="👤" bgLight="bg-green-100" textLight="text-green-600" />
        <SummaryCard title="Departments" value={stats?.departments?.length || 0} icon="🏢" bgLight="bg-blue-100" textLight="text-blue-600" />
        <SummaryCard title="New Hires" value={stats?.new_hires || 0} icon="🆕" bgLight="bg-purple-100" textLight="text-purple-600" />
      </div>

      {/* Summary Cards – Row 2 (Attendance / Leave / Payroll) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title="Present Today" value={stats?.present_today || 0} icon="✅" bgLight="bg-emerald-100" textLight="text-emerald-600" />
        <SummaryCard title="On Leave" value={stats?.on_leave || 0} icon="🏖️" bgLight="bg-orange-100" textLight="text-orange-600" />
        <SummaryCard title="Pending Approvals" value={stats?.pending_approvals || 0} icon="⏳" bgLight="bg-yellow-100" textLight="text-yellow-600" />
        <SummaryCard title="Total Salary" value={`$${(stats?.total_salary || 0).toLocaleString()}`} icon="💰" bgLight="bg-rose-100" textLight="text-rose-600" />
      </div>

      {/* Charts: Department Pie & Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution Pie */}
        <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-md border p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">📊 Department Distribution</h3>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55} paddingAngle={4} stroke="none">
                    {chartData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-4 mt-4 justify-center">
                {chartData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-full px-3 py-1 shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-medium">{entry.name}</span>
                    <span className="text-gray-400 dark:text-gray-500">({entry.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">No department data</div>
          )}
        </div>

        {/* Bar Chart – Employees by Department */}
        <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-md border p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">📈 Employees by Department</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={44} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">No data</div>
          )}
        </div>
      </div>

      {/* Attendance & Leave Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {attendanceData.length > 0 && (
          <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-md border p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">📅 Attendance Summary</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attendanceData}>
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {leaveData.length > 0 && (
          <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-md border p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🏖️ Leave Summary</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={leaveData} dataKey="value" nameKey="type" cx="50%" cy="50%" outerRadius={95} innerRadius={55} paddingAngle={4}>
                  {leaveData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Live Activity Feed */}
      <div className="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-md border p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          🔔 Recent Activity
        </h3>
        <ActivityFeed admin={true} limit={20} />
      </div>

      {/* Quick Actions (visible to both admin and hr) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button className="p-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition shadow-lg hover:shadow-xl flex items-center gap-4">
          <span className="text-3xl">➕</span>
          <div className="text-left"><div className="font-bold">Add Employee</div><div className="text-sm opacity-80">Create new record</div></div>
        </button>
        <button className="p-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition shadow-lg hover:shadow-xl flex items-center gap-4">
          <span className="text-3xl">📋</span>
          <div className="text-left"><div className="font-bold">Generate Report</div><div className="text-sm opacity-80">Export data</div></div>
        </button>
        <button className="p-6 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl transition shadow-lg hover:shadow-xl flex items-center gap-4">
          <span className="text-3xl">⚙️</span>
          <div className="text-left"><div className="font-bold">Settings</div><div className="text-sm opacity-80">System preferences</div></div>
        </button>
      </div>
    </div>
  );
}