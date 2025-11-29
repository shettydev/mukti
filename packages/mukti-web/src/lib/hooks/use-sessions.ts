/**
 * Session management hooks using TanStack Query
 * Provides hooks for fetching and managing user sessions
 *
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authApi } from '@/lib/api/auth';

/**
 * Query keys factory for sessions
 */
export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
};

/**
 * Hook to revoke all sessions except the current one
 *
 * @returns Mutation function to revoke all sessions
 *
 * @example
 * ```typescript
 * const revokeAllMutation = useRevokeAllSessions();
 * revokeAllMutation.mutate();
 * ```
 */
export function useRevokeAllSessions() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void, { previous: unknown }>({
    mutationFn: authApi.revokeAllSessions,
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(sessionKeys.lists(), context.previous);
      }
    },
    onMutate: async () => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: sessionKeys.lists() });

      // Snapshot previous value
      const previous = queryClient.getQueryData(sessionKeys.lists());

      // Optimistically update by keeping only current session
      queryClient.setQueryData(sessionKeys.lists(), (old: unknown) => {
        if (!old || typeof old !== 'object' || !('sessions' in old)) {
          return old;
        }
        return {
          ...old,
          sessions: (old.sessions as Array<{ isCurrent?: boolean }>).filter(
            (session) => session.isCurrent
          ),
        };
      });

      return { previous };
    },
    onSuccess: () => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
}

/**
 * Hook to revoke a specific session
 *
 * @returns Mutation function to revoke a session
 *
 * @example
 * ```typescript
 * const revokeMutation = useRevokeSession();
 * revokeMutation.mutate('session-id-123');
 * ```
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, { previous: unknown }>({
    mutationFn: authApi.revokeSession,
    onError: (_err, _sessionId, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(sessionKeys.lists(), context.previous);
      }
    },
    onMutate: async (sessionId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: sessionKeys.lists() });

      // Snapshot previous value
      const previous = queryClient.getQueryData(sessionKeys.lists());

      // Optimistically update by removing the session
      queryClient.setQueryData(sessionKeys.lists(), (old: unknown) => {
        if (!old || typeof old !== 'object' || !('sessions' in old)) {
          return old;
        }
        return {
          ...old,
          sessions: (old.sessions as Array<{ id: string }>).filter(
            (session) => session.id !== sessionId
          ),
        };
      });

      return { previous };
    },
    onSuccess: () => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
}

/**
 * Hook to fetch all active sessions for the current user
 *
 * @returns Query result with sessions data
 *
 * @example
 * ```typescript
 * const { data, isLoading, error } = useSessions();
 * ```
 */
export function useSessions() {
  return useQuery({
    queryFn: authApi.getSessions,
    queryKey: sessionKeys.lists(),
    staleTime: 30 * 1000, // 30 seconds
  });
}
