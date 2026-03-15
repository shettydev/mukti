/**
 * TanStack Query hooks for Thought Map management
 *
 * Provides hooks for:
 * - Fetching thought maps (list and individual with nodes)
 * - Creating thought maps
 * - Creating, updating, and deleting thought nodes
 *
 * All mutations implement optimistic updates for immediate UI feedback
 * with automatic rollback on errors.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { thoughtMapApi } from '@/lib/api/thought-map';
import { thoughtMapKeys } from '@/lib/query-keys';
import {
  type CreateThoughtMapRequest,
  type CreateThoughtNodeRequest,
  getThoughtMapNodeType,
  type ThoughtMap,
  type ThoughtMapNode,
  type ThoughtMapWithNodes,
  type UpdateThoughtNodeRequest,
} from '@/types/thought-map';

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Context for optimistic update rollback on node creation
 */
interface CreateThoughtNodeContext {
  previousData: ThoughtMapWithNodes | undefined;
}

/**
 * Variables for create node mutation
 */
interface CreateThoughtNodeVariables {
  dto: CreateThoughtNodeRequest;
}

/**
 * Context for optimistic update rollback on node deletion
 */
interface DeleteThoughtNodeContext {
  previousData: ThoughtMapWithNodes | undefined;
}

/**
 * Variables for delete node mutation
 */
interface DeleteThoughtNodeVariables {
  mapId: string;
  nodeId: string;
}

/**
 * Context for optimistic update rollback on node update
 */
interface UpdateThoughtNodeContext {
  previousData: ThoughtMapWithNodes | undefined;
}

/**
 * Variables for update node mutation
 */
interface UpdateThoughtNodeVariables {
  dto: UpdateThoughtNodeRequest;
  mapId: string;
  nodeId: string;
}

/**
 * Create a new Thought Map
 *
 * Invalidates the thought maps list on success.
 *
 * @returns Mutation result with create function
 *
 * @example
 * ```typescript
 * const { mutate: createMap, isPending } = useCreateThoughtMap();
 *
 * createMap({ title: 'How can I improve focus?' }, {
 *   onSuccess: (map) => router.push(`/dashboard/thought-maps/${map.id}`)
 * });
 * ```
 */
export function useCreateThoughtMap() {
  const queryClient = useQueryClient();

  return useMutation<ThoughtMap, Error, CreateThoughtMapRequest>({
    mutationFn: (dto: CreateThoughtMapRequest) => thoughtMapApi.createThoughtMap(dto),

    onSuccess: () => {
      // Invalidate list queries so the new map appears
      queryClient.invalidateQueries({ queryKey: thoughtMapKeys.lists() });
    },
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new node in a Thought Map with optimistic update
 *
 * @param mapId - Thought map ID to add the node to
 * @returns Mutation result with create function
 *
 * @example
 * ```typescript
 * const { mutate: createNode, isPending } = useCreateThoughtNode('map-id');
 *
 * createNode({
 *   dto: { mapId: 'map-id', label: 'Sub-thought', parentNodeId: 'branch-0' }
 * });
 * ```
 */
export function useCreateThoughtNode(mapId: string) {
  const queryClient = useQueryClient();

  return useMutation<ThoughtMapNode, Error, CreateThoughtNodeVariables, CreateThoughtNodeContext>({
    mutationFn: ({ dto }: CreateThoughtNodeVariables) => thoughtMapApi.createThoughtNode(dto),

    onError: (_err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(thoughtMapKeys.detail(mapId), context.previousData);
      }
    },

    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: thoughtMapKeys.detail(mapId) });

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueryData<ThoughtMapWithNodes>(
        thoughtMapKeys.detail(mapId)
      );

      // Optimistically add a temporary node
      if (previousData) {
        const tempNode = buildOptimisticThoughtMapNode(mapId, previousData.nodes, variables.dto);

        queryClient.setQueryData<ThoughtMapWithNodes>(thoughtMapKeys.detail(mapId), {
          ...previousData,
          map: { ...previousData.map, nodeCount: previousData.map.nodeCount + 1 },
          nodes: [...previousData.nodes, tempNode],
        });
      }

      return { previousData };
    },

    onSuccess: () => {
      // Invalidate to refetch fresh server data
      queryClient.invalidateQueries({ queryKey: thoughtMapKeys.detail(mapId) });
    },
  });
}

/**
 * Delete a Thought Map node with optimistic update
 *
 * @param mapId - Thought map ID containing the node
 * @returns Mutation result with delete function
 *
 * @example
 * ```typescript
 * const { mutate: deleteNode, isPending } = useDeleteThoughtNode('map-id');
 *
 * deleteNode({ mapId: 'map-id', nodeId: 'branch-0' });
 * ```
 */
