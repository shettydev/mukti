/**
 * Thought Map API client
 * Provides functions for thought-map-related API calls
 *
 * Features:
 * - Create thought maps with a central topic
 * - List and fetch individual thought maps
 * - Create, update, and delete thought nodes
 * - Response transformation from backend format to frontend types (_id → id)
 */

import type {
  CreateThoughtMapRequest,
  CreateThoughtNodeRequest,
  ThoughtMap,
  ThoughtMapNode,
  ThoughtMapWithNodes,
  UpdateThoughtNodeRequest,
} from '@/types/thought-map';

import { apiClient } from './client';

// ============================================================================
// Backend response types
// ============================================================================

/**
 * Backend Thought Map response format (with _id instead of id)
 */
interface BackendThoughtMap {
  _id: string;
  createdAt: string;
  nodeCount?: number;
  rootNodeId?: string;
  settings: {
    autoSuggestEnabled?: boolean;
    autoSuggestIdleSeconds?: number;
    maxSuggestionsPerNode?: number;
  };
  status: 'active' | 'archived' | 'draft';
  title: string;
  updatedAt: string;
  userId: string;
}

/**
 * Backend Thought Map node response format (with _id instead of id)
 */
interface BackendThoughtMapNode {
  _id: string;
  createdAt: string;
  depth: number;
  isExplored: boolean;
  label: string;
  mapId: string;
  nodeId: string;
  parentId?: null | string;
  position: { x: number; y: number };
  type: 'insight' | 'question' | 'thought' | 'topic';
  updatedAt: string;
}

interface BackendCreateThoughtMapResponse {
  map: BackendThoughtMap;
  rootNode: BackendThoughtMapNode;
}

/**
 * Backend response for a Thought Map with nodes
 */
interface BackendThoughtMapWithNodes {
  map: BackendThoughtMap;
  nodes: BackendThoughtMapNode[];
}

// ============================================================================
// Transform helpers
// ============================================================================

/**
 * Transform backend thought map to frontend format
 * Handles _id to id conversion
 */
function transformThoughtMap(backend: BackendThoughtMap): ThoughtMap {
  return {
    createdAt: backend.createdAt,
    id: backend._id,
    nodeCount: backend.nodeCount ?? 0,
    settings: {
      // Phase 1 backend does not expose these UI settings yet.
      autoOpenDialogue: false,
      layoutDirection: 'horizontal',
      wrapLabels: true,
    },
    status: backend.status === 'draft' ? 'active' : backend.status,
    title: backend.title,
    updatedAt: backend.updatedAt,
    userId: backend.userId,
  };
}

/**
 * Transform backend thought map node to frontend format
 * Handles _id to id conversion
 */
function transformThoughtMapNode(backend: BackendThoughtMapNode): ThoughtMapNode {
  return {
    createdAt: backend.createdAt,
    depth: backend.depth,
    id: backend._id,
    isExplored: backend.isExplored,
    label: backend.label,
    mapId: backend.mapId,
    nodeId: backend.nodeId,
    parentNodeId: backend.parentId ?? null,
    position: backend.position,
    type: normalizeThoughtMapNodeType(backend),
    updatedAt: backend.updatedAt,
  };
}

function normalizeThoughtMapNodeType(backend: BackendThoughtMapNode): ThoughtMapNode['type'] {
  if (backend.type === 'topic' || backend.depth === 0) {
    return 'topic';
  }

  return backend.depth === 1 ? 'branch' : 'leaf';
}

// ============================================================================
// API functions
// ============================================================================

/**
 * Thought Map API endpoints
 */
