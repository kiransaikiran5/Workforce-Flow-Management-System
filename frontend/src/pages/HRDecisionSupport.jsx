// pages/HRDecisionSupport.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";

const TYPE_ICONS = {
  retention: "👤",
  department_health: "🏢",
  risk_escalation: "📈",
  trend_alert: "📊",
};

const PRIORITY_COLORS = {
  high: "border-l-red-500 bg-red-50 dark:bg-red-900/20",
  medium: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
  low: "border-l-green-500 bg-green-50 dark:bg-green-900/20",
};

export default function HRDecisionSupport() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    try {
      const res = await api.get("/recommendations/");
      setRecommendations(res.data);
    } catch {
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
          HR Decision Support
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          AI‑powered recommendations based on workforce analysis
        </p>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No recommendations at this time. The system will generate suggestions when risk patterns are detected.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className={`border-l-4 rounded-xl p-5 shadow-sm bg-white dark:bg-gray-800 ${
                PRIORITY_COLORS[rec.priority] || "border-l-gray-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{TYPE_ICONS[rec.type] || "💡"}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 dark:text-white">{rec.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${
                      rec.priority === "high" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                      rec.priority === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" :
                      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    }`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{rec.description}</p>
                  <p className="text-xs text-gray-400 mt-2 italic">Recommended action: {rec.action}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}