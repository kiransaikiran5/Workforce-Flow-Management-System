export default function Card({ children, className = '', hover = false }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 dark:border-gray-700 ${
        hover ? 'hover:shadow-md transition-shadow' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}