export function useDeleteThoughtNode(mapId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteThoughtNodeVariables, DeleteThoughtNodeContext>({
    mutationFn: ({ nodeId }: DeleteThoughtNodeVariables) =>
      thoughtMapApi.deleteThoughtNode(mapId, nodeId),

    onError: (_err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(thoughtMapKeys.detail(mapId), context.previousData);
      }
    },

    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: thoughtMapKeys.detail(mapId) });

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueryData<ThoughtMapWithNodes>(
        thoughtMapKeys.detail(mapId)
      );

      // Optimistically remove the node from cache
      if (previousData) {
        queryClient.setQueryData<ThoughtMapWithNodes>(thoughtMapKeys.detail(mapId), {
          ...previousData,
          map: {
            ...previousData.map,
            nodeCount: Math.max(0, previousData.map.nodeCount - 1),
          },
          nodes: previousData.nodes.filter((node) => node.nodeId !== variables.nodeId),
        });
      }

      return { previousData };
    },

    onSuccess: () => {
      // Invalidate to refetch fresh server data
      queryClient.invalidateQueries({ queryKey: thoughtMapKeys.detail(mapId) });
    },
  });
}

/**
 * Fetch a specific Thought Map by ID, including all its nodes
 *
 * @param id - Thought map ID
 * @returns Query result with map and nodes
 *
 * @example
 * ```typescript
 * const { data, isLoading, error } = useThoughtMap('507f1f77bcf86cd799439011');
 *
 * if (isLoading) return <Loading />;
 * return <ThoughtMapCanvas map={data.map} nodes={data.nodes} />;
 * ```
 */
export function useThoughtMap(id: string) {
  return useQuery<ThoughtMapWithNodes, Error>({
    enabled: !!id,
    queryFn: () => thoughtMapApi.getThoughtMap(id),
    queryKey: thoughtMapKeys.detail(id),
  });
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all Thought Maps for the authenticated user
 *
 * @returns Query result with thought maps array
 *
 * @example
 * ```typescript
 * const { data: maps, isLoading, error } = useThoughtMaps();
 *
 * if (isLoading) return <Loading />;
 * return maps.map(map => <MapCard map={map} />);
 * ```
 */
export function useThoughtMaps() {
  return useQuery<ThoughtMap[], Error>({
    queryFn: () => thoughtMapApi.getThoughtMaps(),
    queryKey: thoughtMapKeys.lists(),
  });
}

/**
 * Update an existing Thought Map node with optimistic update
 *
 * @param mapId - Thought map ID containing the node
 * @returns Mutation result with update function
 *
 * @example
 * ```typescript
 * const { mutate: updateNode, isPending } = useUpdateThoughtNode('map-id');
 *
 * updateNode({ mapId: 'map-id', nodeId: 'branch-0', dto: { isExplored: true } });
 * ```
 */
export function useUpdateThoughtNode(mapId: string) {
  const queryClient = useQueryClient();

  return useMutation<ThoughtMapNode, Error, UpdateThoughtNodeVariables, UpdateThoughtNodeContext>({
    mutationFn: ({ dto, nodeId }: UpdateThoughtNodeVariables) =>
      thoughtMapApi.updateThoughtNode(mapId, nodeId, dto),

    onError: (_err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(thoughtMapKeys.detail(mapId), context.previousData);
      }
    },

    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: thoughtMapKeys.detail(mapId) });

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueryData<ThoughtMapWithNodes>(
        thoughtMapKeys.detail(mapId)
      );

      // Optimistically update the node in cache
      if (previousData) {
        const updatedNodes = previousData.nodes.map((node) =>
          node.nodeId === variables.nodeId
            ? {
                ...node,
                ...(variables.dto.isExplored !== undefined && {
                  isExplored: variables.dto.isExplored,
                }),
                ...(variables.dto.label !== undefined && { label: variables.dto.label }),
                ...(variables.dto.x !== undefined &&
                  variables.dto.y !== undefined && {
                    position: { x: variables.dto.x, y: variables.dto.y },
                  }),
                updatedAt: new Date().toISOString(),
              }
            : node
        );

        queryClient.setQueryData<ThoughtMapWithNodes>(thoughtMapKeys.detail(mapId), {
          ...previousData,
          nodes: updatedNodes,
        });
      }

      return { previousData };
    },

    onSuccess: (data, variables) => {
      // Update cache with server response for consistency
      const currentData = queryClient.getQueryData<ThoughtMapWithNodes>(
        thoughtMapKeys.detail(mapId)
      );
      if (currentData) {
        queryClient.setQueryData<ThoughtMapWithNodes>(thoughtMapKeys.detail(mapId), {
          ...currentData,
          nodes: currentData.nodes.map((node) => (node.nodeId === variables.nodeId ? data : node)),
        });
      }
    },
  });
}

function buildOptimisticThoughtMapNode(
  mapId: string,
  nodes: ThoughtMapNode[],
  dto: CreateThoughtNodeRequest
): ThoughtMapNode {
  const now = new Date().toISOString();
  const parentNode = nodes.find((node) => node.nodeId === dto.parentNodeId);
  const depth = parentNode ? parentNode.depth + 1 : 1;

  return {
    createdAt: now,
    depth,
    fromSuggestion: false,
    id: `temp-${Date.now()}`,
    isCollapsed: false,
    isExplored: false,
    label: dto.label,
    mapId,
    messageCount: 0,
    nodeId: `node-temp-${Date.now()}`,
    parentNodeId: dto.parentNodeId,
    position: { x: dto.x ?? 0, y: dto.y ?? 0 },
    type: getThoughtMapNodeType(depth),
    updatedAt: now,
  };
}
