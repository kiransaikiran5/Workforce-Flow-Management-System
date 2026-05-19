import { useState, useEffect, useCallback } from "react";
import API from "../api";
import { toast } from "react-toastify";

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [todayStatus, setTodayStatus] = useState({
    checkedIn: false,
    checkedOut: false,
    late: false,
    record: null,
  });

  // ─────────────────────────────────────────────────
  // FETCH ATTENDANCE
  // ─────────────────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/attendance/my-attendance");
      const data = res.data.data || [];
      setRecords(data);

      // Find today's record
      const today = new Date().toISOString().split("T")[0];
      const todayRecord = data.find((item) => item.date === today);

      if (todayRecord) {
        setTodayStatus({
          checkedIn: !!todayRecord.check_in,
          checkedOut: !!todayRecord.check_out,
          late: todayRecord.late || todayRecord.is_late || false,
          record: todayRecord,
        });
      } else {
        setTodayStatus({
          checkedIn: false,
          checkedOut: false,
          late: false,
          record: null,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // ─────────────────────────────────────────────────
  // CHECK IN
  // ─────────────────────────────────────────────────
  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const res = await API.post("/attendance/check-in");
      toast.success(res.data.message || "Checked in successfully");
      fetchAttendance();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Check in failed");
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────
  // CHECK OUT
  // ─────────────────────────────────────────────────
  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      const res = await API.post("/attendance/check-out");
      toast.success(res.data.message || "Checked out successfully");
      fetchAttendance();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Check out failed");
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────
  // MARK ABSENT
  // ─────────────────────────────────────────────────
  const handleMarkAbsent = async () => {
    const reason = window.prompt("Reason for absence");
    if (reason === null) return;

    try {
      setActionLoading(true);
      const res = await API.post("/attendance/mark-absent", { reason });
      toast.success(res.data.message || "Absent marked");
      fetchAttendance();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to mark absent");
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────
  const formatTime = (time) => {
    if (!time) return "--";
    return new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString();
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "present":
        return "bg-emerald-100 text-emerald-700 border border-emerald-200";
      case "absent":
        return "bg-red-100 text-red-700 border border-red-200";
      default:
        return "bg-amber-100 text-amber-700 border border-amber-200";
    }
  };

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#0f172a]">
      {/* Header */}
      <div className="bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Attendance Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track daily attendance and work hours
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 px-5 py-3 rounded-2xl border border-blue-100 dark:border-blue-800">
            <p className="text-xs text-blue-600 dark:text-blue-300 font-medium">TODAY</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white mt-1">
              {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Records</p>
            <h2 className="text-4xl font-bold mt-2 text-gray-900 dark:text-white">{records.length}</h2>
          </div>
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Present</p>
            <h2 className="text-4xl font-bold mt-2 text-emerald-600">
              {records.filter((r) => r.status === "present").length}
            </h2>
          </div>
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Absent</p>
            <h2 className="text-4xl font-bold mt-2 text-red-600">
              {records.filter((r) => r.status === "absent").length}
            </h2>
          </div>
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Late Days</p>
            <h2 className="text-4xl font-bold mt-2 text-amber-500">
              {records.filter((r) => r.late || r.is_late).length}
            </h2>
          </div>
        </div>

        {/* Today's Status */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
            <h2 className="text-xl font-semibold text-white">Today's Attendance</h2>
            <p className="text-blue-100 text-sm mt-1">Check in and check out details</p>
          </div>
          <div className="p-6">
            {todayStatus.record ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-gray-50 dark:bg-[#1e293b] rounded-2xl p-5">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Check In</p>
                  <h3 className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                    {formatTime(todayStatus.record.check_in)}
                  </h3>
                </div>
                <div className="bg-gray-50 dark:bg-[#1e293b] rounded-2xl p-5">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Check Out</p>
                  <h3 className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                    {formatTime(todayStatus.record.check_out)}
                  </h3>
                </div>
                <div className="bg-gray-50 dark:bg-[#1e293b] rounded-2xl p-5">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Work Hours</p>
                  <h3 className="text-2xl font-bold mt-2 text-emerald-600">
                    {todayStatus.record.work_hours || 0} h
                  </h3>
                </div>
                <div className="bg-gray-50 dark:bg-[#1e293b] rounded-2xl p-5">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <div className="mt-3">
                    <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusStyle(todayStatus.record.status)}`}>
                      {todayStatus.record.status}
                    </span>
                    {todayStatus.late && (
                      <div className="mt-3 text-red-500 font-semibold text-sm">Late Arrival</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl">⏰</div>
                <h3 className="mt-4 text-xl font-semibold text-gray-800 dark:text-white">No Attendance Today</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please check in to start your work</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-8">
              <button
                onClick={handleCheckIn}
                disabled={todayStatus.checkedIn || actionLoading}
                className={`px-6 py-3 rounded-2xl text-white font-semibold transition-all duration-300 ${
                  todayStatus.checkedIn
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] hover:shadow-xl"
                }`}
              >
                {actionLoading ? "Processing..." : "Check In"}
              </button>
              <button
                onClick={handleCheckOut}
                disabled={!todayStatus.checkedIn || todayStatus.checkedOut || actionLoading}
                className={`px-6 py-3 rounded-2xl text-white font-semibold transition-all duration-300 ${
                  !todayStatus.checkedIn || todayStatus.checkedOut
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-green-600 hover:scale-[1.02] hover:shadow-xl"
                }`}
              >
                {actionLoading ? "Processing..." : "Check Out"}
              </button>
              <button
                onClick={handleMarkAbsent}
                disabled={todayStatus.checkedIn || actionLoading}
                className={`px-6 py-3 rounded-2xl text-white font-semibold transition-all duration-300 ${
                  todayStatus.checkedIn
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-gray-700 to-gray-900 hover:scale-[1.02] hover:shadow-xl"
                }`}
              >
                {actionLoading ? "Processing..." : "Mark Absent"}
              </button>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Attendance History</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete attendance records</p>
          </div>
          {loading ? (
            <div className="h-72 flex items-center justify-center text-gray-500">Loading attendance...</div>
          ) : records.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center">
              <div className="text-6xl">📅</div>
              <h3 className="mt-4 text-xl font-semibold text-gray-800 dark:text-white">No Attendance Records</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-[#1e293b]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Check In</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Check Out</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Work Hours</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Late</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr
                      key={record.id || Math.random()}
                      className="border-t border-gray-100 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-[#1e293b]/40 transition-all"
                    >
                      <td className="px-6 py-5 font-medium text-gray-900 dark:text-white">{formatDate(record.date)}</td>
                      <td className="px-6 py-5 text-gray-700 dark:text-gray-300">{formatTime(record.check_in)}</td>
                      <td className="px-6 py-5 text-gray-700 dark:text-gray-300">{formatTime(record.check_out)}</td>
                      <td className="px-6 py-5 text-gray-700 dark:text-gray-300 font-semibold">{record.work_hours || 0} h</td>
                      <td className="px-6 py-5">
                        <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusStyle(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {record.late || record.is_late ? (
                          <span className="text-red-500 font-semibold">Yes</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}