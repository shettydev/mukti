/**
 * Thought Map API client
 * Provides functions for thought-map-related API calls
 *
 * Features:
 * - Create thought maps with a central topic
 * - List and fetch individual thought maps
 * - Create, update, and delete thought nodes
 * - Request AI branch suggestions
 * - Stream suggestions via SSE
 * - Response transformation from backend format to frontend types (_id → id)
 */

import { config } from '@/lib/config';
import {
  type ConvertCanvasRequest,
  type CreateThoughtMapRequest,
  type CreateThoughtNodeRequest,
  type ExtractConversationRequest,
  type ExtractionJobResponse,
  type ExtractionStreamEvent,
  getThoughtMapNodeType,
  type ThoughtMap,
  type ThoughtMapNode,
  type ThoughtMapShareLink,
  type ThoughtMapWithNodes,
  type UpdateThoughtMapSettingsRequest,
  type UpdateThoughtNodeRequest,
} from '@/types/thought-map';

import { apiClient } from './client';

// ============================================================================
// Backend response types
// ============================================================================

/**
 * A single AI-generated branch suggestion delivered via SSE.
 */
export interface BranchSuggestionEvent {
  data:
    | { code: string; message: string; retriable: boolean }
    | { jobId: string; status: string }
    | { jobId: string; suggestionCount: number }
    | { label: string; parentId: string; suggestedType: 'question' | 'thought' };
  type: 'complete' | 'error' | 'processing' | 'suggestion';
}

/**
 * Request body for POST /thought-maps/:id/suggest
 */
export interface RequestSuggestionsDto {
  model?: string;
  parentNodeId: string;
}

/**
 * Response from POST /thought-maps/:id/suggest
 */
export interface SuggestionJobResponse {
  jobId: string;
  position: number;
}

export interface SuggestionJobStatusResponse {
  result?: {
    count: number;
    mapId: string;
    parentNodeId: string;
    suggestions: { label: string; parentId: string; suggestedType: 'question' | 'thought' }[];
  };
  state: string;
}

interface BackendCreateThoughtMapResponse {
  map: BackendThoughtMap;
  rootNode: BackendThoughtMapNode;
}

// ============================================================================
// Suggestion types
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
  sourceCanvasSessionId?: string;
  sourceConversationId?: string;
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
  fromSuggestion?: boolean;
  isCollapsed?: boolean;
  isExplored: boolean;
  label: string;
  mapId: string;
  messageCount?: number;
  nodeId: string;
  parentId?: null | string;
  position: { x: number; y: number };
  sourceMessageIndices?: number[];
  type: 'insight' | 'question' | 'thought' | 'topic';
  updatedAt: string;
}

/**
 * Backend response for a Thought Map share link
 */
