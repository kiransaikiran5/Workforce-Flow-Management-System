export default function DataTable({ columns, data, loading, emptyMessage = "No data found" }) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            {columns.map((col, j) => (
              <div key={j} className="h-5 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Empty state – no external component needed
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <svg
          className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="mt-3 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  // Actual table
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="min-w-full w-full table-auto divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/60 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key || col.label}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key || col.label}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300"
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}