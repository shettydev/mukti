/**
 * Canvas API client
 * Provides functions for canvas session-related API calls
 *
 * Features:
 * - Create canvas sessions with problem structure
 * - Response transformation from backend format to frontend types
 */

import type { CanvasSession, CreateCanvasSessionDto } from '@/types/canvas.types';

import { apiClient } from './client';

/**
 * Backend canvas session response format (with _id instead of id)
 */
interface BackendCanvasSession {
  _id: string;
  createdAt: string;
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
    id: backend._id,
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
};