interface BackendThoughtMapShareLink {
  _id: string;
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
  isActive: boolean;
  thoughtMapId: string;
  token: string;
  viewCount: number;
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
 * Transform backend share link to frontend format
 */
function transformShareLink(backend: BackendThoughtMapShareLink): ThoughtMapShareLink {
  return {
    createdAt: backend.createdAt,
    createdBy: backend.createdBy,
    expiresAt: backend.expiresAt,
    id: backend._id,
    isActive: backend.isActive,
    thoughtMapId: backend.thoughtMapId,
    token: backend.token,
    viewCount: backend.viewCount,
  };
}

/**
 * Transform backend thought map to frontend format
 * Handles _id to id conversion
 */
function transformThoughtMap(backend: BackendThoughtMap): ThoughtMap {
  return {
    createdAt: backend.createdAt,
    id: backend._id,
    nodeCount: backend.nodeCount ?? 0,
    rootNodeId: backend.rootNodeId ?? 'topic-0',
    settings: {
      autoSuggestEnabled: backend.settings.autoSuggestEnabled ?? true,
      autoSuggestIdleSeconds: backend.settings.autoSuggestIdleSeconds ?? 10,
      maxSuggestionsPerNode: backend.settings.maxSuggestionsPerNode ?? 4,
    },
    sourceCanvasSessionId: backend.sourceCanvasSessionId,
    sourceConversationId: backend.sourceConversationId,
    status: backend.status,
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
    fromSuggestion: backend.fromSuggestion ?? false,
    id: backend._id,
    isCollapsed: backend.isCollapsed ?? false,
    isExplored: backend.isExplored,
    label: backend.label,
    mapId: backend.mapId,
    messageCount: backend.messageCount ?? 0,
    nodeId: backend.nodeId,
    parentNodeId: backend.parentId ?? null,
    position: backend.position,
    sourceMessageIndices: backend.sourceMessageIndices,
    type: backend.type ?? getThoughtMapNodeType(backend.depth),
    updatedAt: backend.updatedAt,
  };
}

// ============================================================================
// API functions
// ============================================================================

/**
 * Thought Map API endpoints
 */
export const thoughtMapApi = {
  /**
   * Confirm a draft Thought Map, transitioning it from "draft" to "active".
   *
   * @param mapId - Thought map ID (must be status "draft")
   * @returns The confirmed ThoughtMap
   */
  confirmMap: async (mapId: string): Promise<ThoughtMap> => {
    const response = await apiClient.patch<BackendThoughtMap>(`/thought-maps/${mapId}/confirm`, {});
    return transformThoughtMap(response);
  },

  /**
   * Convert an existing CanvasSession into a new Thought Map.
   * Seed → root topic node (depth 0); roots[] + soil[] → thought nodes (depth 1).
   *
   * @param sessionId - The CanvasSession ID to convert
   * @param dto - Optional title override
   * @returns The newly created ThoughtMap with all nodes
   */
  convertFromCanvas: async (
    sessionId: string,
    dto?: ConvertCanvasRequest
  ): Promise<ThoughtMapWithNodes> => {
    const response = await apiClient.post<BackendThoughtMapWithNodes>(
      `/thought-maps/convert-from-canvas/${sessionId}`,
      dto ?? {}
    );
    return {
      map: {
        ...transformThoughtMap(response.map),
        nodeCount: response.nodes.length,
      },
      nodes: response.nodes.map(transformThoughtMapNode),
    };
  },

  /**
   * Create (or replace) a public share link for a Thought Map.
   *
   * @param mapId - Thought Map ID
   * @param dto - Optional expiry settings
   * @returns The newly created share link
   */
  createShareLink: async (
    mapId: string,
    dto?: { expiresInDays?: number }
  ): Promise<ThoughtMapShareLink> => {
    const response = await apiClient.post<BackendThoughtMapShareLink>(
      `/thought-maps/${mapId}/share`,
      dto ?? {}
    );
    return transformShareLink(response);
  },

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
   *   title: 'How can I improve my focus?',
   * });
   * ```
   */
  createThoughtMap: async (dto: CreateThoughtMapRequest): Promise<ThoughtMap> => {
    const response = await apiClient.post<BackendCreateThoughtMapResponse>('/thought-maps', {
      title: dto.title,
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
   * Delete an entire Thought Map and all associated data (nodes, share links)
   *
   * @param mapId - Thought map ID to delete
   * @throws {ApiClientError} If deletion fails or user doesn't own the map
   *
   * @example
   * ```typescript
   * await thoughtMapApi.deleteThoughtMap('507f1f77bcf86cd799439011');
   * ```
   */
  deleteThoughtMap: async (mapId: string): Promise<void> => {
    await apiClient.delete(`/thought-maps/${mapId}`);
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
   * Enqueue a conversation → Thought Map extraction job.
   * Returns 202 Accepted with jobId + queue position.
   * Subscribe to streamExtraction() to receive the draft map.
   *
   * @param dto - conversationId + optional model override
   * @returns jobId and queue position
   */
  extractConversation: async (dto: ExtractConversationRequest): Promise<ExtractionJobResponse> => {
    const response = await apiClient.post<ExtractionJobResponse>('/thought-maps/extract', dto);
    return response;
  },

  /**
   * Fetch a publicly shared Thought Map by its share token.
   * No authentication required.
   *
   * @param token - URL-safe share token
   * @returns The shared ThoughtMap with all nodes
   */
  getSharedMap: async (token: string): Promise<ThoughtMapWithNodes> => {
    const response = await apiClient.get<BackendThoughtMapWithNodes>(
      `/thought-maps/share/${token}`
    );
    return {
      map: {
        ...transformThoughtMap(response.map),
        nodeCount: response.nodes.length,
      },
      nodes: response.nodes.map(transformThoughtMapNode),
    };
  },

  /**
   * Get the active share link for a Thought Map.
   *
   * @param mapId - Thought Map ID
   * @returns The active share link, or null if none exists
   */
  getShareLink: async (mapId: string): Promise<null | ThoughtMapShareLink> => {
    const response = await apiClient.get<BackendThoughtMapShareLink | null>(
      `/thought-maps/${mapId}/share`
    );
    return response ? transformShareLink(response) : null;
  },

  getSuggestionJobStatus: async (
    mapId: string,
    jobId: string
  ): Promise<SuggestionJobStatusResponse> => {
    return apiClient.get<SuggestionJobStatusResponse>(
      `/thought-maps/${mapId}/suggest/jobs/${jobId}`
    );
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
   * Request AI branch suggestions for a Thought Map node.
   * Returns 202 Accepted with a jobId. Subscribe to the SSE stream for results.
   *
   * @param mapId - Thought map ID
   * @param dto - parentNodeId + optional model override
   * @returns jobId and queue position
   *
   * @example
   * ```typescript
   * const { jobId } = await thoughtMapApi.requestSuggestions('map-id', { parentNodeId: 'topic-0' });
   * ```
   */
  requestSuggestions: async (
    mapId: string,
    dto: RequestSuggestionsDto
  ): Promise<SuggestionJobResponse> => {
    const response = await apiClient.post<SuggestionJobResponse>(
      `/thought-maps/${mapId}/suggest`,
      dto
    );
    return response;
  },

  /**
   * Revoke the active share link for a Thought Map.
   *
   * @param mapId - Thought Map ID
   */
  revokeShareLink: async (mapId: string): Promise<void> => {
    await apiClient.delete(`/thought-maps/${mapId}/share`);
  },

  /**
   * Subscribe to the SSE stream for a map extraction job.
   * Returns a cleanup function that closes the EventSource.
   *
   * Events: processing → preview (full draft map + nodes) → complete | error
   *
   * @param jobId - BullMQ job ID returned by extractConversation()
   * @param accessToken - JWT access token (query param — EventSource has no header support)
   * @param onEvent - Callback for each extraction event
   * @param onError - Callback on connection error
   * @param onOpen - Callback when connection opens
   */
  streamExtraction: (
    jobId: string,
    accessToken: string,
    onEvent: (event: ExtractionStreamEvent) => void,
    onError?: (error: Error) => void,
    onOpen?: () => void
  ): (() => void) => {
    const url = new URL(`${config.api.baseUrl}/thought-maps/extract/${jobId}/stream`);
    url.searchParams.set('token', accessToken);

    const eventSource = new EventSource(url.toString(), { withCredentials: true });

    eventSource.onopen = () => {
      onOpen?.();
    };

    eventSource.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data) as ExtractionStreamEvent;

        // Transform backend node shapes (parentId → parentNodeId, _id → id) in preview events
        if (raw.type === 'preview') {
          const preview = raw.data as unknown as {
            map: BackendThoughtMap;
            nodes: BackendThoughtMapNode[];
          };
          const transformed: ExtractionStreamEvent = {
            data: {
              map: transformThoughtMap(preview.map),
              nodes: preview.nodes.map(transformThoughtMapNode),
            },
            type: 'preview',
          };
          onEvent(transformed);
        } else {
          onEvent(raw);
        }
      } catch {
        onError?.(new Error('Failed to parse extraction SSE event'));
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      onError?.(new Error('Extraction SSE connection error'));
    };

    return () => {
      eventSource.close();
    };
  },

  /**
   * Subscribe to the SSE stream for branch suggestions on a Thought Map node.
   * Returns a cleanup function that closes the EventSource.
   *
   * @param mapId - Thought map ID
   * @param jobId - Suggestion job ID returned by requestSuggestions()
   * @param accessToken - JWT access token (query param — EventSource has no header support)
   * @param onEvent - Callback for each suggestion event
   * @param onError - Callback on connection error
   * @param onOpen - Callback when connection opens
   */
  streamSuggestions: (
    mapId: string,
    jobId: string,
    accessToken: string,
    onEvent: (event: BranchSuggestionEvent) => void,
    onError?: (error: Error) => void,
    onOpen?: () => void
  ): (() => void) => {
    const url = new URL(`${config.api.baseUrl}/thought-maps/${mapId}/suggest/stream`);
    url.searchParams.set('jobId', jobId);
    url.searchParams.set('token', accessToken);

    const eventSource = new EventSource(url.toString(), { withCredentials: true });

    eventSource.onopen = () => {
      onOpen?.();
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as BranchSuggestionEvent;
        onEvent(data);
      } catch {
        onError?.(new Error('Failed to parse suggestion SSE event'));
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      onError?.(new Error('Suggestion SSE connection error'));
    };

    return () => {
      eventSource.close();
    };
  },

  /**
   * Update the auto-suggestion settings on a Thought Map.
   *
   * @param mapId - Thought Map ID
   * @param dto - Partial settings (all fields optional)
   * @returns The updated ThoughtMap
   */
  updateSettings: async (
    mapId: string,
    dto: UpdateThoughtMapSettingsRequest
  ): Promise<ThoughtMap> => {
    const response = await apiClient.patch<BackendThoughtMap>(
      `/thought-maps/${mapId}/settings`,
      dto
    );
    return transformThoughtMap(response);
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
