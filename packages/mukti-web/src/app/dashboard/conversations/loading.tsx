import { DashboardLayoutSkeleton } from '@/components/layouts/dashboard-layout-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading state for conversations list page
 * Uses DashboardLayoutSkeleton with custom content
 */
export default function ConversationsLoading() {
  return (
    <DashboardLayoutSkeleton>
      <div className="max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
        </div>

        {/* Conversation cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton className="h-48" key={i} />
          ))}
        </div>
      </div>
    </DashboardLayoutSkeleton>
  );
}
