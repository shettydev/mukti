/**
 * Application providers
 *
 * Wraps the app with necessary context providers:
 * - TanStack Query for data fetching and caching
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { AuthInitializer } from '@/components/auth/auth-initializer';

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
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 60 * 1000, // 1 minute
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
