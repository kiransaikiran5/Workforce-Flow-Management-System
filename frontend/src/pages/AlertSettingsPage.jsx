import React, { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";

const AlertSettingsPage = () => {
  const [prefs, setPrefs] = useState({ email_high_risk_alerts: true, email_weekly_summary: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await api.get("/notifications/preferences");
        setPrefs(res.data);
      } catch {
        toast.error("Failed to load preferences");
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleToggle = async (field) => {
    const updated = { ...prefs, [field]: !prefs[field] };
    try {
      const res = await api.put("/notifications/preferences", { [field]: !prefs[field] });
      setPrefs(res.data);
      toast.success("Preferences updated");
    } catch {
      toast.error("Failed to update preferences");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Alert & Notification Settings</h1>
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium dark:text-white">High Risk Alerts</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive email when a high‑risk employee is detected.
                </p>
              </div>
              <button
                onClick={() => handleToggle("email_high_risk_alerts")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  prefs.email_high_risk_alerts ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    prefs.email_high_risk_alerts ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Additional toggles can be added similarly */}
        </div>
      )}
    </div>
  );
};

export default AlertSettingsPage;