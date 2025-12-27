/**
 * Property-based tests for route redirects
 *
 * **Property: Dashboard routes redirect correctly**
 *
 * Tests that all /dashboard/* routes are correctly redirected to the
 * equivalent /chat, /canvas, or settings routes.
 */

import * as fc from 'fast-check';

import { getRedirectFromDashboardPath, getRedirectPath } from '../route-redirects';

describe('Route Redirects - Property Tests', () => {
  /**
   * Property: Dashboard routes redirect correctly
   *
   * For any navigation to /dashboard/*, the system should redirect to
   * the equivalent /chat, /canvas, or settings route.
   *
   */
  describe('Property: Dashboard routes redirect correctly', () => {
    it('should never return a path containing /dashboard', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Exact dashboard routes
            fc.constant('/dashboard'),
            fc.constant('/dashboard/'),
            fc.constant('/dashboard/conversations'),
            fc.constant('/dashboard/canvas'),
            fc.constant('/dashboard/security'),
            fc.constant('/dashboard/settings'),
            fc.constant('/dashboard/help'),
            // Dynamic conversation routes
            fc
              .string({ maxLength: 50, minLength: 1 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s))
              .map((id) => `/dashboard/conversations/${id}`),
            // Dynamic canvas routes
            fc
              .string({ maxLength: 50, minLength: 1 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s))
              .map((id) => `/dashboard/canvas/${id}`)
          ),
          (dashboardPath) => {
            const redirected = getRedirectFromDashboardPath(dashboardPath);
            // The redirected path should never contain /dashboard
            expect(redirected).not.toContain('/dashboard');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should redirect /dashboard root to /chat', () => {
      fc.assert(
        fc.property(fc.constantFrom('/', ''), (pathAfterDashboard) => {
          const redirected = getRedirectPath(pathAfterDashboard);
          expect(redirected).toBe('/chat');
        }),
        { numRuns: 10 }
      );
    });

    it('should redirect /dashboard/conversations to /chat', () => {
      const redirected = getRedirectPath('/conversations');
      expect(redirected).toBe('/chat');
    });

    it('should redirect /dashboard/conversations/:id to /chat/:id for any valid ID', () => {
      fc.assert(
        fc.property(
          // Generate valid conversation IDs (alphanumeric with dashes/underscores)
          fc.string({ maxLength: 50, minLength: 1 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          (conversationId) => {
            const redirected = getRedirectPath(`/conversations/${conversationId}`);
            expect(redirected).toBe(`/chat/${conversationId}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should redirect /dashboard/canvas/:id to /canvas/:id for any valid ID', () => {
      fc.assert(
        fc.property(
          // Generate valid canvas IDs (alphanumeric with dashes/underscores)
          fc.string({ maxLength: 50, minLength: 1 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
          (canvasId) => {
            const redirected = getRedirectPath(`/canvas/${canvasId}`);
            expect(redirected).toBe(`/canvas/${canvasId}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve settings routes without /dashboard prefix', () => {
      fc.assert(
        fc.property(fc.constantFrom('/security', '/settings', '/help'), (settingsPath) => {
          const redirected = getRedirectPath(settingsPath);
          // Settings routes should remain the same (just without /dashboard)
          expect(redirected).toBe(settingsPath);
        }),
        { numRuns: 10 }
      );
    });

    it('should redirect /dashboard/canvas to /canvas', () => {
      const redirected = getRedirectPath('/canvas');
      expect(redirected).toBe('/canvas');
    });

    it('should handle full dashboard paths correctly', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('/dashboard'),
            fc.constant('/dashboard/conversations'),
            fc.constant('/dashboard/canvas'),
            fc.constant('/dashboard/security'),
            fc.constant('/dashboard/settings'),
            fc.constant('/dashboard/help')
          ),
          (fullPath) => {
            const redirected = getRedirectFromDashboardPath(fullPath);
            // All redirected paths should start with /
            expect(redirected.startsWith('/')).toBe(true);
            // None should contain /dashboard
            expect(redirected).not.toContain('/dashboard');
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
