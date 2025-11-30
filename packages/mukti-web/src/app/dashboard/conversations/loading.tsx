import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading state for conversations list page
 * Displays skeleton UI matching the final layout
 *
 */
export default function ConversationsLoading() {
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
        <header className="bg-[#111111] border-b border-white/10 px-6 py-4">
          <Skeleton className="h-10 w-10 bg-white/10" />
        </header>
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header skeleton */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Skeleton className="h-8 w-48 mb-2 bg-white/10" />
                  <Skeleton className="h-4 w-32 bg-white/10" />
                </div>
                <Skeleton className="h-10 w-24 bg-white/10" />
              </div>
              <Skeleton className="h-10 w-full max-w-md bg-white/10" />
            </div>

            {/* Conversation cards skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton className="h-48 bg-white/10" key={i} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
