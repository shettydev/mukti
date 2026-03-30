/**
 * Thought Map Dialogue API client
 *
 * Provides functions for per-node Socratic dialogue on Thought Map nodes.
 * Mirrors the shape of `dialogue.ts` but targets `/thought-maps/:mapId/nodes/:nodeId/` paths.
 *
 * Features:
 * - Start dialogue (generates initial Socratic question)
 * - Get paginated messages
 * - Send messages (queue-based, 202 Accepted)
 * - SSE subscription for real-time updates
 */

import type {
  ThoughtMapDialogue,
  ThoughtMapDialogueMessage,
  ThoughtMapPaginatedMessagesResponse,
  ThoughtMapStartDialogueResponse,
} from '@/types/thought-map';

import { config } from '@/lib/config';

import type { GetMessagesOptions } from './dialogue';

import { apiClient } from './client';

// ============================================================================
// Backend response shapes
// ============================================================================

/**
 * DTO for sending a message to a Thought Map node dialogue.
 */
export interface SendThoughtMapMessageDto {
  content: string;
  model?: string;
}

/**
 * SSE event from Thought Map dialogue stream.
 * Identical shape to the canvas dialogue stream events.
 */
export interface ThoughtMapDialogueStreamEvent {
  data:
    | { code: string; message: string; retriable: boolean }
    | {
        content: string;
        role: 'assistant' | 'user';
        sequence: number;
        timestamp: string;
        tokens?: number;
      }
    | { cost: number; jobId: string; latency: number; tokens: number }
    | { jobId: string; status: string }
    | { status: string };
  dialogueId?: string;
  nodeId?: string;
  sessionId?: string;
  timestamp?: string;
  type: 'complete' | 'error' | 'message' | 'processing' | 'progress';
}

/**
 * Response after enqueueing a Thought Map dialogue message.
 */
export interface ThoughtMapSendMessageResponse {
  jobId: string;
  position: number;
}

interface BackendPaginatedMessagesResponse {
  dialogue: BackendThoughtMapDialogue | null;
  messages: BackendThoughtMapDialogueMessage[];
  pagination: {
    hasMore: boolean;
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}

interface BackendSendMessageResponse {
  jobId: string;
  position: number;
}

// ============================================================================
// Transform helpers
// ============================================================================

interface BackendStartDialogueResponse {
  dialogue: BackendThoughtMapDialogue;
  initialQuestion?: BackendThoughtMapDialogueMessage;
  jobId?: string;
  position?: number;
}

interface BackendThoughtMapDialogue {
  createdAt: string;
  id: string;
  lastMessageAt?: string;
  mapId?: string;
  messageCount: number;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  sessionId: string;
}

// ============================================================================
// API functions
// ============================================================================

interface BackendThoughtMapDialogueMessage {
  content: string;
  dialogueId: string;
  id: string;
  metadata?: {
    latencyMs?: number;
    model?: string;
    tokens?: number;
  };
  role: 'assistant' | 'user';
  sequence: number;
  timestamp: string;
}

function transformDialogue(backend: BackendThoughtMapDialogue): ThoughtMapDialogue {
  return {
    createdAt: backend.createdAt,
    id: backend.id,
    lastMessageAt: backend.lastMessageAt,
    mapId: backend.mapId ?? '',
    messageCount: backend.messageCount,
    nodeId: backend.nodeId,
    nodeLabel: backend.nodeLabel,
    nodeType: backend.nodeType,
  };
}

function transformMessage(backend: BackendThoughtMapDialogueMessage): ThoughtMapDialogueMessage {
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
 * Thought Map Dialogue API endpoints.
 */
export const thoughtMapDialogueApi = {
  /**
   * Get paginated dialogue messages for a Thought Map node.
   * Returns empty result if no dialogue exists yet.
   *
   * @param mapId - Thought Map ID
   * @param nodeId - Node identifier
   * @param options - Pagination options
   */
  getMessages: async (
    mapId: string,
    nodeId: string,
    options?: GetMessagesOptions
  ): Promise<ThoughtMapPaginatedMessagesResponse> => {
    const params = new URLSearchParams();
    if (options?.page) {
      params.append('page', String(options.page));
    }
    if (options?.limit) {
      params.append('limit', String(options.limit));
    }

    const query = params.toString();
    const response = await apiClient.get<BackendPaginatedMessagesResponse>(
      `/thought-maps/${mapId}/nodes/${nodeId}/messages${query ? `?${query}` : ''}`
    );

    return {
      dialogue: response.dialogue ? transformDialogue(response.dialogue) : null,
      messages: response.messages.map(transformMessage),
      pagination: response.pagination,
    };
  },

  /**
   * Send a user message to a Thought Map node dialogue.
   * Returns 202 Accepted with job ID. Subscribe to SSE stream for the AI response.
   *
   * @param mapId - Thought Map ID
   * @param nodeId - Node identifier
   * @param dto - Message content and optional model override
   */
  sendMessage: async (
    mapId: string,
    nodeId: string,
    dto: SendThoughtMapMessageDto
  ): Promise<ThoughtMapSendMessageResponse> => {
    const response = await apiClient.post<BackendSendMessageResponse>(
      `/thought-maps/${mapId}/nodes/${nodeId}/messages`,
      dto
    );

    return {
      jobId: response.jobId,
      position: response.position,
    };
  },

  /**
   * Start a Socratic dialogue for a Thought Map node.
   * Creates the NodeDialogue and generates an initial Socratic question.
   * Returns immediately if dialogue already exists.
   *
   * @param mapId - Thought Map ID
   * @param nodeId - Node identifier (e.g., 'thought-0', 'topic-0')
   */
  startDialogue: async (
    mapId: string,
    nodeId: string
  ): Promise<ThoughtMapStartDialogueResponse> => {
    const response = await apiClient.post<BackendStartDialogueResponse>(
      `/thought-maps/${mapId}/nodes/${nodeId}/start`
    );

    const dialogue = transformDialogue(response.dialogue);

    // Async path: new dialogue, AI generating initial question via queue
    if (response.jobId) {
      return { dialogue, jobId: response.jobId, position: response.position! };
    }

    // Sync path: existing dialogue, return first message
    return { dialogue, initialQuestion: transformMessage(response.initialQuestion!) };
  },

  /**
   * Subscribe to the SSE stream for a Thought Map node dialogue.
   * Returns a cleanup function that closes the EventSource.
   *
   * @param mapId - Thought Map ID
   * @param nodeId - Node identifier
   * @param accessToken - JWT access token (passed as query param, EventSource has no header support)
   * @param onEvent - Callback for each SSE event
   * @param onError - Callback on connection error
   * @param onOpen - Callback when connection opens
   */
  subscribeToStream: (
    mapId: string,
    nodeId: string,
    accessToken: string,
    onEvent: (event: ThoughtMapDialogueStreamEvent) => void,
    onError?: (error: Error) => void,
    onOpen?: () => void
  ): (() => void) => {
    const url = new URL(`${config.api.baseUrl}/thought-maps/${mapId}/nodes/${nodeId}/stream`);
    url.searchParams.set('token', accessToken);

    const eventSource = new EventSource(url.toString(), { withCredentials: true });

    eventSource.onopen = () => {
      onOpen?.();
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ThoughtMapDialogueStreamEvent;
        onEvent(data);
      } catch {
        onError?.(new Error('Failed to parse SSE event'));
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      onError?.(new Error('SSE connection error'));
    };

    return () => {
      eventSource.close();
    };
  },
};
