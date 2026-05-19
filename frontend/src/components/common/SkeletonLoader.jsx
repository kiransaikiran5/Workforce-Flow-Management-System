// frontend/src/components/common/SkeletonLoader.jsx

export default function SkeletonLoader({ rows = 5, columns = 6 }) {
  return (
    <div className="animate-pulse space-y-4 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-6 bg-gray-200 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}