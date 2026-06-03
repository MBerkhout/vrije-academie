import { CONTAINER_CLASS } from '@/lib/cms'

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden animate-pulse">
      <div className="bg-gray-200 aspect-[4/3] w-full" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  )
}

export default function OnsAanbodLoading() {
  return (
    <div className="pb-16">
      <div className={`${CONTAINER_CLASS} mt-8`}>
        <div className="flex gap-8">
          {/* Sidebar skeleton */}
          <aside className="hidden lg:block w-72 shrink-0 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </aside>
          {/* Grid skeleton */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
