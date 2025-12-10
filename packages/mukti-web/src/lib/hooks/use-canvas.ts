/**
 * TanStack Query hooks for canvas session management
 *
 * Provides hooks for:
 * - Fetching canvas sessions (list and individual)
 * - Creating canvas sessions with optimistic updates
 * - Updating canvas sessions (node positions, explored nodes)
 * - Insight node management (create, get, delete)
 *
 * All mutations implement optimistic updates for immediate UI feedback
 * with automatic rollback on errors.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CanvasSession,
  CreateCanvasSessionDto,
  CreateInsightNodeDto,
  InsightNode,
} from '@/types/canvas.types';

import {
  canvasApi,
  type UpdateCanvasSessionDto,
  type UpdateInsightNodeDto,
} from '@/lib/api/canvas';
import { canvasKeys } from '@/lib/query-keys';

// ============================================
// Interfaces (must come before exported functions)
// ============================================

/**
 * Context for optimistic update rollback on insight creation
 */
interface CreateInsightContext {
  previousInsights: InsightNode[] | undefined;
}

/**
 * Create insight mutation variables
 */
interface CreateInsightVariables {
  dto: CreateInsightNodeDto;
  sessionId: string;
}

/**
 * Context for optimistic update rollback on insight deletion
 */
interface DeleteInsightContext {
  previousInsights: InsightNode[] | undefined;
}

/**
 * Delete insight mutation variables
 */
interface DeleteInsightVariables {
  nodeId: string;
  sessionId: string;
}

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
 * Context for optimistic update rollback on insight update
 */
interface UpdateInsightContext {
  previousInsights: InsightNode[] | undefined;
}

/**
 * Update insight mutation variables
 */
interface UpdateInsightVariables {
  dto: UpdateInsightNodeDto;
  nodeId: string;
  sessionId: string;
}

// ============================================
// Canvas Session Hooks
// ============================================

/**
 * Fetch all insight nodes for a canvas session
 *
 * @param sessionId - Canvas session ID
 * @returns Query result with insights array
 *
 * @example
 * ```typescript
 * const { data: insights, isLoading, error } = useCanvasInsights('507f1f77bcf86cd799439011');
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error.message} />;
 *
 * return insights.map(insight => <InsightNode insight={insight} />);
 * ```
 */
export function useCanvasInsights(sessionId: string) {
  return useQuery<InsightNode[], Error>({
    enabled: !!sessionId,
    queryFn: () => canvasApi.getInsights(sessionId),
    queryKey: canvasKeys.insights(sessionId),
  });
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
 * Create new insight node with optimistic update
 *
 * Creates an insight node connected to a parent node.
 * Automatically invalidates insight queries on success.
 *
 * @returns Mutation result with create function
 *
 * @example
 * ```typescript
 * const { mutate: createInsight, isPending } = useCreateInsight();
 *
 * createInsight({
 *   sessionId: '507f1f77bcf86cd799439011',
 *   dto: {
 *     label: 'The real issue might be communication',
 *     parentNodeId: 'root-0',
 *     x: 150,
 *     y: 200,
 *   },
 * }, {
 *   onSuccess: (insight) => {
 *     // Handle success
 *   }
 * });
 * ```
 */
export function useCreateInsight() {
  const queryClient = useQueryClient();

  return useMutation<InsightNode, Error, CreateInsightVariables, CreateInsightContext>({
    mutationFn: ({ dto, sessionId }: CreateInsightVariables) =>
      canvasApi.createInsight(sessionId, dto),

    onError: (_err, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousInsights) {
        queryClient.setQueryData(
          canvasKeys.insights(variables.sessionId),
          context.previousInsights
        );
      }
    },

    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: canvasKeys.insights(variables.sessionId) });

      // Snapshot the previous value
      const previousInsights = queryClient.getQueryData<InsightNode[]>(
        canvasKeys.insights(variables.sessionId)
      );

      // Optimistically add the new insight with a temporary ID
      if (previousInsights) {
        const tempInsight: InsightNode = {
          createdAt: new Date().toISOString(),
          id: `temp-${Date.now()}`,
          isExplored: false,
          label: variables.dto.label,
          nodeId: `insight-${previousInsights.length}`,
          parentNodeId: variables.dto.parentNodeId,
          position: { x: variables.dto.x, y: variables.dto.y },
          sessionId: variables.sessionId,
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData<InsightNode[]>(canvasKeys.insights(variables.sessionId), [
          ...previousInsights,
          tempInsight,
        ]);
      }

      // Return context with previous value for rollback
      return { previousInsights };
    },

    onSuccess: (_data, variables) => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: canvasKeys.insights(variables.sessionId) });
      // Also invalidate session to update any session-level state
      queryClient.invalidateQueries({ queryKey: canvasKeys.session(variables.sessionId) });
    },
  });
}