export const thoughtMapApi = {
  /**
   * Create a new Thought Map with a central topic node
   *
   * @param dto - Map creation data (topic, optional settings)
   * @returns The newly created thought map
   * @throws {ApiClientError} If creation fails
   *
   * @example
   * ```typescript
   * const map = await thoughtMapApi.createThoughtMap({
   *   topic: 'How can I improve my focus?',
   * });
   * ```
   */
  createThoughtMap: async (dto: CreateThoughtMapRequest): Promise<ThoughtMap> => {
    const response = await apiClient.post<BackendCreateThoughtMapResponse>('/thought-maps', {
      title: dto.topic,
    });

    return transformThoughtMap(response.map);
  },

  /**
   * Create a new node in an existing Thought Map
   *
   * @param dto - Node creation data (mapId, label, parentNodeId, optional position)
   * @returns The newly created thought map node
   * @throws {ApiClientError} If creation fails or parent node doesn't exist
   *
   * @example
   * ```typescript
   * const node = await thoughtMapApi.createThoughtNode({
   *   mapId: '507f1f77bcf86cd799439011',
   *   label: 'Eliminate distractions',
   *   parentNodeId: 'branch-0',
   * });
   * ```
   */
  createThoughtNode: async (dto: CreateThoughtNodeRequest): Promise<ThoughtMapNode> => {
    const { mapId, parentNodeId, ...body } = dto;
    const response = await apiClient.post<BackendThoughtMapNode>(`/thought-maps/${mapId}/nodes`, {
      ...body,
      parentId: parentNodeId,
    });
    return transformThoughtMapNode(response);
  },

  /**
   * Delete a node from a Thought Map
   *
   * @param mapId - Thought map ID
   * @param nodeId - Node identifier to delete
   * @throws {ApiClientError} If deletion fails
   *
   * @example
   * ```typescript
   * await thoughtMapApi.deleteThoughtNode('507f1f77bcf86cd799439011', 'branch-0');
   * ```
   */
  deleteThoughtNode: async (mapId: string, nodeId: string): Promise<void> => {
    await apiClient.delete(`/thought-maps/${mapId}/nodes/${nodeId}`);
  },

  /**
   * Get a specific Thought Map by ID, including all its nodes
   *
   * @param id - Thought map ID
   * @returns The thought map with all its nodes
   * @throws {ApiClientError} If map not found or unauthorized
   *
   * @example
   * ```typescript
   * const { map, nodes } = await thoughtMapApi.getThoughtMap('507f1f77bcf86cd799439011');
   * ```
   */
  getThoughtMap: async (id: string): Promise<ThoughtMapWithNodes> => {
    const response = await apiClient.get<BackendThoughtMapWithNodes>(`/thought-maps/${id}`);

    return {
      map: {
        ...transformThoughtMap(response.map),
        nodeCount: response.nodes.length,
      },
      nodes: response.nodes.map(transformThoughtMapNode),
    };
  },

  /**
   * Get all Thought Maps for the authenticated user
   *
   * @returns Array of thought maps (without nodes)
   * @throws {ApiClientError} If fetch fails
   *
   * @example
   * ```typescript
   * const maps = await thoughtMapApi.getThoughtMaps();
   * ```
   */
  getThoughtMaps: async (): Promise<ThoughtMap[]> => {
    const response = await apiClient.get<BackendThoughtMap[]>('/thought-maps');
    return response.map(transformThoughtMap);
  },

  /**
   * Update an existing Thought Map node
   *
   * @param mapId - Thought map ID
   * @param nodeId - Node identifier to update
   * @param dto - Update data (label, isExplored, position)
   * @returns The updated thought map node
   * @throws {ApiClientError} If update fails
   *
   * @example
   * ```typescript
   * const node = await thoughtMapApi.updateThoughtNode('map-id', 'branch-0', {
   *   isExplored: true,
   * });
   * ```
   */
  updateThoughtNode: async (
    mapId: string,
    nodeId: string,
    dto: UpdateThoughtNodeRequest
  ): Promise<ThoughtMapNode> => {
    const body = {
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.x !== undefined || dto.y !== undefined
        ? {
            position: {
              ...(dto.x !== undefined && { x: dto.x }),
              ...(dto.y !== undefined && { y: dto.y }),
            },
          }
        : {}),
    };

    const response = await apiClient.patch<BackendThoughtMapNode>(
      `/thought-maps/${mapId}/nodes/${nodeId}`,
      body
    );
    return transformThoughtMapNode(response);
  },
};
