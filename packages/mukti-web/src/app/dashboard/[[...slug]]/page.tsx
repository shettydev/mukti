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
 */

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { getRedirectFromDashboardPath } from '@/lib/utils/route-redirects';

export default function DashboardRedirectPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const redirectPath = getRedirectFromDashboardPath(pathname);
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
