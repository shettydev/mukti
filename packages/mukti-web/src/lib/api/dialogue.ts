/**
 * Dialogue API client
 * Provides functions for node dialogue-related API calls
 *
 * Features:
 * - Get messages for a node dialogue with pagination
 * - Send messages to a node dialogue (queue-based)
 * - SSE connection for real-time updates
 * - Response transformation from backend format to frontend types
 */

import type { TurnKind } from '@muktiai/contracts';

import type {
  DialogueMessage,
  DialogueStreamEvent,
  NodeDialogue,
  PaginatedMessagesResponse,
  SendMessageResponse,
  SendNodeMessageDto,
  UpdateNodeDialogueDto,
} from '@/types/dialogue.types';

import { config } from '@/lib/config';
import { toHelpLevel, toTurnBudget } from '@/lib/help-controls';

import { apiClient } from './client';

/**
 * Pagination options for fetching messages
 */
export interface GetMessagesOptions {
  limit?: number;
  page?: number;
}

/**
 * Backend dialogue message response format
 */
interface BackendDialogueMessage {
  content: string;
  createdAt?: string;
  dialogueId: string;
  id: string;
  metadata?: {
    latencyMs?: number;
    model?: string;
    tokens?: number;
    turnKind?: TurnKind;
  };
  role: 'assistant' | 'user';
  sequence: number;
  timestamp: string;
}

/**
 * Backend node dialogue response format
 */
interface BackendNodeDialogue {
  createdAt: string;
  currentScaffoldLevel?: number;
  id: string;
  lastMessageAt?: string;
  messageCount: number;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  sessionId: string;
  turnBudget?: null | number;
}

/**
 * Backend paginated messages response format
 */
