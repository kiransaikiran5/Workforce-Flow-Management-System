// components/common/ActivityFeed.jsx
import { useEffect, useState } from "react";
import API from "../../api";

export default function ActivityFeed({ admin = false, limit = 20 }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build endpoint – adjust if your base URL already includes /api
      let endpoint = admin
        ? `/activities/all?limit=${limit}`
        : `/activities/?limit=${limit}`;

      console.log("🔔 Fetching:", endpoint);
      const res = await API.get(endpoint);
      setActivities(res.data.activities || []);
    } catch (err) {
      // If 404, try with /api prefix (common when using a global prefix)
      if (err.response?.status === 404) {
        try {
          const fallback = admin
            ? `/api/activities/all?limit=${limit}`
            : `/api/activities/?limit=${limit}`;
          console.log("🔔 Retrying with /api prefix:", fallback);
          const res = await API.get(fallback);
          setActivities(res.data.activities || []);
          return;
        } catch (fallbackErr) {
          console.error("ActivityFeed error (with /api):", fallbackErr.response?.status, fallbackErr.response?.data);
        }
      }
      console.error("ActivityFeed error:", err.response?.status, err.response?.data || err.message);
      setError(`Could not load activities (status ${err.response?.status || "?"}).`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [limit, admin]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse flex space-x-3">
            <div className="rounded-full bg-gray-300 h-8 w-8" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-2 bg-gray-300 rounded w-3/4" />
              <div className="h-2 bg-gray-300 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-red-500">
        <p>{error}</p>
        <button onClick={fetchActivities} className="mt-2 text-sm text-indigo-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 dark:text-gray-500">
        No recent activity. Please perform some actions (login/logout, create employee) to generate activities.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((activity, idx) => (
          <li key={activity.id || idx}>
            <div className="relative pb-8">
              {idx !== activities.length - 1 && (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-600" />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center ring-4 ring-white dark:ring-gray-800 text-white text-sm">
                    {getIcon(activity.action)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5">
                  <div className="text-sm text-gray-700 dark:text-gray-200">
                    <span className="font-medium">{activity.user_email || "System"}</span>{" "}
                    <span className="lowercase">{activity.action}</span>
                    {activity.module && <span className="text-gray-500"> · {activity.module}</span>}
                  </div>
                  {activity.details && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{activity.details}</p>
                  )}
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getIcon(action) {
  if (!action) return "📌";
  const a = action.toLowerCase();
  if (a.includes("create")) return "➕";
  if (a.includes("update")) return "✏️";
  if (a.includes("delete")) return "🗑️";
  if (a.includes("login")) return "🔑";
  if (a.includes("leave")) return "🏖️";
  if (a.includes("check")) return "📅";
  return "📌";
}