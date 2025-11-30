/**
 * Conversation API client
 * Provides functions for all conversation-related API calls
 *
 * Features:
 * - CRUD operations for conversations
 * - Message sending and retrieval
 * - Archived message pagination
 * - Filtering and sorting
 * - Response transformation from backend format to frontend types
 */

import type {
  Conversation,
  ConversationFilters,
  CreateConversationDto,
  Message,
  PaginatedConversations,
  SendMessageDto,
  SendMessageResponse,
  UpdateConversationDto,
} from '@/types/conversation.types';

import { apiClient } from './client';

/**
 * Backend conversation response format (with _id instead of id)
 */
interface BackendConversation {
  _id: string;
  createdAt: string;
  hasArchivedMessages: boolean;
  isArchived: boolean;
  isFavorite: boolean;
  isShared?: boolean;
  metadata: {
    estimatedCost: number;
    lastMessageAt?: string;
    messageCount: number;
    totalTokens: number;
  };
  recentMessages: Array<{
    content: string;
    metadata?: {
      completionTokens?: number;
      latencyMs?: number;
      model?: string;
      promptTokens?: number;
      totalTokens?: number;
    };
    role: 'assistant' | 'user';
    timestamp: string;
  }>;
  tags: string[];
  technique: string;
  title: string;
  totalMessageCount?: number;
  updatedAt: string;
  userId: string;
}

/**
 * Transform backend conversation to frontend format
 * Handles both _id and id fields, and provides defaults for missing fields
 */
function transformConversation(backend: BackendConversation | Conversation): Conversation {
  // Handle case where data is already in frontend format (has 'id' instead of '_id')
  const id = '_id' in backend ? backend._id : (backend as Conversation).id;

  // Handle metadata - might be undefined in some responses
  const metadata = backend.metadata || {
    estimatedCost: 0,
    messageCount: 0,
    totalTokens: 0,
  };

  // Handle recentMessages - might be undefined
  // Cast to backend format since we're transforming from backend response
  const backendMessages = (backend.recentMessages || []) as BackendConversation['recentMessages'];
  const recentMessages = backendMessages.map((msg, index) => ({
    content: msg.content,
    role: msg.role as 'assistant' | 'user',
    sequence: index + 1, // Backend doesn't return sequence, so we generate it
    timestamp: msg.timestamp,
    tokens: msg.metadata?.totalTokens,
  }));

  return {
    createdAt: backend.createdAt,
    hasArchivedMessages: backend.hasArchivedMessages ?? false,
    id,
    isArchived: backend.isArchived ?? false,
    isFavorite: backend.isFavorite ?? false,
    metadata: {
      estimatedCost: metadata.estimatedCost ?? 0,
      lastMessageAt: metadata.lastMessageAt,
      messageCount: metadata.messageCount ?? 0,
      totalTokens: metadata.totalTokens ?? 0,
    },
    recentMessages,
    tags: backend.tags || [],
    technique: (backend.technique || 'elenchus') as Conversation['technique'],
    title: backend.title || '',
    updatedAt: backend.updatedAt,
    userId: backend.userId,
  };
}

/**
 * Conversation API endpoints
 */
