/**
 * Conversation API client
 * Provides functions for all conversation-related API calls
 *
 * Features:
 * - CRUD operations for conversations
 * - Message sending and retrieval
 * - Archived message pagination
 * - Filtering and sorting
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
    return apiClient.post<Conversation>('/conversations', dto);
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
    return apiClient.get<PaginatedConversations>(`/conversations${query ? `?${query}` : ''}`);
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
    return apiClient.get<Conversation>(`/conversations/${id}`);
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
    return apiClient.patch<Conversation>(`/conversations/${id}`, dto);
  },
};
