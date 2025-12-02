import { DashboardLayoutSkeleton } from '@/components/layouts/dashboard-layout-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading state for conversation detail page
 * Uses DashboardLayoutSkeleton with custom content
 */
export default function ConversationDetailLoading() {
  return (
    <DashboardLayoutSkeleton>
      <div className="flex flex-col h-full">
        {/* Conversation header skeleton */}
        <div className="border-b bg-[#111111] p-4 mb-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        </div>

        {/* Messages skeleton */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`} key={i}>
              <Skeleton className={`h-20 ${i % 2 === 0 ? 'w-2/3' : 'w-3/4'}`} />
            </div>
          ))}
        </div>

        {/* Message input skeleton */}
        <div className="border-t bg-[#111111] p-4 mt-4">
          <div className="flex gap-2">
            <Skeleton className="h-20 flex-1" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </div>
    </DashboardLayoutSkeleton>
  );
}
