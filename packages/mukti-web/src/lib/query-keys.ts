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
 * Dialogue query keys factory
 *
 * Query Key Hierarchy:
 * - dialogueKeys.all: ['dialogue']
 * - dialogueKeys.sessions(): ['dialogue', 'sessions']
 * - dialogueKeys.session(sessionId): ['dialogue', 'sessions', sessionId]
 * - dialogueKeys.nodes(sessionId): ['dialogue', 'sessions', sessionId, 'nodes']
 * - dialogueKeys.node(sessionId, nodeId): ['dialogue', 'sessions', sessionId, 'nodes', nodeId]
 * - dialogueKeys.messages(sessionId, nodeId): ['dialogue', 'sessions', sessionId, 'nodes', nodeId, 'messages']
 * - dialogueKeys.messagesPage(sessionId, nodeId, page): ['dialogue', 'sessions', sessionId, 'nodes', nodeId, 'messages', page]
 *
 * Usage:
 * ```typescript
 * import { dialogueKeys } from '@/lib/query-keys';
 *
 * // Query for node messages
 * useQuery({
 *   queryKey: dialogueKeys.messages('session-id', 'root-0'),
 *   queryFn: () => dialogueApi.getMessages('session-id', 'root-0')
 * });
 *
 * // Invalidate all dialogue queries for a session
 * queryClient.invalidateQueries({ queryKey: dialogueKeys.session('session-id') });
 *
 * // Invalidate specific node dialogue
 * queryClient.invalidateQueries({ queryKey: dialogueKeys.node('session-id', 'root-0') });
 * ```
 */
export const dialogueKeys = {
  /**
   * Base key for all dialogue queries
   * Use this to invalidate ALL dialogue-related queries
   */
  all: ['dialogue'] as const,

  /**
   * Key for messages of a specific node dialogue
   *
   * @param sessionId - Canvas session ID
   * @param nodeId - Node identifier
   * @returns Query key for node messages
   */
  messages: (sessionId: string, nodeId: string) =>
    [...dialogueKeys.node(sessionId, nodeId), 'messages'] as const,

  /**
   * Key for paginated messages of a specific node dialogue
   *
   * @param sessionId - Canvas session ID
   * @param nodeId - Node identifier
   * @param page - Page number
   * @returns Query key for paginated node messages
   */
  messagesPage: (sessionId: string, nodeId: string, page: number) =>
    [...dialogueKeys.messages(sessionId, nodeId), page] as const,

  /**
   * Key for specific node dialogue
   *
   * @param sessionId - Canvas session ID
   * @param nodeId - Node identifier
   * @returns Query key for node dialogue
   */
  node: (sessionId: string, nodeId: string) => [...dialogueKeys.nodes(sessionId), nodeId] as const,

  /**
   * Key for all node dialogues in a session
   *
   * @param sessionId - Canvas session ID
   * @returns Query key for session nodes
   */
  nodes: (sessionId: string) => [...dialogueKeys.session(sessionId), 'nodes'] as const,

  /**
   * Key for specific session's dialogues
   *
   * @param sessionId - Canvas session ID
   * @returns Query key for session dialogues
   */
  session: (sessionId: string) => [...dialogueKeys.sessions(), sessionId] as const,

  /**
   * Base key for all session dialogue queries
   */
  sessions: () => [...dialogueKeys.all, 'sessions'] as const,
};

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
   * Alias for session() to maintain consistency with other query key patterns
   *
   * @param id - Canvas session ID
   * @returns Query key for canvas session detail
   */
  detail: (id: string) => [...canvasKeys.sessions(), 'detail', id] as const,

  /**
   * Key for insight nodes of a specific canvas session
   *
   * @param sessionId - Canvas session ID
   * @returns Query key for session insights
   */
  insights: (sessionId: string) => [...canvasKeys.session(sessionId), 'insights'] as const,

  /**
   * Key for relationship edges of a specific canvas session
   *
   * @param sessionId - Canvas session ID
   * @returns Query key for session relationships
   */
  relationships: (sessionId: string) =>
    [...canvasKeys.session(sessionId), 'relationships'] as const,

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
