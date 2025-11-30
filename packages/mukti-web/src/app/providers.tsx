/**
 * Application providers
 *
 * Wraps the app with necessary context providers:
 * - TanStack Query for data fetching and caching
 *
 * Performance optimizations:
 * - Centralized cache configuration from config.ts
 * - Background refetch on window focus for data freshness
 * - Optimized stale times and cache times
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { AuthInitializer } from '@/components/auth/auth-initializer';
import { config } from '@/lib/config';

/**
 * Props for Providers component
 */
interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Providers component that wraps the app with TanStack Query
 *
 * @param props - Component props
 * @returns Wrapped children with providers
 */
export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: {
            retry: 1,
          },
          queries: {
            // Use centralized config for cache settings
            gcTime: config.cache.defaultCacheTime, // 5 minutes (garbage collection time)
            // Only refetch stale queries on window focus
            refetchOnMount: 'always',
            // Enable background refetch on window focus for data freshness
            refetchOnWindowFocus: true,
            // Retry failed queries once
            retry: 1,
            // Use centralized config for stale time
            staleTime: config.cache.defaultStaleTime, // 1 minute
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      {children}
    </QueryClientProvider>
  );
}
