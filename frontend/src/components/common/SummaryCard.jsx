export const SummaryCard = ({ title, value, icon, color, valueColor = "text-gray-900 dark:text-white" }) => (
  <div className={`rounded-xl shadow p-5 flex items-center gap-4 ${color} dark:bg-opacity-20`}>
    <span className="text-3xl">{icon}</span>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  </div>
);