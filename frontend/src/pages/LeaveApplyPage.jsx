import React, { useEffect, useState } from "react";
import API from "../api";
import { toast } from "react-toastify";

export default function LeaveApplyPage() {
  const [formData, setFormData] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const [loading, setLoading] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [fetching, setFetching] = useState(true);

  // =====================================================
  // FETCH LEAVES
  // =====================================================

  const fetchMyLeaves = async () => {
    try {
      setFetching(true);

      const res = await API.get("/leave/my-requests");

      setLeaveHistory(res.data || []);
    } catch (err) {
      console.error(err);

      toast.error("Failed to load leave history");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  // =====================================================
  // HANDLE CHANGE
  // =====================================================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // =====================================================
  // APPLY LEAVE
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.leave_type ||
      !formData.start_date ||
      !formData.end_date
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    if (formData.end_date < formData.start_date) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      setLoading(true);

      const response = await API.post(
        "/leave/apply",
        formData
      );

      toast.success(
        response.data.message ||
          "Leave applied successfully"
      );

      setFormData({
        leave_type: "",
        start_date: "",
        end_date: "",
        reason: "",
      });

      fetchMyLeaves();
    } catch (err) {
      console.error(err);

      toast.error(
        err.response?.data?.detail ||
          "Failed to apply leave"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-emerald-100 text-emerald-700 border border-emerald-200";

      case "rejected":
        return "bg-red-100 text-red-700 border border-red-200";

      default:
        return "bg-amber-100 text-amber-700 border border-amber-200";
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#0f172a]">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">

        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Leave Management
            </h1>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Apply leave and monitor approval status
            </p>
          </div>

          <div className="flex items-center gap-4">

            <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800">

              <p className="text-xs text-blue-600 dark:text-blue-300 font-medium">
                TODAY
              </p>

              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {new Date().toLocaleDateString()}
              </p>

            </div>

            <button
              onClick={fetchMyLeaves}
              className="px-5 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-medium transition-all duration-300 shadow-lg"
            >
              Refresh
            </button>

          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* MAIN */}
      {/* ================================================= */}

      <div className="max-w-7xl mx-auto p-6">

        {/* ================================================= */}
        {/* STATS */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Requests
            </p>

            <h2 className="text-4xl font-bold mt-2 text-gray-900 dark:text-white">
              {leaveHistory.length}
            </h2>

          </div>

          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Approved
            </p>

            <h2 className="text-4xl font-bold mt-2 text-emerald-600">
              {
                leaveHistory.filter(
                  (item) =>
                    item.status?.toLowerCase() ===
                    "approved"
                ).length
              }
            </h2>

          </div>

          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pending
            </p>

            <h2 className="text-4xl font-bold mt-2 text-amber-500">
              {
                leaveHistory.filter(
                  (item) =>
                    item.status?.toLowerCase() ===
                    "pending"
                ).length
              }
            </h2>

          </div>
        </div>

        {/* ================================================= */}
        {/* GRID */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ================================================= */}
          {/* LEFT FORM */}
          {/* ================================================= */}

          <div className="xl:col-span-1">

            <div className="bg-white dark:bg-[#111827] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">

                <h2 className="text-xl font-semibold text-white">
                  Apply Leave
                </h2>

                <p className="text-blue-100 text-sm mt-1">
                  Submit leave request
                </p>

              </div>

              <form
                onSubmit={handleSubmit}
                className="p-6 space-y-5"
              >

                {/* Leave Type */}

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Leave Type
                  </label>

                  <select
                    name="leave_type"
                    value={formData.leave_type}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1e293b] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">
                      Select Leave Type
                    </option>

                    <option value="sick">
                      Sick Leave
                    </option>

                    <option value="casual">
                      Casual Leave
                    </option>

                    <option value="earned">
                      Earned Leave
                    </option>

                    <option value="work_from_home">
                      Work From Home
                    </option>
                  </select>
                </div>

                {/* Start Date */}

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Start Date
                  </label>

                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1e293b] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* End Date */}

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    End Date
                  </label>

                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1e293b] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Reason */}

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Reason
                  </label>

                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    rows="5"
                    placeholder="Write your reason..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#1e293b] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>

                {/* Submit */}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-12 rounded-xl text-white font-semibold transition-all duration-300 ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.01] hover:shadow-xl"
                  }`}
                >
                  {loading
                    ? "Applying..."
                    : "Apply Leave"}
                </button>

              </form>
            </div>
          </div>

          {/* ================================================= */}
          {/* RIGHT TABLE */}
          {/* ================================================= */}

          <div className="xl:col-span-2">

            <div className="bg-white dark:bg-[#111827] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

              {/* TOP */}

              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">

                <div>

                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Leave Requests
                  </h2>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Recent leave applications
                  </p>

                </div>

                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300">
                  {leaveHistory.length} Records
                </div>

              </div>

              {/* TABLE */}

              {fetching ? (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  Loading...
                </div>
              ) : leaveHistory.length === 0 ? (
                <div className="h-80 flex flex-col items-center justify-center">

                  <div className="text-6xl">
                    📄
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white">
                    No Leave Requests
                  </h3>

                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full">

                    <thead className="bg-gray-50 dark:bg-[#1e293b]">

                      <tr>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Leave Type
                        </th>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Duration
                        </th>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Reason
                        </th>

                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Status
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      {leaveHistory.map((leave) => (
                        <tr
                          key={leave.id}
                          className="border-t border-gray-100 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-[#1e293b]/40 transition-all"
                        >

                          {/* Type */}

                          <td className="px-6 py-5">

                            <div className="flex items-center gap-4">

                              <div className="w-11 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold uppercase">
                                {leave.leave_type?.charAt(0)}
                              </div>

                              <div>

                                <p className="font-semibold text-gray-900 dark:text-white capitalize">
                                  {leave.leave_type?.replaceAll(
                                    "_",
                                    " "
                                  )}
                                </p>

                                <p className="text-xs text-gray-500 mt-1">
                                  {leave.created_at
                                    ? new Date(
                                        leave.created_at
                                      ).toLocaleDateString()
                                    : "-"}
                                </p>

                              </div>
                            </div>
                          </td>

                          {/* Duration */}

                          <td className="px-6 py-5">

                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {leave.start_date}
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              to {leave.end_date}
                            </p>

                          </td>

                          {/* Reason */}

                          <td className="px-6 py-5 max-w-xs">

                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {leave.reason || "-"}
                            </p>

                          </td>

                          {/* Status */}

                          <td className="px-6 py-5">

                            <span
                              className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusStyle(
                                leave.status
                              )}`}
                            >
                              {leave.status}
                            </span>

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
      </div>
    </div>
  );
}