import { useEffect, useState } from "react";
import API from "../api";
import { toast } from "react-toastify";

/* =====================================================
   ICONS
===================================================== */

const BellIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 17h5l-1.405-1.405A2.032 2.032 
      0 0118 14.158V11a6.002 6.002 
      0 00-4-5.659V5a2 2 
      0 10-4 0v.341C7.67 6.165 
      6 8.388 6 11v3.159c0 
      .538-.214 1.055-.595 
      1.436L4 17h5m6 0v1a3 
      3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 12l2 2 4-4m6 2a9 9 0 
      11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 7l-.867 12.142A2.002 
      2.002 0 0116.138 21H7.862a2.002 
      2.002 0 01-1.995-1.858L5 7m5 
      4v6m4-6v6m1-10V4a1 1 0 
      00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const ChevronLeftIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

const ChevronRightIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 5l7 7-7 7"
    />
  </svg>
);

/* =====================================================
   COMPONENT
===================================================== */

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const LIMIT = 6;

  /* =====================================================
     FETCH NOTIFICATIONS
  ===================================================== */

  const fetchNotifications = async (pageNum = 1) => {
    try {
      setLoading(true);

      // Backend uses skip + limit
      const skip = (pageNum - 1) * LIMIT;

      const res = await API.get(
        `/notifications/?skip=${skip}&limit=${LIMIT}`
      );

      console.log("Notifications Response:", res.data);

      setNotifications(res.data.notifications || []);

      setTotal(res.data.total || 0);
    } catch (error) {
      console.error(error);

      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  /* =====================================================
     MARK AS READ
  ===================================================== */

  const markAsRead = async (id) => {
    try {
      await API.post("/notifications/mark-read", [id]);

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, read: true, is_read: true }
            : n
        )
      );

      toast.success("Notification marked as read");
    } catch (error) {
      console.error(error);

      toast.error("Failed to mark notification");
    }
  };

  /* =====================================================
     DELETE NOTIFICATION
  ===================================================== */

  const deleteNotification = async (id) => {
    try {
      await API.delete(`/notifications/${id}`);

      toast.success("Notification deleted");

      fetchNotifications(page);
    } catch (error) {
      console.error(error);

      toast.error("Failed to delete notification");
    }
  };

  /* =====================================================
     PAGINATION
  ===================================================== */

  const totalPages = Math.ceil(total / LIMIT);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border"
              >
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-4"></div>

                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-1/2 mb-3"></div>

                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     MAIN UI
  ===================================================== */

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <BellIcon className="w-8 h-8 text-indigo-600" />

            Notifications
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total} total notification
            {total !== 1 ? "s" : ""}
          </p>
        </div>

        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 shadow-sm text-sm font-medium text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </div>
        )}
      </div>

      {/* Empty State */}
      {notifications.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm p-16 text-center">
          <BellIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />

          <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
            No Notifications
          </h3>

          <p className="text-gray-500 dark:text-gray-400 mt-2">
            You're all caught up.
          </p>
        </div>
      ) : (
        /* Notifications Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notifications.map((notification) => {
            const isRead =
              notification.read || notification.is_read;

            return (
              <div
                key={notification.id}
                className={`
                  bg-white dark:bg-gray-800 rounded-3xl border shadow-sm
                  transition-all duration-300
                  hover:shadow-lg hover:-translate-y-1
                  ${
                    !isRead
                      ? "border-l-4 border-indigo-500 ring-1 ring-indigo-100"
                      : "border-gray-200 dark:border-gray-700"
                  }
                `}
              >
                <div className="p-6 flex flex-col h-full">
                  {/* Top */}
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`
                        w-12 h-12 rounded-2xl
                        flex items-center justify-center
                        ${
                          isRead
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                            : "bg-indigo-100 text-indigo-600"
                        }
                      `}
                    >
                      <BellIcon className="w-6 h-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <p
                        className={`
                          text-sm leading-relaxed font-medium
                          ${
                            isRead
                              ? "text-gray-600 dark:text-gray-400"
                              : "text-gray-900 dark:text-gray-100"
                          }
                        `}
                      >
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full capitalize">
                          {notification.type || "general"}
                        </span>

                        {!isRead && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom */}
                  <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {notification.created_at
                        ? new Date(
                            notification.created_at
                          ).toLocaleString()
                        : "Just now"}
                    </span>

                    <div className="flex items-center gap-4">
                      {!isRead && (
                        <button
                          onClick={() =>
                            markAsRead(notification.id)
                          }
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium transition"
                        >
                          <CheckCircleIcon className="w-4 h-4" />

                          Mark Read
                        </button>
                      )}

                      <button
                        onClick={() =>
                          deleteNotification(notification.id)
                        }
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 text-sm font-medium transition"
                      >
                        <TrashIcon className="w-4 h-4" />

                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          {/* Previous */}
          <button
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition
              ${
                page === 1
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300"
              }
            `}
          >
            <ChevronLeftIcon className="w-4 h-4" />

            Previous
          </button>

          {/* Page Number */}
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {page} / {totalPages}
          </span>

          {/* Next */}
          <button
            disabled={page === totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition
              ${
                page === totalPages
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300"
              }
            `}
          >
            Next

            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Notifications;