/**
 * Route redirect utilities for dashboard migration
 *
 * This module provides functions to redirect old /dashboard/* routes
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
 */

/**
 * Gets the full redirect path from a complete dashboard URL path
 *
 * @param fullPath - The full URL path (e.g., '/dashboard/conversations/123')
 * @returns The new redirect path without /dashboard prefix
 *
 * @example
 * ```typescript
 * getRedirectFromDashboardPath('/dashboard') // returns '/chat'
 * getRedirectFromDashboardPath('/dashboard/conversations') // returns '/chat'
 * getRedirectFromDashboardPath('/dashboard/conversations/abc123') // returns '/chat/abc123'
 * ```
 */
export function getRedirectFromDashboardPath(fullPath: string): string {
  const pathAfterDashboard = fullPath.replace('/dashboard', '') || '/';
  return getRedirectPath(pathAfterDashboard);
}

/**
 * Gets the redirect path for a given path after /dashboard
 *
 * @param pathAfterDashboard - The path segment after /dashboard (e.g., '/conversations', '/canvas/123')
 * @returns The new redirect path without /dashboard prefix
 *
 * @example
 * ```typescript
 * getRedirectPath('/') // returns '/chat'
 * getRedirectPath('/conversations') // returns '/chat'
 * getRedirectPath('/conversations/abc123') // returns '/chat/abc123'
 * getRedirectPath('/canvas') // returns '/canvas'
 * getRedirectPath('/security') // returns '/security'
 * ```
 */
export function getRedirectPath(pathAfterDashboard: string): string {
  // Exact matches
  if (pathAfterDashboard === '/' || pathAfterDashboard === '') {
    return '/chat';
  }
  if (pathAfterDashboard === '/conversations') {
    return '/chat';
  }
  if (pathAfterDashboard === '/canvas') {
    return '/canvas';
  }
  if (pathAfterDashboard === '/security') {
    return '/security';
  }
  if (pathAfterDashboard === '/settings') {
    return '/settings';
  }
  if (pathAfterDashboard === '/help') {
    return '/help';
  }

  // Pattern matches for dynamic routes
  if (pathAfterDashboard.startsWith('/conversations/')) {
    // /dashboard/conversations/:id → /chat/:id
    const id = pathAfterDashboard.replace('/conversations/', '');
    return `/chat/${id}`;
  }
  if (pathAfterDashboard.startsWith('/canvas/')) {
    // /dashboard/canvas/:id → /canvas/:id
    const id = pathAfterDashboard.replace('/canvas/', '');
    return `/canvas/${id}`;
  }

  // Default: return the path as-is (removes /dashboard prefix)
  return pathAfterDashboard;
}
