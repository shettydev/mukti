'use client';

import { Bell, Mail } from 'lucide-react';

import type { DashboardLayoutSkeletonProps } from '@/types/layout.types';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Reusable loading skeleton for dashboard pages
 *
 * Provides consistent loading state matching DashboardLayout structure.
 * Includes skeleton sidebar, navbar, and customizable content area.
 *
 * Features:
 * - Matches DashboardLayout structure exactly
 * - Responsive skeleton (mobile and desktop)
 * - Customizable content area skeleton
 * - Consistent with design system
 *
 * @example
 * ```tsx
 * // Basic usage
 * <DashboardLayoutSkeleton />
 *
 * // With custom content skeleton
 * <DashboardLayoutSkeleton>
 *   <div className="space-y-4">
 *     <Skeleton className="h-12 w-full" />
 *     <Skeleton className="h-12 w-full" />
 *   </div>
 * </DashboardLayoutSkeleton>
 * ```
 */
export function DashboardLayoutSkeleton({
  children,
  contentClassName,
  showSidebar = true,
}: DashboardLayoutSkeletonProps) {
  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Sidebar Skeleton */}
      {showSidebar && (
        <>
          {/* Desktop Sidebar */}
          <aside
            className="hidden md:flex flex-col w-64 bg-[#111111] border-r border-white/10"
            role="complementary"
          >
            {/* Logo skeleton */}
            <div className="p-4 border-b border-white/10">
              <Skeleton className="h-8 w-32" />
            </div>

            {/* Navigation items skeleton */}
            <nav className="flex-1 p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div className="flex items-center gap-3 px-3 py-2" key={i}>
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </nav>

            {/* Bottom section skeleton */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden" role="main">
        {/* Navbar Skeleton */}
        <header className="bg-[#111111] border-b border-white/10 px-4 md:px-6 py-3 md:py-4 flex items-center gap-2">
          {/* Mobile menu button skeleton */}
          {showSidebar && <Skeleton className="md:hidden h-9 w-9 rounded-md" />}

          {/* Desktop collapse button skeleton */}
          {showSidebar && <Skeleton className="hidden md:block h-9 w-9 rounded-md" />}

          {/* Page title skeleton */}
          <Skeleton className="h-6 w-32 md:w-48" />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Navbar actions skeleton */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Bell aria-hidden="true" className="w-5 h-5 text-white/20" />
            </div>
            <div className="min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Mail aria-hidden="true" className="w-5 h-5 text-white/20" />
            </div>

            {/* User menu skeleton */}
            <div className="flex items-center gap-2 pl-2 md:pl-3 border-l border-white/10">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="hidden lg:block space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>

            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </header>

        {/* Content Area Skeleton */}
        <div className={cn('flex-1 overflow-y-auto p-4 md:p-6', contentClassName)}>
          {children || (
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton className="h-32 w-full rounded-lg" key={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
