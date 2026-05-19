// App.jsx – Workforce Flow Management System
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useState } from "react";

import NotificationsBell from "./components/NotificationsBell";
import ThemeToggle from "./components/ThemeToggle";

// Auth Context
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Dashboard from "./pages/Dashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Employees from "./pages/Employees";
import ReportsPage from "./pages/ReportsPage";
import Notifications from "./pages/Notifications";
import AuditLogs from "./pages/AuditLogs";
import ProfilePage from "./pages/ProfilePage";
import EmailSettingsPage from "./pages/EmailSettingsPage";
import ChatPage from "./pages/ChatPage";

// New Workforce Flow Pages
import DepartmentManagementPage from "./pages/DepartmentManagementPage";
import RoleManagementPage from "./pages/RoleManagementPage";
import LeaveApplyPage from "./pages/LeaveApplyPage";
import LeaveApprovalPage from "./pages/LeaveApprovalPage";
import AttendancePage from "./pages/AttendancePage";
import DocumentsPage from "./pages/DocumentsPage";

// Attrition Prediction Pages
import AttritionUpload from "./pages/AttritionUpload";
import AttritionDashboard from "./pages/AttritionDashboard";

// Phase 2 – HR Attrition Intelligence & Prediction Enhancements
import DatasetManagementPage from "./pages/DatasetManagementPage";
import AttritionForecast from "./pages/AttritionForecast";
import AttritionAnalytics from "./pages/AttritionAnalytics";
import HighRiskMonitoring from "./pages/HighRiskMonitoring";
import AlertSettingsPage from "./pages/AlertSettingsPage";
import AlertEmailHistory from "./pages/AlertEmailHistory";
import HRInterventionPage from "./pages/HRInterventionPage";
import AttritionReports from "./pages/AttritionReports";
import AttritionActivityFeed from "./pages/AttritionActivityFeed";
import WorkforceRiskDashboard from "./pages/WorkforceRiskDashboard";
import ForecastAnalyticsDashboard from "./pages/ForecastAnalyticsDashboard";
import LiveMonitoringDashboard from "./pages/LiveMonitoringDashboard";
import SmartNotifications from "./pages/SmartNotifications";
import AdvancedAttritionInsights from "./pages/AdvancedAttritionInsights";
import HRDecisionSupport from "./pages/HRDecisionSupport";
import WorkforceStabilityDashboard from "./pages/WorkforceStabilityDashboard";

// ---------- Protected Route ----------
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.map(r =>r.toLowerCase()).includes(user.role?.toLowerCase())) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

// ---------- Role‑based dashboard helper ----------
function RoleDashboard() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();
  if (role === "employee") return <EmployeeDashboard />;
  return <Dashboard />;
}

