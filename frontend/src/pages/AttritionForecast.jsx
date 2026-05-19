import React, { useEffect, useState } from "react";
import api from "../api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { toast } from "react-toastify";

const COLORS = { High: "#ef4444", Medium: "#eab308", Low: "#22c55e" };

const TrendIndicator = ({ label, current, previous }) => {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return <span className="text-gray-500">→ New</span>;
  const change = current - previous;
  const pct = ((change / previous) * 100).toFixed(0);
  const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "→";
  const color = change > 0 ? "text-red-500" : change < 0 ? "text-green-500" : "text-gray-500";
  return (
    <span className={`text-sm font-medium ${color}`}>
      {arrow} {Math.abs(pct)}%
    </span>
  );
};

const AttritionForecast = () => {
  const [trend, setTrend] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendRes, forecastRes] = await Promise.all([
          api.get("/predictions/monthly-trend"),
          api.get("/predictions/forecast"),
        ]);
        setTrend(trendRes.data);
        if (forecastRes.data.length > 0) setForecast(forecastRes.data[0]);
      } catch {
        toast.error("Failed to load forecast data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Prepare chart data
  const chartData = trend.map(t => ({
    month: t.month,
    high: t.high,
    medium: t.medium,
    low: t.low,
  }));
  if (forecast) {
    chartData.push({
      month: forecast.month + " (F)",
      high: forecast.predicted_high,
      medium: forecast.predicted_medium,
      low: forecast.predicted_low,
    });
  }

  // Pie data for forecast
  const pieData = forecast
    ? [
        { name: "High", value: forecast.predicted_high, color: COLORS.High },
        { name: "Medium", value: forecast.predicted_medium, color: COLORS.Medium },
        { name: "Low", value: forecast.predicted_low, color: COLORS.Low },
      ]
    : [];

  // Comparison bar chart: last 3 months + forecast
  const lastMonths = chartData.slice(-4); // up to 4 items (3 real + forecast)
  const comparisonData = lastMonths.map(m => ({ month: m.month, High: m.high, Medium: m.medium, Low: m.low }));

  // Previous month for trend indicators (second last)
  const prevMonth = trend.length > 1 ? trend[trend.length - 2] : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">
        Attrition Forecast
      </h1>

      {loading ? (
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ) : (
        <>
          {/* Forecast summary cards + trend indicators */}
          {forecast && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">High Risk</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                      {forecast.predicted_high}
                    </p>
                  </div>
                  {prevMonth && (
                    <TrendIndicator label="High" current={forecast.predicted_high} previous={prevMonth.high} />
                  )}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Medium Risk</p>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                      {forecast.predicted_medium}
                    </p>
                  </div>
                  {prevMonth && (
                    <TrendIndicator label="Medium" current={forecast.predicted_medium} previous={prevMonth.medium} />
                  )}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Low Risk</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {forecast.predicted_low}
                    </p>
                  </div>
                  {prevMonth && (
                    <TrendIndicator label="Low" current={forecast.predicted_low} previous={prevMonth.low} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Two‑column: Trend line + Forecast pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Monthly trend line */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow p-5">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">
                Monthly Attrition Trend (with Forecast)
              </h2>
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="high" stroke={COLORS.High} name="High" strokeWidth={2} />
                    <Line type="monotone" dataKey="medium" stroke={COLORS.Medium} name="Medium" strokeWidth={2} />
                    <Line type="monotone" dataKey="low" stroke={COLORS.Low} name="Low" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-10">Not enough data for trend analysis.</p>
              )}
            </div>

            {/* Forecast distribution pie */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">
                Next Month Risk Distribution
              </h2>
              {forecast ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-10">No forecast data.</p>
              )}
            </div>
          </div>

          {/* Comparison bar chart: last months vs forecast */}
          {comparisonData.length >= 2 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 mb-8">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">
                Recent Months vs Forecast
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="High" fill={COLORS.High} />
                  <Bar dataKey="Medium" fill={COLORS.Medium} />
                  <Bar dataKey="Low" fill={COLORS.Low} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AttritionForecast;