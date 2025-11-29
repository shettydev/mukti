/**
 * Protected Route Wrapper Component
 *
 * Wraps components that require authentication.
 * - Checks authentication status
 * - Shows loading state while checking auth
 * - Redirects to home page if not authenticated
 *
 * @example
 * ```tsx
 * // Wrap a page component
 * export default function DashboardPage() {
 *   return (
 *     <ProtectedRoute>
 *       <DashboardContent />
 *     </ProtectedRoute>
 *   );
 * }
 *
 * // With custom loading component
 * export default function ProfilePage() {
 *   return (
 *     <ProtectedRoute loadingComponent={<CustomLoader />}>
 *       <ProfileContent />
 *     </ProtectedRoute>
 *   );
 * }
 * ```
 */

'use client';

import type { ReactNode } from 'react';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/hooks/use-auth';

interface ProtectedRouteProps {
  /**
   * Child components to render when authenticated
   */
  children: ReactNode;

  /**
   * Custom loading component to show while checking auth
   * Defaults to centered spinner
   */
  loadingComponent?: ReactNode;

  /**
   * Path to redirect to when not authenticated
   * Defaults to '/'
   */
  redirectTo?: string;
}

/**
 * Protected Route Component
 *
 * Ensures user is authenticated before rendering children.
 * Shows loading state while checking authentication.
 * Redirects to specified path if not authenticated.
 */
export function ProtectedRoute({
  children,
  loadingComponent,
  redirectTo = '/',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Redirect to home if not authenticated and not loading
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Don't render children if not authenticated
  // (will redirect via useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // Render children when authenticated
  return children;
}
