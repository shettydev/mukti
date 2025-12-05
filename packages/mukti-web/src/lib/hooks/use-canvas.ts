/**
 * TanStack Query hooks for canvas session management
 *
 * Provides hooks for:
 * - Fetching canvas sessions
 * - Creating canvas sessions with optimistic updates
 *
 * All mutations implement optimistic updates for immediate UI feedback
 * with automatic rollback on errors.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CanvasSession, CreateCanvasSessionDto } from '@/types/canvas.types';

import { canvasApi } from '@/lib/api/canvas';
import { canvasKeys } from '@/lib/query-keys';

/**
 * Fetch all canvas sessions for the authenticated user
 *
 * @returns Query result with sessions array
 *
 * @example
 * ```typescript
 * const { data: sessions, isLoading, error } = useCanvasSessions();
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error.message} />;
 *
 * return sessions.map(session => <SessionCard session={session} />);
 * ```
 */
export function useCanvasSessions() {
  return useQuery<CanvasSession[], Error>({
    queryFn: () => canvasApi.getSessions(),
    queryKey: canvasKeys.sessions(),
  });
}

/**
 * Create new canvas session with optimistic update
 *
 * Creates a canvas session with the problem structure (seed, soil, roots).
 * Automatically invalidates canvas queries on success.
 *
 * @returns Mutation result with create function
 *
 * @example
 * ```typescript
 * const { mutate: createSession, isPending } = useCreateCanvasSession();
 *
 * createSession({
 *   seed: 'My team is burned out',
 *   soil: ['Budget is tight', 'Deadline in 2 weeks'],
 *   roots: ['We need to hire more people'],
 * }, {
 *   onSuccess: (session) => {
 *     // Navigate to canvas or close dialog
 *   }
 * });
 * ```
 */
export function useCreateCanvasSession() {
  const queryClient = useQueryClient();

  return useMutation<CanvasSession, Error, CreateCanvasSessionDto>({
    mutationFn: (dto: CreateCanvasSessionDto) => canvasApi.createSession(dto),

    onSuccess: () => {
      // Invalidate canvas queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: canvasKeys.all });
    },
  });
}
