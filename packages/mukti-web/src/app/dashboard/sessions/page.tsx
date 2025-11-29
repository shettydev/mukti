/**
 * Sessions management page
 * Displays all active sessions with ability to revoke individual or all sessions
 */

'use client';

import { AlertTriangle, Loader2, LogOut, Shield } from 'lucide-react';
import { useState } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { SessionCard } from '@/components/sessions/session-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRevokeAllSessions, useRevokeSession, useSessions } from '@/lib/hooks/use-sessions';

/**
 * Sessions management page
 */
export default function SessionsPage() {
  return (
    <ProtectedRoute>
      <SessionsContent />
    </ProtectedRoute>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
      <h3 className="mb-2 text-lg font-semibold">No active sessions</h3>
      <p className="text-sm text-muted-foreground">
        You don&apos;t have any active sessions at the moment.
      </p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
      <h3 className="mb-2 text-lg font-semibold">Failed to load sessions</h3>
      <p className="mb-6 text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={onRetry} variant="outline">
        Try again
      </Button>
    </div>
  );
}

/**
 * Sessions content component
 * Separated to allow ProtectedRoute to handle auth checks
 */
function SessionsContent() {
  const { data, error, isLoading, refetch } = useSessions();
  const revokeMutation = useRevokeSession();
  const revokeAllMutation = useRevokeAllSessions();
  const [revokingSessionId, setRevokingSessionId] = useState<null | string>(null);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await revokeMutation.mutateAsync(sessionId);
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (
      !window.confirm(
        'Are you sure you want to log out from all other devices? This action cannot be undone.'
      )
    ) {
      return;
    }

    await revokeAllMutation.mutateAsync();
  };

  const sessions = data?.sessions || [];
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="container mx-auto max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Active Sessions</h1>
        <p className="text-muted-foreground">
          Manage your active sessions across all devices. You can revoke access from any device at
          any time.
        </p>
      </div>

      {/* Logout from all devices button */}
      {!isLoading && otherSessions.length > 0 && (
        <div className="mb-6 flex justify-end">
          <Button
            disabled={revokeAllMutation.isPending}
            onClick={handleRevokeAllSessions}
            variant="destructive"
          >
            {revokeAllMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Logout from all devices
              </>
            )}
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <SessionsSkeleton />}

      {/* Error state */}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}

      {/* Empty state */}
      {!isLoading && !error && sessions.length === 0 && <EmptyState />}

      {/* Sessions list */}
      {!isLoading && !error && sessions.length > 0 && (
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionCard
              isRevoking={revokingSessionId === session.id}
              key={session.id}
              onRevoke={handleRevokeSession}
              session={session}
            />
          ))}
        </div>
      )}

      {/* Info message */}
      {!isLoading && !error && sessions.length > 0 && (
        <div className="mt-8 rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>
            <strong>Security tip:</strong> If you see any sessions you don&apos;t recognize, revoke
            them immediately and change your password.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for sessions list
 */
function SessionsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton className="h-40 w-full" key={i} />
      ))}
    </div>
  );
}
