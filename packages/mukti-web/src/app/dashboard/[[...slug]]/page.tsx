'use client';

/**
 * Dashboard Redirect Handler
 *
 * This catch-all route handles all /dashboard/* paths and redirects them
 * to the new clean URL structure without the /dashboard prefix.
 *
 * Redirect Mapping:
 * - /dashboard → /chat
 * - /dashboard/conversations → /chat
 * - /dashboard/conversations/:id → /chat/:id
 * - /dashboard/canvas → /canvas
 * - /dashboard/canvas/:id → /canvas/:id
 * - /dashboard/security → /security
 * - /dashboard/settings → /settings
 * - /dashboard/help → /help
 *
 * Requirements: 7.2
 */

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardRedirectPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Get the path after /dashboard
    const pathAfterDashboard = pathname.replace('/dashboard', '') || '/';

    // Define redirect mapping
    const getRedirectPath = (path: string): string => {
      // Exact matches
      if (path === '/' || path === '') {
        return '/chat';
      }
      if (path === '/conversations') {
        return '/chat';
      }
      if (path === '/canvas') {
        return '/canvas';
      }
      if (path === '/security') {
        return '/security';
      }
      if (path === '/settings') {
        return '/settings';
      }
      if (path === '/help') {
        return '/help';
      }

      // Pattern matches for dynamic routes
      if (path.startsWith('/conversations/')) {
        // /dashboard/conversations/:id → /chat/:id
        const id = path.replace('/conversations/', '');
        return `/chat/${id}`;
      }
      if (path.startsWith('/canvas/')) {
        // /dashboard/canvas/:id → /canvas/:id
        const id = path.replace('/canvas/', '');
        return `/canvas/${id}`;
      }

      // Default: remove /dashboard prefix
      return path;
    };

    const redirectPath = getRedirectPath(pathAfterDashboard);
    router.replace(redirectPath);
  }, [pathname, router]);

  // Show loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
