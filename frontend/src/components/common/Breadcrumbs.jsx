import { Link } from "react-router-dom";

export default function Breadcrumbs({ items }) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center">
          {idx > 0 && <span className="mx-2">/</span>}
          {item.href ? (
            <Link to={item.href} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-700 dark:text-gray-200 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}