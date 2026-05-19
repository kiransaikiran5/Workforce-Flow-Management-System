// src/components/Sidebar.jsx – Workforce Flow Management System
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Icon components (inline SVGs)
const Icon = ({ d, className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
  </svg>
);

const icons = {
  dashboard: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  employees: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  leave: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  attendance: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  documents: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  departments: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  roles: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  reports: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  notifications: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  audit: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  email: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  chat: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  profile: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  attrition: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role?.toLowerCase() || "employee";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const commonItems = [
    { to: role === "employee" ? "/employee-dashboard" : "/dashboard", icon: icons.dashboard, label: "Dashboard" },
    { to: "/profile", icon: icons.profile, label: "My Profile" },
    { to: "/chat", icon: icons.chat, label: "Chat" },
    { to: "/leave-apply", icon: icons.leave, label: "Apply Leave" },
  ];

  const employeeItems = [
    { to: "/attendance", icon: icons.attendance, label: "Attendance" },
  ];

  const adminHrItems = [
    { to: "/employees", icon: icons.employees, label: "Employees" },
    { to: "/leave-approval", icon: icons.leave, label: "Leave Approval" },
    { to: "/documents", icon: icons.documents, label: "Documents" },
    { to: "/departments", icon: icons.departments, label: "Departments" },
    { to: "/role-management", icon: icons.roles, label: "Role Management" },
    { to: "/audit-logs", icon: icons.audit, label: "Audit Logs" },
    { to: "/attrition-upload", icon: icons.attrition, label: "Upload Dataset" },
    { to: "/attrition-dashboard", icon: icons.attrition, label: "Attrition Dashboard" },
    { to: "/dataset-management", icon: icons.documents, label: "Dataset Management" },
    { to: "/attrition-forecast", icon: icons.attrition, label: "Attrition Forecast" },
    { to: "/attrition-analytics", icon: icons.attrition, label: "Attrition Analytics" },
    { to: "/risk-monitoring", icon: icons.attendance, label: "High Risk Monitoring" },
    { to: "/alert-settings", icon: icons.email, label: "Alert Settings" },
    { to: "/alert-email-history", icon: icons.email, label: "Email History" },
    { to: "/hr-interventions", icon: icons.chat, label: "HR Interventions" },
    { to: "/attrition-reports", icon: icons.reports, label: "Attrition Reports" },
    { to: "/attrition-activity", icon: icons.attendance, label: "Live Activity" },
    { to: "/workforce-risk", icon: icons.attrition, label: "Risk Analysis" },
    { to: "/forecast-analytics", icon: icons.attrition, label: "AI Forecasting" },
    { to: "/live-monitoring", icon: icons.attendance, label: "Live Monitoring" },
    { to: "/smart-notifications", icon: icons.notifications, label: "Smart Alerts" },
    { to: "/advanced-insights", icon: icons.reports, label: "Advanced Insights" },
    { to: "/decision-support", icon: icons.attrition, label: "Decision Support" },
    { to: "/workforce-stability", icon: icons.attrition, label: "Stability Engine" },
  ];

  const adminOnlyItems = [
    { to: "/notifications", icon: icons.notifications, label: "Notifications" },
    { to: "/reports", icon: icons.reports, label: "Reports" },
    { to: "/email-settings", icon: icons.email, label: "Email Settings" },
  ];

  const menuItems = [...commonItems];
  if (role === "employee") menuItems.push(...employeeItems);
  if (["admin", "hr"].includes(role)) menuItems.push(...adminHrItems);
  if (role === "admin") menuItems.push(...adminOnlyItems);

  return (
    <aside className="w-64 min-h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col shadow-xl">
      {/* Branding */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-100 dark:border-gray-700">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-200">
          W
        </div>
        <div className="leading-tight">
          <p className="text-lg font-bold text-gray-800 dark:text-gray-200 tracking-tight">WFMS</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium -mt-0.5">
            Workforce Flow Management
          </p>
        </div>
      </div>

      {/* User info */}
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-1">
          Logged In As
        </p>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold">
            {role.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{role}</span>
          <span className="ml-auto w-2 h-2 rounded-full bg-green-400"></span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-800"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
              }`
            }
          >
            <Icon d={item.icon} className="w-5 h-5 mr-3 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200"
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}