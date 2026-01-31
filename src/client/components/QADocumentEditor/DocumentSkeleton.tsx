/**
 * Skeleton loader for the QA document editor during initial load.
 */
export function DocumentSkeleton() {
  return (
    <div className="animate-pulse pt-4">
      {/* Title skeleton */}
      <div className="h-8 bg-base-300 rounded w-1/3 mb-6" />
      {/* Block skeletons */}
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="h-5 bg-base-300 rounded w-2/3" />
          <div className="h-4 bg-base-300/60 rounded w-full" />
          <div className="h-4 bg-base-300/60 rounded w-4/5" />
        </div>
        <div className="space-y-3">
          <div className="h-5 bg-base-300 rounded w-1/2" />
          <div className="h-4 bg-base-300/60 rounded w-full" />
          <div className="h-4 bg-base-300/60 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}
