// ReportsPage.jsx – Workforce Flow Management System (Module 10)
import { useState, useEffect, useCallback } from "react";
import API from "../api";
import { toast } from "react-toastify";
import Input from "../components/common/Input";
import DataTable from "../components/common/DataTable";
import Breadcrumbs from "../components/common/Breadcrumbs";
import ErrorState from "../components/common/ErrorState";

// ── Debounce hook ──────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ── Pagination ─────────────────────────────────────
function Pagination({ page, perPage, total, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                     disabled:opacity-40 disabled:cursor-not-allowed
                     hover:bg-gray-50 dark:hover:bg-gray-700
                     text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition"
        >
          Previous
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                     disabled:opacity-40 disabled:cursor-not-allowed
                     hover:bg-gray-50 dark:hover:bg-gray-700
                     text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ── Spinner (for export buttons) ──────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Main Reports component ─────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState("employee");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const pageSize = 10;

  // ── Employee filters ──
  const [empSearchInput, setEmpSearchInput] = useState("");
  const empSearch = useDebounce(empSearchInput, 300);
  const [empDateFrom, setEmpDateFrom] = useState("");
  const [empDateTo, setEmpDateTo] = useState("");
  const [empDepartment, setEmpDepartment] = useState("");

  // ── Attendance filters ──
  const [attDateFrom, setAttDateFrom] = useState("");
  const [attDateTo, setAttDateTo] = useState("");
  const [attEmployeeId, setAttEmployeeId] = useState("");
  const [attStatus, setAttStatus] = useState("");

  // ── Leave filters ──
  const [leaveDateFrom, setLeaveDateFrom] = useState("");
  const [leaveDateTo, setLeaveDateTo] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [leaveStatus, setLeaveStatus] = useState("");

  // ── Fetch data based on active tab ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, page_size: pageSize });

      if (tab === "employee") {
        if (empSearch) params.append("search", empSearch);
        if (empDateFrom) params.append("date_from", empDateFrom);
        if (empDateTo) params.append("date_to", empDateTo);
        if (empDepartment) params.append("department", empDepartment);
        const res = await API.get(`/reports/data?${params.toString()}`);
        setData(res.data.data || []);
        setTotal(res.data.total || 0);
      } else if (tab === "attendance") {
        if (attDateFrom) params.append("date_from", attDateFrom);
        if (attDateTo) params.append("date_to", attDateTo);
        if (attEmployeeId) params.append("employee_id", attEmployeeId);
        if (attStatus) params.append("status", attStatus);
        const res = await API.get(`/reports/attendance/data?${params.toString()}`);
        setData(res.data.data || []);
        setTotal(res.data.total || 0);
      } else if (tab === "leave") {
        if (leaveDateFrom) params.append("date_from", leaveDateFrom);
        if (leaveDateTo) params.append("date_to", leaveDateTo);
        if (leaveType) params.append("leave_type", leaveType);
        if (leaveStatus) params.append("status", leaveStatus);
        const res = await API.get(`/reports/leave/data?${params.toString()}`);
        setData(res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      toast.error("Failed to load report data");
      setError("Failed to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [tab, page, empSearch, empDateFrom, empDateTo, empDepartment, attDateFrom, attDateTo, attEmployeeId, attStatus, leaveDateFrom, leaveDateTo, leaveType, leaveStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Export handler (Excel / PDF) ──
  const handleExport = async (format) => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (tab === "employee") {
        if (empSearch) params.append("search", empSearch);
        if (empDateFrom) params.append("date_from", empDateFrom);
        if (empDateTo) params.append("date_to", empDateTo);
        if (empDepartment) params.append("department", empDepartment);
      } else if (tab === "attendance") {
        if (attDateFrom) params.append("date_from", attDateFrom);
        if (attDateTo) params.append("date_to", attDateTo);
        if (attEmployeeId) params.append("employee_id", attEmployeeId);
        if (attStatus) params.append("status", attStatus);
      } else if (tab === "leave") {
        if (leaveDateFrom) params.append("date_from", leaveDateFrom);
        if (leaveDateTo) params.append("date_to", leaveDateTo);
        if (leaveType) params.append("leave_type", leaveType);
        if (leaveStatus) params.append("status", leaveStatus);
      }

      const base = tab === "employee"
        ? `/reports/export/${format}`
        : `/reports/${tab}/export/${format}`;

      const res = await API.get(`${base}?${params.toString()}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${tab}_report.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch (err) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  // ── Helper: format a time from a date/time string ──
  const formatTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    return isNaN(d.getTime())
      ? value                     // fallback to raw if invalid
      : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // ── Column definitions per tab ──
  const columns = {
    employee: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "department", label: "Department" },
      { key: "designation", label: "Designation" },
      { key: "system_role", label: "Role" },
      {
        key: "date_joined",
        label: "Date Joined",
        render: (row) =>
          row.date_joined ? new Date(row.date_joined).toLocaleDateString() : "—",
      },
    ],
    attendance: [
      { key: "employee_name", label: "Employee" },
      { key: "date", label: "Date" },
      {
        key: "check_in",
        label: "Check In",
        render: (row) => formatTime(row.check_in),
      },
      {
        key: "check_out",
        label: "Check Out",
        render: (row) => formatTime(row.check_out),
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              row.status === "present"
                ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
                : row.status === "absent"
                ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
            }`}
          >
            {row.status}
          </span>
        ),
      },
    ],
    leave: [
      { key: "employee_name", label: "Employee" },
      { key: "leave_type", label: "Type" },
      { key: "start_date", label: "Start" },
      { key: "end_date", label: "End" },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              row.status === "approved"
                ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
                : row.status === "rejected"
                ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
            }`}
          >
            {row.status}
          </span>
        ),
      },
      { key: "reason", label: "Reason" },
    ],
  };

  // ── Common select style ──
  const selectClass =
    "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 h-11 focus:ring-2 focus:ring-indigo-500 transition";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-gray-900 dark:to-gray-800 p-6 md:p-8 space-y-6">
      <Breadcrumbs
        items={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Reports & Analytics" },
        ]}
      />

      {/* Header with gradient text + subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Employee, attendance, and leave reports with export options
          </p>
        </div>
        <div className="text-right text-xs text-gray-400 dark:text-gray-500 self-end">
          Real‑time overview
        </div>
      </div>

      {/* Tabs – clean modern style */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl shadow-sm">
        {["employee", "attendance", "leave"].map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`relative px-6 py-3.5 font-medium text-sm transition-all duration-200 ${
              tab === t
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)} Reports
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Filters + Export – fixed height (no vertical jump EVER) */}
      <div className="bg-white dark:bg-gray-800 rounded-b-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 h-[155px] overflow-y-auto transition-none space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Employee Filters */}
          {tab === "employee" && (
            <>
              <Input type="date" placeholder="mm/dd/yyyy" value={empDateFrom} onChange={(e) => { setEmpDateFrom(e.target.value); setPage(1); }} />
              <Input type="date" placeholder="mm/dd/yyyy" value={empDateTo} onChange={(e) => { setEmpDateTo(e.target.value); setPage(1); }} />
              <Input placeholder="Department" value={empDepartment} onChange={(e) => { setEmpDepartment(e.target.value); setPage(1); }} />
              <Input placeholder="Search name/email" value={empSearchInput} onChange={(e) => { setEmpSearchInput(e.target.value); setPage(1); }} />
            </>
          )}
          {/* Attendance Filters */}
          {tab === "attendance" && (
            <>
              <Input type="date" placeholder="mm/dd/yyyy" value={attDateFrom} onChange={(e) => { setAttDateFrom(e.target.value); setPage(1); }} />
              <Input type="date" placeholder="mm/dd/yyyy" value={attDateTo} onChange={(e) => { setAttDateTo(e.target.value); setPage(1); }} />
              <Input placeholder="Employee ID" value={attEmployeeId} onChange={(e) => { setAttEmployeeId(e.target.value); setPage(1); }} />
              <select value={attStatus} onChange={(e) => { setAttStatus(e.target.value); setPage(1); }} className={selectClass}>
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </>
          )}
          {/* Leave Filters */}
          {tab === "leave" && (
            <>
              <Input type="date" placeholder="mm/dd/yyyy" value={leaveDateFrom} onChange={(e) => { setLeaveDateFrom(e.target.value); setPage(1); }} />
              <Input type="date" placeholder="mm/dd/yyyy" value={leaveDateTo} onChange={(e) => { setLeaveDateTo(e.target.value); setPage(1); }} />
              <Input placeholder="Leave Type" value={leaveType} onChange={(e) => { setLeaveType(e.target.value); setPage(1); }} />
              <select value={leaveStatus} onChange={(e) => { setLeaveStatus(e.target.value); setPage(1); }} className={selectClass}>
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </>
          )}
        </div>

        {/* Export Buttons – always fixed, refined style */}
        <div className="flex gap-3">
          <button
            onClick={() => handleExport("excel")}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-medium rounded-xl text-sm transition shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? <Spinner /> : "📥"} Export Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-medium rounded-xl text-sm transition shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? <Spinner /> : "📄"} Export PDF
          </button>
        </div>
      </div>

      {/* Data Table or Error */}
      {error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <DataTable
            columns={columns[tab]}
            data={data}
            loading={loading}
            emptyMessage="No records found for the selected filters."
          />
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} perPage={pageSize} total={total} onChange={setPage} />
    </div>
  );
}