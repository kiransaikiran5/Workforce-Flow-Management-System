import { useEffect, useState, useRef } from "react";
import API from "../api";
import { toast } from "react-toastify";
import Breadcrumbs from "../components/common/Breadcrumbs";

// Icons for different actions (simple emoji mapping)
const ACTION_ICONS = {
  "Created": "➕",
  "Updated": "✏️",
  "Deleted": "❌",
  "Login": "🔑",
  "Predicted": "🧠",
  "Alert": "🚨",
  "Intervention": "🤝",
  "High Risk Detected": "🔴",
  "Risk Increased": "📈",
  "Risk Decreased": "📉",
};

function ActivityItem({ activity }) {
  const icon = ACTION_ICONS[activity.action] || "📌";
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700">
      <span className="text-lg mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200">
          <span className="font-medium">{activity.performed_by}</span>
          <span className="text-gray-500 dark:text-gray-400"> {activity.action} </span>
          {activity.target && (
            <span className="font-medium">{activity.target}</span>
          )}
          {activity.details && (
            <span className="text-gray-500 dark:text-gray-400"> – {activity.details}</span>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(activity.created_at).toLocaleString()} • {activity.module}
        </p>
      </div>
    </div>
  );
}

export default function AttritionActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const latestTimestamp = useRef(null);  // stores ISO string of the newest activity

  // Fetch initial data
  const fetchInitial = async () => {
    try {
      const res = await API.get("/activities/attrition?limit=50");
      const data = res.data;
      setActivities(Array.isArray(data) ? data : []);
      if (data.length > 0) {
        latestTimestamp.current = data[0].created_at;   // newest first
      }
    } catch {
      toast.error("Failed to load activity feed");
    } finally {
      setLoading(false);
    }
  };

  // Poll for new activities
  const pollNew = async () => {
    try {
      const since = latestTimestamp.current;
      if (!since) return;
      const res = await API.get(`/activities/attrition?since=${encodeURIComponent(since)}&limit=50`);
      const newItems = Array.isArray(res.data) ? res.data : [];
      if (newItems.length > 0) {
        // prepend new items and keep max 100
        setActivities(prev => [...newItems, ...prev].slice(0, 100));
        latestTimestamp.current = newItems[0].created_at;
      }
    } catch {
      // silently fail on polling
    }
  };

  useEffect(() => {
    fetchInitial();
    const interval = setInterval(pollNew, 5000);   // poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Attrition Activity" }]} />

      <div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
          Real‑Time Attrition Activity
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Live updates of attrition‑related actions across the system
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium text-green-600 dark:text-green-400">Live</span>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-0">
            {activities.map((act) => (
              <ActivityItem key={act.id} activity={act} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">
            No attrition activities recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}