/**
 * Canvas API client
 * Provides functions for canvas session-related API calls
 *
 * Features:
 * - Create canvas sessions with problem structure
 * - Get individual canvas sessions
 * - Update canvas sessions (node positions, explored nodes)
 * - Insight node management (create, get, delete)
 * - Dynamic node management (assumptions, context)
 * - Relationship edge management
 * - Response transformation from backend format to frontend types
 */

import type {
  AddAssumptionDto,
  AddContextDto,
  CanvasSession,
  CreateCanvasSessionDto,
  CreateInsightNodeDto,
  CreateRelationshipDto,
  InsightNode,
  NodePosition,
  RelationshipEdge,
} from '@/types/canvas.types';

import { apiClient } from './client';

/**
 * DTO for updating a canvas session
 * @property exploredNodes - Array of node IDs that have been explored through dialogue
 * @property nodePositions - Custom node positions set by user drag operations
 */
export interface UpdateCanvasSessionDto {
  exploredNodes?: string[];
  nodePositions?: NodePosition[];
}

/**
 * DTO for updating an insight node
 * @property label - The text label of the insight
 * @property isExplored - Whether the insight has been explored
 * @property x - The x-coordinate of the insight node
 * @property y - The y-coordinate of the insight node
 */
export interface UpdateInsightNodeDto {
  isExplored?: boolean;
  label?: string;
  x?: number;
  y?: number;
}

/**
 * Backend canvas session response format (with _id instead of id)
 */
interface BackendCanvasSession {
  _id: string;
  createdAt: string;
  dynamicNodeIds?: string[];
  exploredNodes?: string[];
  nodePositions?: NodePosition[];
  problemStructure: {
    roots: string[];
    seed: string;
    soil: string[];
  };
  relationshipEdges?: RelationshipEdge[];
  updatedAt: string;
  userId: string;
}

/**
 * Backend insight node response format (with _id instead of id)
 */
interface BackendInsightNode {
  _id: string;
  createdAt: string;
  isExplored: boolean;
  label: string;
  nodeId: string;
  parentNodeId: string;
  position: { x: number; y: number };
  sessionId: string;
  updatedAt: string;
}

/**
 * Transform backend canvas session to frontend format
 * Handles _id to id conversion
 */
function transformCanvasSession(backend: BackendCanvasSession): CanvasSession {
  return {
    createdAt: backend.createdAt,
    dynamicNodeIds: backend.dynamicNodeIds,
    exploredNodes: backend.exploredNodes,
    id: backend._id,
    nodePositions: backend.nodePositions,
    problemStructure: {
      roots: backend.problemStructure.roots || [],
      seed: backend.problemStructure.seed,
      soil: backend.problemStructure.soil || [],
    },
    relationshipEdges: backend.relationshipEdges,
    updatedAt: backend.updatedAt,
    userId: backend.userId,
  };
}

/**
 * Transform backend insight node to frontend format
 * Handles _id to id conversion
 */
function transformInsightNode(backend: BackendInsightNode): InsightNode {
  return {
    createdAt: backend.createdAt,
    id: backend._id,
    isExplored: backend.isExplored,
    label: backend.label,
    nodeId: backend.nodeId,
    parentNodeId: backend.parentNodeId,
    position: backend.position,
    sessionId: backend.sessionId,
    updatedAt: backend.updatedAt,
  };
}

/**
 * Canvas API endpoints
 */
