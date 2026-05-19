export default function Input({ label, error, helperText, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
        } ${className}`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
}