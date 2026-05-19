const RiskBadge = ({ level }) => {
  const colors = {
    High: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    Low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[level] || ""}`}>
      {level}
    </span>
  );
};

export default RiskBadge;