export const conversationsApi = {
  /**
   * Create new conversation
   *
   * @param dto - Conversation creation data
   * @returns The newly created conversation
   * @throws {ApiClientError} If creation fails
   *
   * @example
   * ```typescript
   * const conversation = await conversationsApi.create({
   *   title: 'React Performance',
   *   technique: 'elenchus',
   *   tags: ['react', 'performance']
   * });
   * ```
   */
  create: async (dto: CreateConversationDto): Promise<Conversation> => {
    const response = await apiClient.post<BackendConversation>('/conversations', dto);
    return transformConversation(response);
  },

  /**
   * Delete conversation
   *
   * @param id - Conversation ID
   * @returns void
   * @throws {ApiClientError} If deletion fails or conversation not found
   *
   * @example
   * ```typescript
   * await conversationsApi.delete('507f1f77bcf86cd799439011');
   * ```
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/conversations/${id}`);
  },

  /**
   * Get all conversations with filters
   *
   * @param filters - Optional filters for conversations
   * @returns Paginated list of conversations
   * @throws {ApiClientError} If request fails
   *
   * @example
   * ```typescript
   * const response = await conversationsApi.getAll({
   *   technique: 'elenchus',
   *   page: 1,
   *   limit: 20,
   *   sort: 'updatedAt'
   * });
   * ```
   */
  getAll: async (filters?: ConversationFilters): Promise<PaginatedConversations> => {
    const params = new URLSearchParams();

    if (filters?.technique) {
      params.append('technique', filters.technique);
    }
    if (filters?.tags) {
      params.append('tags', filters.tags.join(','));
    }
    if (filters?.isArchived !== undefined) {
      params.append('isArchived', String(filters.isArchived));
    }
    if (filters?.isFavorite !== undefined) {
      params.append('isFavorite', String(filters.isFavorite));
    }
    if (filters?.sort) {
      params.append('sort', filters.sort);
    }
    if (filters?.page) {
      params.append('page', String(filters.page));
    }
    if (filters?.limit) {
      params.append('limit', String(filters.limit));
    }

    const query = params.toString();

    // The API client already unwraps the response, so we get the inner structure directly
    // Response format: { data: [...], meta: {...}, success: true }
    // After apiClient unwraps: { data: [...], meta: {...} } (the inner data field content)
    // But actually the backend returns data as the array and meta separately at the same level
    // So apiClient.get returns the whole { data: [], meta: {} } object
    const response = await apiClient.get<{
      data: BackendConversation[];
      meta: {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
      };
    }>(`/conversations${query ? `?${query}` : ''}`);

    // Handle both wrapped and unwrapped response formats
    // The API client extracts .data from { success: true, data: X }
    // For paginated endpoints, backend returns { success: true, data: [...], meta: {...} }
    // So apiClient returns just the array [...] (the value of .data)
    let conversations: BackendConversation[];
    let meta: { limit: number; page: number; total: number; totalPages: number };

    if (Array.isArray(response)) {
      // Response was unwrapped - we got the array directly
      conversations = response as unknown as BackendConversation[];
      meta = {
        limit: filters?.limit || 20,
        page: filters?.page || 1,
        total: conversations.length,
        totalPages: Math.ceil(conversations.length / (filters?.limit || 20)) || 1,
      };
    } else if (response && typeof response === 'object' && 'data' in response) {
      // Response has data property (wasn't unwrapped)
      conversations = response.data || [];
      meta = response.meta || {
        limit: filters?.limit || 20,
        page: filters?.page || 1,
        total: 0,
        totalPages: 0,
      };
    } else {
      // Fallback for unexpected response format
      conversations = [];
      meta = {
        limit: filters?.limit || 20,
        page: filters?.page || 1,
        total: 0,
        totalPages: 0,
      };
    }

    // Transform backend response to frontend format
    return {
      data: conversations.map(transformConversation),
      meta,
    };
  },

  /**
   * Get archived messages
   *
   * @param id - Conversation ID
   * @param options - Pagination options
   * @returns Array of archived messages
   * @throws {ApiClientError} If request fails
   *
   * @example
   * ```typescript
   * const messages = await conversationsApi.getArchivedMessages(
   *   '507f1f77bcf86cd799439011',
   *   { limit: 50, beforeSequence: 100 }
   * );
   * ```
   */
  getArchivedMessages: async (
    id: string,
    options?: { beforeSequence?: number; limit?: number }
  ): Promise<Message[]> => {
    const params = new URLSearchParams();
    if (options?.limit) {
      params.append('limit', String(options.limit));
    }
    if (options?.beforeSequence) {
      params.append('beforeSequence', String(options.beforeSequence));
    }

    const query = params.toString();
    return apiClient.get<Message[]>(
      `/conversations/${id}/messages/archived${query ? `?${query}` : ''}`
    );
  },

  /**
   * Get conversation by ID
   *
   * @param id - Conversation ID
   * @returns The conversation
   * @throws {ApiClientError} If conversation not found
   *
   * @example
   * ```typescript
   * const conversation = await conversationsApi.getById('507f1f77bcf86cd799439011');
   * ```
   */
  getById: async (id: string): Promise<Conversation> => {
    const response = await apiClient.get<BackendConversation>(`/conversations/${id}`);
    return transformConversation(response);
  },

  /**
   * Send message to conversation
   *
   * @param id - Conversation ID
   * @param dto - Message content
   * @returns Job information for message processing
   * @throws {ApiClientError} If sending fails
   *
   * @example
   * ```typescript
   * const response = await conversationsApi.sendMessage(
   *   '507f1f77bcf86cd799439011',
   *   { content: 'What is the best way to optimize React rendering?' }
   * );
   * console.log(`Job ID: ${response.jobId}, Position: ${response.position}`);
   * ```
   */
  sendMessage: async (id: string, dto: SendMessageDto): Promise<SendMessageResponse> => {
    return apiClient.post<SendMessageResponse>(`/conversations/${id}/messages`, dto);
  },

  /**
   * Update conversation
   *
   * @param id - Conversation ID
   * @param dto - Fields to update
   * @returns Updated conversation
   * @throws {ApiClientError} If update fails or conversation not found
   *
   * @example
   * ```typescript
   * const updated = await conversationsApi.update('507f1f77bcf86cd799439011', {
   *   title: 'Updated Title',
   *   isFavorite: true
   * });
   * ```
   */
  update: async (id: string, dto: UpdateConversationDto): Promise<Conversation> => {
    const response = await apiClient.patch<BackendConversation>(`/conversations/${id}`, dto);
    return transformConversation(response);
  },
};
