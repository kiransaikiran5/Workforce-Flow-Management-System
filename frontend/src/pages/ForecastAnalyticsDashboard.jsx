// pages/ForecastAnalyticsDashboard.jsx
import { useEffect, useState } from "react";
import api from "../api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar
} from "recharts";
import { toast } from "react-toastify";

const COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

function SummaryCard({ title, value, icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3 hover:shadow-lg transition-shadow">
      <div className={`p-2.5 rounded-xl ${color} text-2xl`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {title}
        </p>
        <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}

export default function ForecastAnalyticsDashboard() {
  const [longTerm, setLongTerm] = useState({ historical: [], forecast: [] });
  const [yearlyTrend, setYearlyTrend] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [years, setYears] = useState([]);
  const [year1, setYear1] = useState("");
  const [year2, setYear2] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ltRes, ytRes] = await Promise.all([
          api.get("/forecast/long-term?months=6"),
          api.get("/forecast/yearly-trend"),
        ]);
        setLongTerm(ltRes.data);
        const yearly = ytRes.data;
        setYearlyTrend(yearly);
        const yearList = yearly.map((y) => y.year);
        setYears(yearList);
        if (yearList.length >= 2) {
          setYear1(yearList[0].toString());
          setYear2(yearList[1].toString());
        } else if (yearList.length === 1) {
          setYear1(yearList[0].toString());
          setYear2(yearList[0].toString());
        }
      } catch {
        toast.error("Failed to load forecast data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (!year1 || !year2) return;
    const fetchComparison = async () => {
      try {
        const res = await api.get(`/forecast/comparison?year1=${year1}&year2=${year2}`);
        setComparison(res.data);
      } catch {
        toast.error("Comparison failed");
      }
    };
    fetchComparison();
  }, [year1, year2]);

  const chartData = [...longTerm.historical, ...longTerm.forecast];
  const lastForecast = longTerm.forecast.length > 0
    ? longTerm.forecast[longTerm.forecast.length - 1]
    : null;

  return (
    <div className="p-4 md:p-5 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
          AI Forecasting Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Long‑term workforce predictions and yearly comparisons
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard title="Historical Months" value={longTerm.historical.length} icon="📅" color="bg-blue-100 dark:bg-blue-900/40" />
            <SummaryCard title="Forecast Periods" value={longTerm.forecast.length} icon="🔮" color="bg-purple-100 dark:bg-purple-900/40" />
            <SummaryCard title="Last High" value={lastForecast ? lastForecast.high : "—"} icon="⚠️" color="bg-red-100 dark:bg-red-900/40" />
          </div>

          {/* Charts Grid – Two columns on large screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Forecast Line Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h2 className="text-base font-semibold mb-3 text-gray-800 dark:text-white">
                6‑Month Forecast
              </h2>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Line type="monotone" dataKey="high" stroke={COLORS.high} name="High" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="medium" stroke={COLORS.medium} name="Medium" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="low" stroke={COLORS.low} name="Low" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No forecast data" />
              )}
            </div>

            {/* Yearly Trend Bar Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
              <h2 className="text-base font-semibold mb-3 text-gray-800 dark:text-white">
                Yearly Trend
              </h2>
              {yearlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={yearlyTrend} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Bar dataKey="high" stackId="a" fill={COLORS.high} name="High" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="medium" stackId="a" fill={COLORS.medium} name="Medium" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="low" stackId="a" fill={COLORS.low} name="Low" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No yearly data" />
              )}
            </div>
          </div>

          {/* Year‑over‑Year Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold mb-3 text-gray-800 dark:text-white">
              Year‑over‑Year Comparison
            </h2>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select value={year1} onChange={(e) => setYear1(e.target.value)}
                className="border px-3 py-2 rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                <option value="">-- Year --</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="text-base font-medium text-gray-500">vs</span>
              <select value={year2} onChange={(e) => setYear2(e.target.value)}
                className="border px-3 py-2 rounded-lg text-sm dark:bg-gray-700 dark:text-white">
                <option value="">-- Year --</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {comparison?.year1 && comparison?.year2 ? (
              <div className="grid grid-cols-2 gap-4">
                <CompactComparisonCard data={comparison.year1} />
                <CompactComparisonCard data={comparison.year2} isSecond />
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500 py-6">
                {!year1 || !year2 ? "Select two years to compare." : "No data for selected years."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────
function CompactComparisonCard({ data, isSecond }) {
  const borderColor = isSecond
    ? "border-indigo-200 dark:border-indigo-800"
    : "border-blue-200 dark:border-blue-800";
  const bg = isSecond ? "bg-indigo-50/50 dark:bg-indigo-900/20" : "bg-blue-50/50 dark:bg-blue-900/20";

  return (
    <div className={`rounded-xl border ${borderColor} ${bg} p-4`}>
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">{data.year}</h3>
      <div className="space-y-2 text-sm">
        <Row label="Total Predictions" value={data.total} />
        <Row label="High Risk" value={data.high} color="text-red-600" />
        <Row label="Medium Risk" value={data.medium} color="text-yellow-600" />
        <Row label="Low Risk" value={data.low} color="text-green-600" />
        <div className="pt-2 border-t border-gray-200 dark:border-gray-600 mt-2">
          <Row label="High Risk %" value={data.total > 0 ? ((data.high / data.total) * 100).toFixed(1) + "%" : "0%"} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color = "text-gray-800 dark:text-white" }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}