// ---------- Authenticated Layout (sidebar + header) ----------
function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role?.toLowerCase() || "employee";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPage = location.pathname.split("/")[1] || "dashboard";
  const pageTitle =
    currentPage === "dashboard"
      ? `${role} Dashboard`
      : currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");
  const navClass = (path) =>
    `group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 w-full ${
      isActive(path)
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
        : "text-gray-400 dark:text-gray-500 hover:bg-gray-800 hover:text-white"
    }`;

  const icons = {
    dashboard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    employees: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    profile: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    departments: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    roles: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    leave: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    attendance: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    documents: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    reports: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    notifications: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    emailSettings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    chat: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    attrition: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900/60">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col shadow-2xl transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="px-6 pt-8 pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-blue-300 bg-clip-text text-transparent">
            WFMS
          </h1>
          <p className="text-xs text-gray-500 mt-1">Workforce Flow Management</p>
        </div>

        <div className="mx-4 mt-6 p-4 bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/50 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg uppercase">
            {role.charAt(0)}
          </div>
          <div>
            <p className="text-lg font-semibold capitalize text-white leading-tight">{role}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto mt-6 space-y-1">
          {/* ✅ Single Dashboard link for all roles */}
          <button onClick={() => { navigate("/dashboard"); setSidebarOpen(false); }} className={navClass("/dashboard")}>
            {icons.dashboard} <span>Dashboard</span>
          </button>

          <button onClick={() => { navigate("/profile"); setSidebarOpen(false); }} className={navClass("/profile")}>
            {icons.profile} <span>My Profile</span>
          </button>

          <button onClick={() => { navigate("/chat"); setSidebarOpen(false); }} className={navClass("/chat")}>
            {icons.chat} <span>Chat</span>
          </button>

          <button onClick={() => { navigate("/leave-apply"); setSidebarOpen(false); }} className={navClass("/leave-apply")}>
            {icons.leave} <span>Apply Leave</span>
          </button>

          {role === "employee" && (
            <button onClick={() => { navigate("/attendance"); setSidebarOpen(false); }} className={navClass("/attendance")}>
              {icons.attendance} <span>Attendance</span>
            </button>
          )}

          {(role === "admin" || role === "hr") && (
            <>
              <button onClick={() => { navigate("/employees"); setSidebarOpen(false); }} className={navClass("/employees")}>
                {icons.employees} <span>Employees</span>
              </button>
              <button onClick={() => { navigate("/leave-approval"); setSidebarOpen(false); }} className={navClass("/leave-approval")}>
                {icons.leave} <span>Leave Approval</span>
              </button>
              <button onClick={() => { navigate("/documents"); setSidebarOpen(false); }} className={navClass("/documents")}>
                {icons.documents} <span>Documents</span>
              </button>
              <button onClick={() => { navigate("/departments"); setSidebarOpen(false); }} className={navClass("/departments")}>
                {icons.departments} <span>Departments</span>
              </button>
              <button onClick={() => { navigate("/role-management"); setSidebarOpen(false); }} className={navClass("/role-management")}>
                {icons.roles} <span>Role Management</span>
              </button>
              <button onClick={() => { navigate("/audit-logs"); setSidebarOpen(false); }} className={navClass("/audit-logs")}>
                {icons.notifications} <span>Audit Logs</span>
              </button>
              {/* Attrition Prediction – HR/Admin only */}
              {(role === "admin" || role === "hr") && (
                <>
                  <button onClick={() => { navigate("/attrition-upload"); setSidebarOpen(false); }} className={navClass("/attrition-upload")}>
                    {icons.attrition} <span>Upload Dataset</span>
                  </button>
                  <button onClick={() => { navigate("/attrition-dashboard"); setSidebarOpen(false); }} className={navClass("/attrition-dashboard")}>
                    {icons.attrition} <span>Attrition Dashboard</span>
                  </button>
                  <button onClick={() => { navigate("/dataset-management"); setSidebarOpen(false); }} className={navClass("/dataset-management")}>
                    {icons.documents} <span>Dataset Management</span>
                  </button>
                  <button onClick={() => { navigate("/attrition-forecast"); setSidebarOpen(false); }} className={navClass("/attrition-forecast")}>
                    {icons.attrition} <span>Attrition Forecast</span>
                  </button>
                  <button onClick={() => { navigate("/attrition-analytics"); setSidebarOpen(false); }} className={navClass("/attrition-analytics")}>
                    {icons.attrition} <span>Attrition Analytics</span>
                  </button>
                  <button onClick={() => { navigate("/risk-monitoring"); setSidebarOpen(false); }} className={navClass("/risk-monitoring")}>
                    {icons.attrition} <span>Risk Monitoring</span>
                  </button>
                  <button onClick={() => { navigate("/alert-settings"); setSidebarOpen(false); }} className={navClass("/alert-settings")}>
                    {icons.notifications} <span>Alert Settings</span>
                  </button>
                  <button onClick={() => { navigate("/alert-email-history"); setSidebarOpen(false); }} className={navClass("/alert-email-history")}>
                    {icons.emailSettings} <span>Alert Email History</span>
                  </button>
                  <button onClick={() => { navigate("/hr-interventions"); setSidebarOpen(false); }} className={navClass("/hr-interventions")}>
                    {icons.attrition} <span>HR Interventions</span>
                  </button>
                  <button onClick={() => { navigate("/attrition-reports"); setSidebarOpen(false); }} className={navClass("/attrition-reports")}>
                    {icons.reports} <span>Attrition Reports</span>
                  </button>
                  <button onClick={() => { navigate("/attrition-activity"); setSidebarOpen(false); }} className={navClass("/attrition-activity")}>
                    {icons.attrition} <span>Attrition Activity</span>
                  </button>
                  <button onClick={() => { navigate("/workforce-risk"); setSidebarOpen(false); }} className={navClass("/workforce-risk")}>
                    {icons.attrition} <span>Workforce Risk</span>
                  </button>
                  <button onClick={() => { navigate("/forecast-analytics"); setSidebarOpen(false); }} className={navClass("/forecast-analytics")}>
                    {icons.attrition} <span>Forecast Analytics</span>
                  </button>
                  <button onClick={() => { navigate("/live-monitoring"); setSidebarOpen(false); }} className={navClass("/live-monitoring")}>
                    {icons.attrition} <span>Live Monitoring</span>
                  </button>
                  <button onClick={() => { navigate("/smart-notifications"); setSidebarOpen(false); }} className={navClass("/smart-notifications")}>
                    {icons.notifications} <span>Smart Notifications</span>
                  </button>
                  <button onClick={() => { navigate("/advanced-insights"); setSidebarOpen(false); }} className={navClass("/advanced-insights")}>
                    {icons.attrition} <span>Advanced Insights</span>
                  </button>
                  <button onClick={() => { navigate("/decision-support"); setSidebarOpen(false); }} className={navClass("/decision-support")}>
                    {icons.attrition} <span>Decision Support</span>
                  </button>
                  <button onClick={() => { navigate("/workforce-stability"); setSidebarOpen(false); }} className={navClass("/workforce-stability")}>
                    {icons.attrition} <span>Stability Engine</span>
                  </button>
                </>
              )}
            </>
          )}

          {role === "admin" && (
            <>
              <button onClick={() => { navigate("/notifications"); setSidebarOpen(false); }} className={navClass("/notifications")}>
                {icons.notifications} <span>Notifications</span>
              </button>
              <button onClick={() => { navigate("/reports"); setSidebarOpen(false); }} className={navClass("/reports")}>
                {icons.reports} <span>Reports</span>
              </button>
              <button onClick={() => { navigate("/email-settings"); setSidebarOpen(false); }} className={navClass("/email-settings")}>
                {icons.emailSettings} <span>Email Settings</span>
              </button>
            </>
          )}
        </nav>

        <div className="px-4 pb-6 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl font-semibold text-sm transition-all border border-red-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white capitalize">{pageTitle}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Workforce Flow Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <ThemeToggle />
            <span className="text-xs text-gray-400 dark:text-gray-300 uppercase tracking-wide">Role</span>
            <span className="px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-200 text-sm font-semibold capitalize border border-indigo-100 dark:border-indigo-600">
              {role}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-7xl mx-auto p-4 md:p-6 w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------- Main App ----------
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin", "hr", "employee"]}>
                  <RoleDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="profile" element={
              <ProtectedRoute allowedRoles={["employee", "admin", "hr"]}>
                <ProfilePage />
              </ProtectedRoute>
            } />

            <Route path="chat" element={
              <ProtectedRoute allowedRoles={["employee", "admin", "hr"]}>
                <ChatPage />
              </ProtectedRoute>
            } />

            <Route path="attendance" element={
              <ProtectedRoute allowedRoles={["employee"]}>
                <AttendancePage />
              </ProtectedRoute>
            } />

            <Route path="leave-apply" element={
              <ProtectedRoute allowedRoles={["employee", "admin", "hr"]}>
                <LeaveApplyPage />
              </ProtectedRoute>
            } />

            <Route path="employees" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <Employees />
              </ProtectedRoute>
            } />
            <Route path="leave-approval" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <LeaveApprovalPage />
              </ProtectedRoute>
            } />
            <Route path="documents" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <DocumentsPage />
              </ProtectedRoute>
            } />
            <Route path="departments" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <DepartmentManagementPage />
              </ProtectedRoute>
            } />
            <Route path="role-management" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <RoleManagementPage />
              </ProtectedRoute>
            } />
            <Route path="audit-logs" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <AuditLogs />
              </ProtectedRoute>
            } />

            {/* Attrition Prediction – HR/Admin only */}
            <Route path="attrition-upload" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <AttritionUpload />
              </ProtectedRoute>
            } />
            <Route path="attrition-dashboard" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <AttritionDashboard />
              </ProtectedRoute>
            } />
            <Route path="dataset-management" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <DatasetManagementPage />
              </ProtectedRoute>
            } />
            <Route path="attrition-forecast" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <AttritionForecast />
              </ProtectedRoute>
            } />
            <Route path="attrition-analytics" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <AttritionAnalytics />
              </ProtectedRoute>
            } />
            <Route path="risk-monitoring" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <HighRiskMonitoring />
              </ProtectedRoute>
            } />
            <Route path="alert-settings" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <AlertSettingsPage />
              </ProtectedRoute>
            } />
            <Route path="alert-email-history" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <AlertEmailHistory />
              </ProtectedRoute>
            } />
            <Route path="hr-interventions" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <HRInterventionPage />
              </ProtectedRoute>
            } />
            <Route path="attrition-reports" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <AttritionReports />
              </ProtectedRoute>
            } />
            <Route path="attrition-activity" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <AttritionActivityFeed />
              </ProtectedRoute>
            } />
            <Route path="workforce-risk" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <WorkforceRiskDashboard />
              </ProtectedRoute>
            } />
            <Route path="forecast-analytics" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <ForecastAnalyticsDashboard />
              </ProtectedRoute>
            } />
            <Route path="live-monitoring" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <LiveMonitoringDashboard />
              </ProtectedRoute>
            } />
            <Route path="smart-notifications" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <SmartNotifications />
              </ProtectedRoute>
            } />
            <Route path="advanced-insights" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <AdvancedAttritionInsights />
              </ProtectedRoute>
            } />
            <Route path="decision-support" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <HRDecisionSupport />
              </ProtectedRoute>
            } />
            <Route path="workforce-stability" element={
              <ProtectedRoute allowedRoles={["admin", "hr"]}>
                <WorkforceStabilityDashboard />
              </ProtectedRoute>
            } />

            <Route path="notifications" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Notifications />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <ReportsPage />
              </ProtectedRoute>
            } />
            <Route path="email-settings" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <EmailSettingsPage />
              </ProtectedRoute>
            } />

            <Route path="*" element={
              <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow text-center">
                <h2 className="text-2xl font-bold text-gray-700 dark:text-white">Page Not Found</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-3">The requested page does not exist</p>
              </div>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </BrowserRouter>
    </AuthProvider>
  );
}