/**
 * Example component demonstrating auth store usage
 * This component shows the current authentication status
 */

'use client';

import { useAuthStore, useIsAuthenticated, useUser } from '@/lib/stores/auth-store';

export function AuthStatus() {
  const user = useUser();
  const isAuthenticated = useIsAuthenticated();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  if (!isAuthenticated || !user) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Not authenticated</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Authenticated</h3>
        <button
          className="text-xs text-destructive hover:underline"
          onClick={clearAuth}
          type="button"
        >
          Logout
        </button>
      </div>
      <div className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Name:</span> {user.firstName} {user.lastName}
        </p>
        <p>
          <span className="text-muted-foreground">Email:</span> {user.email}
        </p>
        <p>
          <span className="text-muted-foreground">Role:</span> {user.role}
        </p>
        <p>
          <span className="text-muted-foreground">Email Verified:</span>{' '}
          {user.emailVerified ? '✓' : '✗'}
        </p>
      </div>
    </div>
  );
}
