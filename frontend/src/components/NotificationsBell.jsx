import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import API from "../api";
import { toast } from "react-toastify";

export default function NotificationsBell() {
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);

  const bellRef = useRef(null);
  const dropdownRef = useRef(null);

  // =====================================================
  // FETCH NOTIFICATIONS
  // =====================================================
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (activeTab === "unread") {
        params.append("unread_only", "true");
      }

      if (activeTab === "high") {
        params.append("priority", "high");
      }

      const query = params.toString()
        ? `?${params.toString()}`
        : "";

      const res = await API.get(`/notifications/${query}`);

      setNotifs(res.data.notifications || []);
      setUnread(res.data.unread_count || 0);
    } catch (err) {
      console.error("Notification fetch error:", err);

      toast.error(
        err?.response?.data?.detail ||
          "Failed to load notifications"
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // =====================================================
  // INITIAL FETCH + AUTO REFRESH
  // =====================================================
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // =====================================================
  // CLOSE DROPDOWN ON OUTSIDE CLICK
  // =====================================================
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [showDropdown]);

  // =====================================================
  // POSITION DROPDOWN
  // =====================================================
  const updateDropdownPosition = useCallback(() => {
    if (!bellRef.current || !dropdownRef.current) return;

    const rect = bellRef.current.getBoundingClientRect();

    dropdownRef.current.style.top = `${rect.bottom + 12}px`;

    dropdownRef.current.style.right = `${
      window.innerWidth - rect.right
    }px`;
  }, []);

  useEffect(() => {
    if (!showDropdown) return;

    updateDropdownPosition();

    window.addEventListener(
      "resize",
      updateDropdownPosition
    );

    window.addEventListener(
      "scroll",
      updateDropdownPosition,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateDropdownPosition
      );

      window.removeEventListener(
        "scroll",
        updateDropdownPosition,
        true
      );
    };
  }, [showDropdown, updateDropdownPosition]);

  // =====================================================
  // TOGGLE DROPDOWN
  // =====================================================
  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  // =====================================================
  // MARK ALL READ
  // =====================================================
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifs
        .filter((n) => !n.read)
        .map((n) => n.id);

      if (unreadIds.length === 0) {
        toast.info("No unread notifications");
        return;
      }

      await API.post(
        "/notifications/mark-read",
        unreadIds
      );

      setNotifs((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
        }))
      );

      setUnread(0);

      toast.success(
        "All notifications marked as read"
      );
    } catch (err) {
      console.error(err);

      toast.error(
        err?.response?.data?.detail ||
          "Failed to mark notifications"
      );
    }
  };

  // =====================================================
  // MARK SINGLE READ
  // =====================================================
  const markAsRead = async (id) => {
    try {
      await API.post("/notifications/mark-read", [id]);

      setNotifs((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                read: true,
              }
            : n
        )
      );

      setUnread((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      console.error(err);

      toast.error("Failed to mark notification");
    }
  };

  // =====================================================
  // DELETE NOTIFICATION
  // =====================================================
  const deleteNotification = async (id) => {
    try {
      await API.delete(`/notifications/${id}`);

      const deletedNotif = notifs.find(
        (n) => n.id === id
      );

      setNotifs((prev) =>
        prev.filter((n) => n.id !== id)
      );

      if (deletedNotif && !deletedNotif.read) {
        setUnread((prev) =>
          Math.max(prev - 1, 0)
        );
      }

      toast.success("Notification deleted");
    } catch (err) {
      console.error(err);

      toast.error("Delete failed");
    }
  };

  // =====================================================
  // PRIORITY COLORS
  // =====================================================
  const priorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

      case "low":
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

      default:
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  // =====================================================
  // CATEGORY LABEL
  // =====================================================
  const categoryLabel = (cat) => {
    if (!cat) return "General";

    return cat.replaceAll("_", " ");
  };

  return (
    <>
      {/* =====================================================
          BELL BUTTON
      ===================================================== */}
      <button
        ref={bellRef}
        onClick={toggleDropdown}
        className="
          relative
          p-2
          rounded-full
          hover:bg-gray-100
          dark:hover:bg-gray-700
          transition
        "
      >
        <svg
          className="w-6 h-6 text-gray-700 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unread > 0 && (
          <span
            className="
              absolute
              -top-1
              -right-1
              min-w-[18px]
              h-[18px]
              px-1
              rounded-full
              bg-red-500
              text-white
              text-[10px]
              font-bold
              flex
              items-center
              justify-center
            "
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* =====================================================
          DROPDOWN
      ===================================================== */}
      {showDropdown &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              zIndex: 999999,
            }}
            className="
              w-96
              bg-white
              dark:bg-gray-800
              border
              border-gray-200
              dark:border-gray-700
              rounded-2xl
              shadow-2xl
              overflow-hidden
            "
          >
            {/* HEADER */}
            <div
              className="
                flex
                items-center
                justify-between
                px-4
                py-3
                border-b
                border-gray-200
                dark:border-gray-700
                bg-gray-50
                dark:bg-gray-900/50
              "
            >
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  Notifications
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {unread} unread
                </p>
              </div>

              {unread > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="
                    text-sm
                    text-indigo-600
                    hover:text-indigo-800
                    dark:text-indigo-400
                  "
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* TABS */}
            <div
              className="
                flex
                border-b
                border-gray-100
                dark:border-gray-700
              "
            >
              {[
                { key: "all", label: "All" },
                { key: "unread", label: "Unread" },
                { key: "high", label: "High" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() =>
                    setActiveTab(tab.key)
                  }
                  className={`
                    flex-1
                    py-2
                    text-sm
                    font-medium
                    transition
                    ${
                      activeTab === tab.key
                        ? "text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* BODY */}
            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-gray-500">
                  Loading...
                </div>
              ) : notifs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No notifications found
                </div>
              ) : (
                notifs.map((n) => (
                  <div
                    key={n.id}
                    className={`
                      relative
                      p-4
                      border-b
                      border-gray-100
                      dark:border-gray-700
                      transition
                      hover:bg-gray-50
                      dark:hover:bg-gray-700/40
                      ${
                        !n.read
                          ? "bg-blue-50 dark:bg-blue-900/10"
                          : ""
                      }
                    `}
                  >
                    {/* unread dot */}
                    {!n.read && (
                      <span
                        className="
                          absolute
                          top-4
                          right-4
                          h-2
                          w-2
                          rounded-full
                          bg-indigo-500
                        "
                      />
                    )}

                    <div className="pr-6">
                      <div className="flex gap-2 items-center mb-2 flex-wrap">
                        <span
                          className={`
                            text-xs
                            px-2
                            py-1
                            rounded-full
                            font-medium
                            capitalize
                            ${priorityColor(
                              n.priority
                            )}
                          `}
                        >
                          {n.priority}
                        </span>

                        <span
                          className="
                            text-xs
                            text-gray-500
                            dark:text-gray-400
                            capitalize
                          "
                        >
                          {categoryLabel(
                            n.category
                          )}
                        </span>
                      </div>

                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {n.message}
                      </p>

                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(
                          n.created_at
                        ).toLocaleString()}
                      </p>

                      {/* ACTIONS */}
                      <div className="flex gap-4 mt-3">
                        {!n.read && (
                          <button
                            onClick={() =>
                              markAsRead(n.id)
                            }
                            className="
                              text-xs
                              text-indigo-600
                              hover:text-indigo-800
                            "
                          >
                            Mark Read
                          </button>
                        )}

                        <button
                          onClick={() =>
                            deleteNotification(
                              n.id
                            )
                          }
                          className="
                            text-xs
                            text-red-600
                            hover:text-red-800
                          "
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}