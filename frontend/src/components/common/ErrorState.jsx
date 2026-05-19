export default function ErrorState({ message = "Something went wrong", onRetry }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-5xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Error</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          Try Again
        </button>
      )}
    </div>
  );
}