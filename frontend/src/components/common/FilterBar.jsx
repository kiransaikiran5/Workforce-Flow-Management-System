export const FilterBar = ({ children, onApply, className = "" }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700 ${className}`}>
    <div className="flex flex-wrap gap-4 items-end">
      {children}
      {onApply && (
        <button
          onClick={onApply}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          Apply Filters
        </button>
      )}
    </div>
  </div>
);