/**
 * Delete insight node with optimistic update
 *
 * Deletes an insight node from a canvas session.
 * Implements optimistic updates for immediate UI feedback with automatic
 * rollback on errors.
 *
 * @returns Mutation result with delete function
 *
 * @example
 * ```typescript
 * const { mutate: deleteInsight, isPending } = useDeleteInsight();
 *
 * deleteInsight({
 *   sessionId: '507f1f77bcf86cd799439011',
 *   nodeId: 'insight-0',
 * });
 * ```
 */
export function useDeleteInsight() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteInsightVariables, DeleteInsightContext>({
    mutationFn: ({ nodeId, sessionId }: DeleteInsightVariables) =>
      canvasApi.deleteInsight(sessionId, nodeId),

    onError: (_err, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousInsights) {
        queryClient.setQueryData(
          canvasKeys.insights(variables.sessionId),
          context.previousInsights
        );
      }
    },

    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: canvasKeys.insights(variables.sessionId) });

      // Snapshot the previous value
      const previousInsights = queryClient.getQueryData<InsightNode[]>(
        canvasKeys.insights(variables.sessionId)
      );

      // Optimistically remove the insight
      if (previousInsights) {
        queryClient.setQueryData<InsightNode[]>(
          canvasKeys.insights(variables.sessionId),
          previousInsights.filter((insight) => insight.nodeId !== variables.nodeId)
        );
      }

      // Return context with previous value for rollback
      return { previousInsights };
    },

    onSuccess: (_data, variables) => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: canvasKeys.insights(variables.sessionId) });
      // Also invalidate session to update any session-level state
      queryClient.invalidateQueries({ queryKey: canvasKeys.session(variables.sessionId) });
    },
  });
}

/**
 * Update canvas session with optimistic updates
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

    onSuccess: (data, variables) => {
      // Update cache with server response to ensure consistency
      queryClient.setQueryData(canvasKeys.detail(variables.id), data);
    },
  });
}

/**
 * Update insight node with optimistic update
 *
 * Updates an insight node (label, position, isExplored).
 * Implements optimistic updates for immediate UI feedback with automatic
 * rollback on errors.
 *
 * @returns Mutation result with update function
 *
 * @example
 * ```typescript
 * const { mutate: updateInsight, isPending } = useUpdateInsight();
 *
 * updateInsight({
 *   sessionId: 'session-id',
 *   nodeId: 'insight-0',
 *   dto: {
 *     x: 100,
 *     y: 200,
 *   },
 * });
 * ```
 */
export function useUpdateInsight() {
  const queryClient = useQueryClient();

  return useMutation<InsightNode, Error, UpdateInsightVariables, UpdateInsightContext>({
    mutationFn: ({ dto, nodeId, sessionId }: UpdateInsightVariables) =>
      canvasApi.updateInsight(sessionId, nodeId, dto),

    onError: (_err, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousInsights) {
        queryClient.setQueryData(
          canvasKeys.insights(variables.sessionId),
          context.previousInsights
        );
      }
    },

    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: canvasKeys.insights(variables.sessionId) });

      // Snapshot the previous value
      const previousInsights = queryClient.getQueryData<InsightNode[]>(
        canvasKeys.insights(variables.sessionId)
      );

      // Optimistically update the insight
      if (previousInsights) {
        const updatedInsights = previousInsights.map((insight) =>
          insight.nodeId === variables.nodeId
            ? {
                ...insight,
                ...(variables.dto.label && { label: variables.dto.label }),
                ...(variables.dto.isExplored !== undefined && {
                  isExplored: variables.dto.isExplored,
                }),
                ...(variables.dto.x !== undefined &&
                  variables.dto.y !== undefined && {
                    position: {
                      x: variables.dto.x,
                      y: variables.dto.y,
                    },
                  }),
                updatedAt: new Date().toISOString(),
              }
            : insight
        );

        queryClient.setQueryData<InsightNode[]>(
          canvasKeys.insights(variables.sessionId),
          updatedInsights
        );
      }

      // Return context with previous value for rollback
      return { previousInsights };
    },

    onSuccess: (_data, variables) => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: canvasKeys.insights(variables.sessionId) });
    },
  });
}
