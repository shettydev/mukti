/**
 * Centralized query key factory for TanStack Query
 * Ensures consistent cache keys across the application
 *
 * Query Key Hierarchy:
 * - conversations.all: ['conversations']
 * - conversations.lists(): ['conversations', 'list']
 * - conversations.list(filters): ['conversations', 'list', { filters }]
 * - conversations.details(): ['conversations', 'detail']
 * - conversations.detail(id): ['conversations', 'detail', id]
 * - conversations.messages(id): ['conversations', 'detail', id, 'messages']
 * - conversations.archivedMessages(id, beforeSequence): ['conversations', 'detail', id, 'messages', 'archived', beforeSequence]
 *
 * Usage:
 * ```typescript
 * import { conversationKeys } from '@/lib/query-keys';
 *
 * // Query for conversation list
 * useQuery({
 *   queryKey: conversationKeys.list({ technique: 'elenchus' }),
 *   queryFn: () => conversationsApi.getAll({ technique: 'elenchus' })
 * });
 *
 * // Invalidate all conversation queries
 * queryClient.invalidateQueries({ queryKey: conversationKeys.all });
 *
 * // Invalidate specific conversation
 * queryClient.invalidateQueries({ queryKey: conversationKeys.detail(id) });
 * ```
 */

import type { ConversationFilters } from '@/types/conversation.types';

/**
 * Canvas query keys factory
 *
 * Query Key Hierarchy:
 * - canvasKeys.all: ['canvas']
 * - canvasKeys.sessions(): ['canvas', 'sessions']
 * - canvasKeys.session(id): ['canvas', 'sessions', id]
 *
 * Usage:
 * ```typescript
 * import { canvasKeys } from '@/lib/query-keys';
 *
 * // Invalidate all canvas queries
 * queryClient.invalidateQueries({ queryKey: canvasKeys.all });
 *
 * // Invalidate specific session
 * queryClient.invalidateQueries({ queryKey: canvasKeys.session(id) });
 * ```
 */
export const canvasKeys = {
  /**
   * Base key for all canvas queries
   * Use this to invalidate ALL canvas-related queries
   */
  all: ['canvas'] as const,

  /**
   * Key for specific canvas session detail
   *
   * @param id - Canvas session ID
   * @returns Query key for canvas session detail
   */
  session: (id: string) => [...canvasKeys.sessions(), id] as const,

  /**
   * Base key for all canvas session queries
   */
  sessions: () => [...canvasKeys.all, 'sessions'] as const,
};

/**
 * Conversation query keys factory
 */
export const conversationKeys = {
  /**
   * Base key for all conversation queries
   * Use this to invalidate ALL conversation-related queries
   */
  all: ['conversations'] as const,

  /**
   * Key for archived messages with pagination
   *
   * @param id - Conversation ID
   * @param beforeSequence - Optional sequence number for pagination
   * @returns Query key for archived messages
   */
  archivedMessages: (id: string, beforeSequence?: number) =>
    [...conversationKeys.messages(id), 'archived', beforeSequence] as const,

  /**
   * Key for specific conversation detail
   *
   * @param id - Conversation ID
   * @returns Query key for conversation detail
   */
  detail: (id: string) => [...conversationKeys.details(), id] as const,

  /**
   * Base key for all conversation detail queries
   */
  details: () => [...conversationKeys.all, 'detail'] as const,

  /**
   * Key for filtered conversation list
   *
   * @param filters - Conversation filters
   * @returns Query key for filtered list
   */
  list: (filters: ConversationFilters) => [...conversationKeys.lists(), filters] as const,

  /**
   * Base key for all conversation list queries
   */
  lists: () => [...conversationKeys.all, 'list'] as const,

  /**
   * Key for conversation messages
   *
   * @param id - Conversation ID
   * @returns Query key for messages
   */
  messages: (id: string) => [...conversationKeys.detail(id), 'messages'] as const,
};
