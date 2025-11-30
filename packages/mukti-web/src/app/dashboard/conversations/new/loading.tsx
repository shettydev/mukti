import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading state for new conversation page
 * Displays skeleton UI matching the final layout
 *
 */
export default function NewConversationLoading() {
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
        <header className="bg-[#111111] border-b border-white/10 px-6 py-4 flex items-center gap-4">
          <Skeleton className="h-10 w-10 bg-white/10" />
          <Skeleton className="h-10 w-40 bg-white/10" />
        </header>
        <div className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <Skeleton className="h-10 w-80 mx-auto mb-2 bg-white/10" />
              <Skeleton className="h-6 w-96 mx-auto bg-white/10" />
            </div>
          </div>
        </div>
      </main>

      {/* Dialog skeleton overlay */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-[#111111] rounded-lg p-6 w-full max-w-lg mx-4">
          <Skeleton className="h-8 w-48 mb-2 bg-white/10" />
          <Skeleton className="h-4 w-64 mb-6 bg-white/10" />

          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-16 mb-2 bg-white/10" />
              <Skeleton className="h-10 w-full bg-white/10" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-2 bg-white/10" />
              <Skeleton className="h-10 w-full bg-white/10" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2 bg-white/10" />
              <Skeleton className="h-10 w-full bg-white/10" />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Skeleton className="h-10 w-20 bg-white/10" />
            <Skeleton className="h-10 w-32 bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
