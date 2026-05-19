export default function EmptyState({ icon = "📭", title = "Nothing here", message = "", actionLabel, onAction }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
      {message && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          {actionLabel}
        </button>
      )}
    </div>
  );
}