/**
 * Canvas API client
 * Provides functions for canvas session-related API calls
 *
 * Features:
 * - Create canvas sessions with problem structure
 * - Get individual canvas sessions
 * - Update canvas sessions (node positions, explored nodes)
 * - Response transformation from backend format to frontend types
 */

import type { CanvasSession, CreateCanvasSessionDto, NodePosition } from '@/types/canvas.types';

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
 * Backend canvas session response format (with _id instead of id)
 */
interface BackendCanvasSession {
  _id: string;
  createdAt: string;
  exploredNodes?: string[];
  nodePositions?: NodePosition[];
  problemStructure: {
    roots: string[];
    seed: string;
    soil: string[];
  };
  updatedAt: string;
  userId: string;
}

/**
 * Transform backend canvas session to frontend format
 * Handles _id to id conversion
 */
function transformCanvasSession(backend: BackendCanvasSession): CanvasSession {
  return {
    createdAt: backend.createdAt,
    exploredNodes: backend.exploredNodes,
    id: backend._id,
    nodePositions: backend.nodePositions,
    problemStructure: {
      roots: backend.problemStructure.roots || [],
      seed: backend.problemStructure.seed,
      soil: backend.problemStructure.soil || [],
    },
    updatedAt: backend.updatedAt,
    userId: backend.userId,
  };
}

/**
 * Canvas API endpoints
 */
export const canvasApi = {
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
