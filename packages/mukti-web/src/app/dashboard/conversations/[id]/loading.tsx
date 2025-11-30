import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading state for conversation detail page
 * Displays skeleton UI matching the final layout
 *
 * Requirements: 10.2
 */
export default function ConversationDetailLoading() {
  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Sidebar skeleton */}
      <aside className="w-64 bg-[#111111] border-r border-white/10 p-6">
        <Skeleton className="h-8 w-32 mb-8 bg-white/10" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton className="h-10 w-full bg-white/10" key={i} />
          ))}
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 flex flex-col">
        <header className="bg-[#111111] border-b border-white/10 px-2 py-2">
          <Skeleton className="h-10 w-10 bg-white/10" />
        </header>

        <div className="flex-1 flex flex-col">
          {/* Conversation header skeleton */}
          <div className="border-b bg-[#111111] p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 bg-white/10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-64 bg-white/10" />
                <Skeleton className="h-4 w-32 bg-white/10" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-10 bg-white/10" />
                <Skeleton className="h-10 w-10 bg-white/10" />
              </div>
            </div>
          </div>

          {/* Messages skeleton */}
          <div className="flex-1 p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`} key={i}>
                <Skeleton className={`h-20 bg-white/10 ${i % 2 === 0 ? 'w-2/3' : 'w-3/4'}`} />
              </div>
            ))}
          </div>

          {/* Message input skeleton */}
          <div className="border-t bg-[#111111] p-4">
            <div className="flex gap-2">
              <Skeleton className="h-20 flex-1 bg-white/10" />
              <Skeleton className="h-10 w-20 bg-white/10" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
