export const ChartContainer = ({ title, children, className = "" }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700 ${className}`}>
    {title && <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">{title}</h2>}
    <div className="w-full" style={{ minHeight: 300 }}>{children}</div>
  </div>
);