interface BackendPaginatedMessagesResponse {
  /** Null when the node has no dialogue yet. */
  dialogue: BackendNodeDialogue | null;
  messages: BackendDialogueMessage[];
  pagination: {
    hasMore: boolean;
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Backend send message response format (queue-based)
 */
interface BackendSendMessageResponse {
  jobId: string;
  position: number;
}

/**
 * Transform backend node dialogue to frontend format
 */
function transformDialogue(backend: BackendNodeDialogue): NodeDialogue {
  return {
    createdAt: backend.createdAt,
    currentScaffoldLevel: toHelpLevel(backend.currentScaffoldLevel),
    id: backend.id,
    lastMessageAt: backend.lastMessageAt,
    messageCount: backend.messageCount,
    nodeId: backend.nodeId,
    nodeLabel: backend.nodeLabel,
    nodeType: backend.nodeType as NodeDialogue['nodeType'],
    sessionId: backend.sessionId,
    turnBudget: toTurnBudget(backend.turnBudget),
  };
}

/**
 * Transform backend dialogue message to frontend format
 */
function transformMessage(backend: BackendDialogueMessage): DialogueMessage {
  return {
    content: backend.content,
    dialogueId: backend.dialogueId,
    id: backend.id,
    metadata: backend.metadata,
    role: backend.role,
    sequence: backend.sequence,
    timestamp: backend.timestamp,
  };
}

/**
 * Dialogue API endpoints
 */
export const dialogueApi = {
  /**
   * Get messages for a node dialogue with pagination
   *
   * @param sessionId - Canvas session ID
   * @param nodeId - Node identifier (e.g., 'seed', 'soil-0', 'root-1')
   * @param options - Pagination options
   * @returns Paginated messages response
   * @throws {ApiClientError} If request fails
   *
   * @example
   * ```typescript
   * const response = await dialogueApi.getMessages(
   *   '507f1f77bcf86cd799439011',
   *   'root-0',
   *   { page: 1, limit: 20 }
   * );
   * ```
   */
  getMessages: async (
    sessionId: string,
    nodeId: string,
    options?: GetMessagesOptions
  ): Promise<PaginatedMessagesResponse> => {
    const params = new URLSearchParams();

    if (options?.page) {
      params.append('page', String(options.page));
    }
    if (options?.limit) {
      params.append('limit', String(options.limit));
    }

    const query = params.toString();
    const response = await apiClient.get<BackendPaginatedMessagesResponse>(
      `/canvas/${sessionId}/nodes/${nodeId}/messages${query ? `?${query}` : ''}`
    );

    return {
      dialogue: response.dialogue ? transformDialogue(response.dialogue) : null,
      messages: response.messages.map(transformMessage),
      pagination: response.pagination,
    };
  },

  /**
   * Send a message to a node dialogue (queue-based)
   *
   * @param sessionId - Canvas session ID
   * @param nodeId - Node identifier (e.g., 'seed', 'soil-0', 'root-1')
   * @param dto - Message content
   * @returns Response containing jobId and queue position
   * @throws {ApiClientError} If sending fails
   *
   * @example
   * ```typescript
   * const response = await dialogueApi.sendMessage(
   *   '507f1f77bcf86cd799439011',
   *   'root-0',
   *   { content: 'I believe this assumption is valid because...' }
   * );
   * // Then subscribe to SSE for real-time updates
   * ```
   */
  sendMessage: async (
    sessionId: string,
    nodeId: string,
    dto: SendNodeMessageDto
  ): Promise<SendMessageResponse> => {
    const response = await apiClient.post<BackendSendMessageResponse>(
      `/canvas/${sessionId}/nodes/${nodeId}/messages`,
      dto
    );

    return {
      jobId: response.jobId,
      position: response.position,
    };
  },

  /**
   * Create an SSE connection for real-time dialogue updates
   *
   * @param sessionId - Canvas session ID
   * @param nodeId - Node identifier
   * @param accessToken - JWT access token for authentication
   * @param onEvent - Callback for handling events
   * @param onError - Callback for handling errors
   * @param onOpen - Callback when connection is established
   * @returns Cleanup function to close the connection
   *
   * @example
   * ```typescript
   * const cleanup = dialogueApi.subscribeToStream(
   *   'session-id',
   *   'root-0',
   *   'jwt-token',
   *   (event) => {
   *     if (event.type === 'message') {
   *       // Handle new message
   *     }
   *   },
   *   (error) => console.error(error)
   * );
   *
   * // Later, to cleanup:
   * cleanup();
   * ```
   */
  subscribeToStream: (
    sessionId: string,
    nodeId: string,
    accessToken: string,
    onEvent: (event: DialogueStreamEvent) => void,
    onError?: (error: Error) => void,
    onOpen?: () => void
  ): (() => void) => {
    // EventSource doesn't support custom headers, so we pass token as query param
    const url = new URL(`${config.api.baseUrl}/canvas/${sessionId}/nodes/${nodeId}/stream`);
    url.searchParams.set('token', accessToken);

    const eventSource = new EventSource(url.toString(), {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      onOpen?.();
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as DialogueStreamEvent;
        onEvent(data);
      } catch {
        onError?.(new Error('Failed to parse SSE event'));
      }
    };

    eventSource.onerror = () => {
      // Close to prevent automatic reconnection - we handle it manually
      eventSource.close();
      onError?.(new Error('SSE connection error'));
    };

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  },

  /**
   * Update a node dialogue's settings: set or clear its turn budget
   * (1-50 exchanges, or null). Creates the dialogue if the node has none yet.
   *
   * @param sessionId - Canvas session ID
   * @param nodeId - Node identifier
   * @param dto - The settings to change
   * @returns The updated dialogue
   */
  updateDialogue: async (
    sessionId: string,
    nodeId: string,
    dto: UpdateNodeDialogueDto
  ): Promise<NodeDialogue> => {
    const response = await apiClient.patch<BackendNodeDialogue>(
      `/canvas/${sessionId}/nodes/${nodeId}/dialogue`,
      dto
    );
    return transformDialogue(response);
  },
};
