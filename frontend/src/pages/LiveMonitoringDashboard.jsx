import { useEffect, useState, useRef } from "react";
import api from "../api";
import { toast } from "react-toastify";
import RiskBadge from "../components/common/RiskBadge";

// ── Animated entry wrapper (CSS slide‑in) ──────────
function AnimatedCard({ children, index }) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 animate-slideIn"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {children}
    </div>
  );
}

// ── Main Dashboard Component ──────────────────────
export default function LiveMonitoringDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const latestTimestamp = useRef(null);

  const fetchInitial = async () => {
    try {
      const res = await api.get("/live-monitoring/stream?limit=30");
      setItems(res.data);
      if (res.data.length > 0) {
        latestTimestamp.current = res.data[0].created_at;
      }
    } catch {
      toast.error("Failed to load live stream");
    } finally {
      setLoading(false);
    }
  };

  const pollNew = async () => {
    try {
      const since = latestTimestamp.current;
      if (!since) return;
      const res = await api.get(
        `/live-monitoring/stream?since=${encodeURIComponent(since)}&limit=30`
      );
      if (res.data.length > 0) {
        setItems((prev) => [...res.data, ...prev].slice(0, 100));
        latestTimestamp.current = res.data[0].created_at;
      }
    } catch {
      // silent fail – the feed will simply update on next successful poll
    }
  };

  useEffect(() => {
    fetchInitial();
    const interval = setInterval(pollNew, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 md:p-5 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
          Live Attrition Monitoring
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Real‑time alerts and risk change timeline
        </p>
      </div>

      {/* Live Indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-sm font-medium text-green-600 dark:text-green-400">
          Live
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center text-gray-500">
          No monitoring events yet. Alerts and risk changes will appear here in real‑time.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <AnimatedCard key={item.type + item.id} index={idx}>
              {item.type === "alert" ? (
                <AlertCard item={item} />
              ) : (
                <RiskChangeCard item={item} />
              )}
            </AnimatedCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Alert Card ────────────────────────────────────
function AlertCard({ item }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-2xl">{item.severity === "high" ? "🚨" : "⚠️"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 dark:text-white">
            {item.employee_name}
          </span>
          {!item.is_read && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
              NEW
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{item.message}</p>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(item.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ── Risk Change Card ──────────────────────────────
function RiskChangeCard({ item }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-2xl">📊</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 dark:text-white">
            {item.employee_name}
          </span>
          <span className="text-xs text-gray-500">Risk Change</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
          {item.previous_category ? (
            <>
              <RiskBadge level={item.previous_category} />
              <span className="text-gray-400">→</span>
            </>
          ) : (
            <span className="text-gray-400 text-xs">First prediction →</span>
          )}
          <RiskBadge level={item.new_category} />
          <span className="text-gray-500 text-xs ml-1">
            ({item.previous_risk_score != null ? (item.previous_risk_score * 100).toFixed(0) + "% → " : ""}
            {(item.new_risk_score * 100).toFixed(0)}%)
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(item.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}