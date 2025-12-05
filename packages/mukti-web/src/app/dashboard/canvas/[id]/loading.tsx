/**
 * Canvas loading skeleton
 *
 * Displays a placeholder during canvas page load.
 * Uses Next.js App Router loading convention.
 *
 * @requirements 9.1
 */

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading component for canvas detail page
 * Displays a canvas-like skeleton with node placeholders
 */
export default function CanvasLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a]">
      <div className="relative flex flex-col items-center gap-6">
        {/* Central seed node skeleton */}
        <div className="relative">
          <Skeleton className="h-28 w-56 rounded-xl" />
          {/* Pulse effect */}
          <div className="absolute inset-0 animate-pulse rounded-xl bg-primary/5" />
        </div>

        {/* Satellite nodes skeleton - arranged in a semi-circle pattern */}
        <div className="flex items-center gap-12">
          {/* Left side - Soil nodes */}
          <div className="flex flex-col gap-4">
            <Skeleton className="h-16 w-36 rounded-lg" />
            <Skeleton className="h-16 w-36 rounded-lg" />
          </div>

          {/* Spacer for central alignment */}
          <div className="w-20" />

          {/* Right side - Root nodes */}
          <div className="flex flex-col gap-4">
            <Skeleton className="h-16 w-36 rounded-lg" />
            <Skeleton className="h-16 w-36 rounded-lg" />
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
          <span className="ml-2 text-sm">Loading your thinking canvas...</span>
        </div>

        {/* Controls skeleton - bottom left */}
        <div className="absolute bottom-4 left-4">
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        {/* Legend skeleton - bottom right */}
        <div className="absolute bottom-4 right-4">
          <Skeleton className="h-20 w-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