export const canvasApi = {
  /**
   * Add a new assumption (Root node) to a canvas session
   *
   * @param sessionId - Canvas session ID
   * @param dto - Assumption data
   * @returns The updated canvas session
   * @throws {ApiClientError} If limit reached or creation fails
   *
   * @example
   * ```typescript
   * const session = await canvasApi.addAssumption('507f1f77bcf86cd799439011', {
   *   assumption: 'We assume the team needs better tools',
   * });
   * ```
   */
  addAssumption: async (sessionId: string, dto: AddAssumptionDto): Promise<CanvasSession> => {
    const response = await apiClient.post<BackendCanvasSession>(
      `/canvas/sessions/${sessionId}/assumptions`,
      dto
    );
    return transformCanvasSession(response);
  },

  /**
   * Add a new context item (Soil node) to a canvas session
   *
   * @param sessionId - Canvas session ID
   * @param dto - Context data
   * @returns The updated canvas session
   * @throws {ApiClientError} If limit reached or creation fails
   *
   * @example
   * ```typescript
   * const session = await canvasApi.addContext('507f1f77bcf86cd799439011', {
   *   context: 'Limited budget for new hires',
   * });
   * ```
   */
  addContext: async (sessionId: string, dto: AddContextDto): Promise<CanvasSession> => {
    const response = await apiClient.post<BackendCanvasSession>(
      `/canvas/sessions/${sessionId}/context`,
      dto
    );
    return transformCanvasSession(response);
  },

  /**
   * Create a new insight node in a canvas session
   *
   * @param sessionId - Canvas session ID
   * @param dto - Insight node creation data
   * @returns The newly created insight node
   * @throws {ApiClientError} If creation fails or parent node doesn't exist
   *
   * @example
   * ```typescript
   * const insight = await canvasApi.createInsight('507f1f77bcf86cd799439011', {
   *   label: 'The real issue might be communication',
   *   parentNodeId: 'root-0',
   *   x: 150,
   *   y: 200,
   * });
   * ```
   */
  createInsight: async (sessionId: string, dto: CreateInsightNodeDto): Promise<InsightNode> => {
    const response = await apiClient.post<BackendInsightNode>(
      `/canvas/sessions/${sessionId}/insights`,
      dto
    );
    return transformInsightNode(response);
  },

  /**
   * Create a relationship edge between an assumption and a constraint
   *
   * @param sessionId - Canvas session ID
   * @param dto - Relationship data (sourceNodeId, targetNodeId)
   * @returns The updated canvas session with new relationship
   * @throws {ApiClientError} If creation fails
   *
   * @example
   * ```typescript
   * const session = await canvasApi.createRelationship('507f1f77bcf86cd799439011', {
   *   sourceNodeId: 'root-0',
   *   targetNodeId: 'soil-1',
   * });
   * ```
   */
  createRelationship: async (
    sessionId: string,
    dto: CreateRelationshipDto
  ): Promise<CanvasSession> => {
    const response = await apiClient.post<BackendCanvasSession>(
      `/canvas/sessions/${sessionId}/relationships`,
      dto
    );
    return transformCanvasSession(response);
  },

  /**
   * Create new canvas session with problem structure
   *
   * @param dto - Canvas session creation data (seed, soil, roots)
   * @returns The newly created canvas session
   * @throws {ApiClientError} If creation fails
   *
   * @example
   * ```typescript
   * const session = await canvasApi.createSession({
   *   seed: 'My team is burned out',
   *   soil: ['Budget is tight', 'Deadline in 2 weeks'],
   *   roots: ['We need to hire more people'],
   * });
   * ```
   */
  createSession: async (dto: CreateCanvasSessionDto): Promise<CanvasSession> => {
    const response = await apiClient.post<BackendCanvasSession>('/canvas/sessions', dto);
    return transformCanvasSession(response);
  },

  /**
   * Delete a dynamically-added assumption from a canvas session
   *
   * @param sessionId - Canvas session ID
   * @param index - The index of the assumption to delete
   * @returns The updated canvas session
   * @throws {ApiClientError} If deletion fails or node is protected
   *
   * @example
   * ```typescript
   * const session = await canvasApi.deleteAssumption('507f1f77bcf86cd799439011', 3);
   * ```
   */
  deleteAssumption: async (sessionId: string, index: number): Promise<CanvasSession> => {
    const response = await apiClient.delete<BackendCanvasSession>(
      `/canvas/sessions/${sessionId}/assumptions/${index}`
    );
    return transformCanvasSession(response);
  },

  /**
   * Delete a dynamically-added context item from a canvas session
   *
   * @param sessionId - Canvas session ID
   * @param index - The index of the context item to delete
   * @returns The updated canvas session
   * @throws {ApiClientError} If deletion fails or node is protected
   *
   * @example
   * ```typescript
   * const session = await canvasApi.deleteContext('507f1f77bcf86cd799439011', 2);
   * ```
   */
  deleteContext: async (sessionId: string, index: number): Promise<CanvasSession> => {
    const response = await apiClient.delete<BackendCanvasSession>(
      `/canvas/sessions/${sessionId}/context/${index}`
    );
    return transformCanvasSession(response);
  },

  /**
   * Delete an insight node from a canvas session
   *
   * @param sessionId - Canvas session ID
   * @param nodeId - The insight node ID to delete
   * @throws {ApiClientError} If deletion fails
   *
   * @example
   * ```typescript
   * await canvasApi.deleteInsight('507f1f77bcf86cd799439011', 'insight-0');
   * ```
   */
  deleteInsight: async (sessionId: string, nodeId: string): Promise<void> => {
    await apiClient.delete(`/canvas/sessions/${sessionId}/insights/${nodeId}`);
  },

  /**
   * Delete a node from a canvas session with optional cascade
   *
   * @param sessionId - Canvas session ID
   * @param nodeId - The node ID to delete
   * @param deleteDependents - Whether to cascade delete child insights
   * @returns The updated canvas session
   * @throws {ApiClientError} If deletion fails or node is protected
   *
   * @example
   * ```typescript
   * // Delete node and its dependent insights
   * const session = await canvasApi.deleteNode(
   *   '507f1f77bcf86cd799439011',
   *   'root-3',
   *   true
   * );
   * ```
   */
  deleteNode: async (
    sessionId: string,
    nodeId: string,
    deleteDependents = false
  ): Promise<CanvasSession> => {
    const queryParam = deleteDependents ? '?deleteDependents=true' : '';
    const response = await apiClient.delete<BackendCanvasSession>(
      `/canvas/sessions/${sessionId}/nodes/${nodeId}${queryParam}`
    );
    return transformCanvasSession(response);
  },

  /**
   * Delete a relationship edge from a canvas session
   *
   * @param sessionId - Canvas session ID
   * @param relationshipId - The relationship ID to delete
   * @returns The updated canvas session
   * @throws {ApiClientError} If deletion fails
   *
   * @example
   * ```typescript
   * const session = await canvasApi.deleteRelationship(
   *   '507f1f77bcf86cd799439011',
   *   'rel-root-0-soil-1'
   * );
   * ```
   */
  deleteRelationship: async (sessionId: string, relationshipId: string): Promise<CanvasSession> => {
    const response = await apiClient.delete<BackendCanvasSession>(
      `/canvas/sessions/${sessionId}/relationships/${relationshipId}`
    );
    return transformCanvasSession(response);
  },

  /**
   * Get all insight nodes for a canvas session
   *
   * @param sessionId - Canvas session ID
   * @returns Array of insight nodes
   * @throws {ApiClientError} If fetch fails
   *
   * @example
   * ```typescript
   * const insights = await canvasApi.getInsights('507f1f77bcf86cd799439011');
   * ```
   */
  getInsights: async (sessionId: string): Promise<InsightNode[]> => {
    const response = await apiClient.get<BackendInsightNode[]>(
      `/canvas/sessions/${sessionId}/insights`
    );
    return response.map(transformInsightNode);
  },

  /**
   * Get a specific canvas session by ID
   *
   * @param id - Canvas session ID
   * @returns The canvas session
   * @throws {ApiClientError} If session not found or unauthorized
   *
   * @example
   * ```typescript
   * const session = await canvasApi.getSession('507f1f77bcf86cd799439011');
   * ```
   */
  getSession: async (id: string): Promise<CanvasSession> => {
    const response = await apiClient.get<BackendCanvasSession>(`/canvas/sessions/${id}`);
    return transformCanvasSession(response);
  },

  /**
   * Get all canvas sessions for the authenticated user
   *
   * @returns Array of canvas sessions
   * @throws {ApiClientError} If fetch fails
   *
   * @example
   * ```typescript
   * const sessions = await canvasApi.getSessions();
   * ```
   */
  getSessions: async (): Promise<CanvasSession[]> => {
    const response = await apiClient.get<BackendCanvasSession[]>('/canvas/sessions');
    return response.map(transformCanvasSession);
  },

  /**
   * Update an insight node (label, position, isExplored)
   *
   * @param sessionId - Canvas session ID
   * @param nodeId - Insight node ID
   * @param dto - Update data
   * @returns The updated insight node
   * @throws {ApiClientError} If update fails
   *
   * @example
   * ```typescript
   * const insight = await canvasApi.updateInsight('session-id', 'insight-0', {
   *   x: 100,
   *   y: 200,
   * });
   * ```
   */
  updateInsight: async (
    sessionId: string,
    nodeId: string,
    dto: UpdateInsightNodeDto
  ): Promise<InsightNode> => {
    const response = await apiClient.patch<BackendInsightNode>(
      `/canvas/sessions/${sessionId}/insights/${nodeId}`,
      dto
    );
    return transformInsightNode(response);
  },

  /**
   * Update a canvas session (node positions, explored nodes)
   *
   * @param id - Canvas session ID
   * @param dto - Update data (nodePositions, exploredNodes)
   * @returns The updated canvas session
   * @throws {ApiClientError} If session not found or unauthorized
   *
   * @example
   * ```typescript
   * const session = await canvasApi.updateSession('507f1f77bcf86cd799439011', {
   *   nodePositions: [
   *     { nodeId: 'seed', x: 0, y: 0 },
   *     { nodeId: 'soil-0', x: -200, y: -100 },
   *   ],
   *   exploredNodes: ['seed', 'root-0'],
   * });
   * ```
   */
  updateSession: async (id: string, dto: UpdateCanvasSessionDto): Promise<CanvasSession> => {
    const response = await apiClient.patch<BackendCanvasSession>(`/canvas/sessions/${id}`, dto);
    return transformCanvasSession(response);
  },
};
