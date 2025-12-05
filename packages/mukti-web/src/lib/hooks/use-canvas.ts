/**
 * TanStack Query hooks for canvas session management
 *
 * Provides hooks for:
 * - Fetching canvas sessions (list and individual)
 * - Creating canvas sessions with optimistic updates
 * - Updating canvas sessions (node positions, explored nodes)
 *
 * All mutations implement optimistic updates for immediate UI feedback
 * with automatic rollback on errors.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CanvasSession, CreateCanvasSessionDto } from '@/types/canvas.types';

import { canvasApi, type UpdateCanvasSessionDto } from '@/lib/api/canvas';
import { canvasKeys } from '@/lib/query-keys';

/**
 * Context for optimistic update rollback
 */
interface UpdateCanvasSessionContext {
  previousSession: CanvasSession | undefined;
}

/**
 * Update canvas session mutation variables
 */
interface UpdateCanvasSessionVariables {
  dto: UpdateCanvasSessionDto;
  id: string;
}

/**
 * Fetch a specific canvas session by ID
 *
 * @param id - Canvas session ID
 * @returns Query result with session data
 *
 * @example
 * ```typescript
 * const { data: session, isLoading, error } = useCanvasSession('507f1f77bcf86cd799439011');
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error.message} />;
 *
 * return <ThinkingCanvas session={session} />;
 * ```
 */
export function useCanvasSession(id: string) {
  return useQuery<CanvasSession, Error>({
    enabled: !!id,
    queryFn: () => canvasApi.getSession(id),
    queryKey: canvasKeys.detail(id),
  });
}

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

/**
 * Update canvas session with optimistic updates
 *
 * Updates node positions and/or explored nodes for a canvas session.
 * Implements optimistic updates for immediate UI feedback with automatic
 * rollback on errors.
 *
 * @returns Mutation result with update function
 *
 * @example
 * ```typescript
 * const { mutate: updateSession, isPending } = useUpdateCanvasSession();
 *
 * // Update node positions after drag
 * updateSession({
 *   id: '507f1f77bcf86cd799439011',
 *   dto: {
 *     nodePositions: [
 *       { nodeId: 'seed', x: 0, y: 0 },
 *       { nodeId: 'soil-0', x: -200, y: -100 },
 *     ],
 *   },
 * });
 *
 * // Mark node as explored
 * updateSession({
 *   id: '507f1f77bcf86cd799439011',
 *   dto: {
 *     exploredNodes: ['seed', 'root-0'],
 *   },
 * });
 * ```
 */
export function useUpdateCanvasSession() {
  const queryClient = useQueryClient();

  return useMutation<
    CanvasSession,
    Error,
    UpdateCanvasSessionVariables,
    UpdateCanvasSessionContext
  >({
    mutationFn: ({ dto, id }: UpdateCanvasSessionVariables) => canvasApi.updateSession(id, dto),

    onError: (_err, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousSession) {
        queryClient.setQueryData(canvasKeys.detail(variables.id), context.previousSession);
      }
    },

    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: canvasKeys.detail(variables.id) });

      // Snapshot the previous value
      const previousSession = queryClient.getQueryData<CanvasSession>(
        canvasKeys.detail(variables.id)
      );

      // Optimistically update the cache
      if (previousSession) {
        queryClient.setQueryData<CanvasSession>(canvasKeys.detail(variables.id), {
          ...previousSession,
          ...(variables.dto.exploredNodes && { exploredNodes: variables.dto.exploredNodes }),
          ...(variables.dto.nodePositions && { nodePositions: variables.dto.nodePositions }),
        });
      }

      // Return context with previous value for rollback
      return { previousSession };
    },

    onSettled: (_data, _error, variables) => {
      // Invalidate to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: canvasKeys.detail(variables.id) });
    },
  });
}
