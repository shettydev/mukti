/**
 * TanStack Query hooks for conversation management
 *
 * Provides hooks for:
 * - Fetching conversations with infinite scroll
 * - Fetching single conversation details
 * - Fetching archived messages with pagination
 * - Creating conversations with optimistic updates
 * - Updating conversations with optimistic updates
 * - Deleting conversations with optimistic updates
 * - Sending messages with optimistic updates
 *
 * All mutations implement optimistic updates for immediate UI feedback
 * with automatic rollback on errors.
 *
 * Performance optimizations:
 * - Centralized cache configuration from config.ts
 * - Pagination limits (20 items per page)
 * - Optimized stale times for different data types
 */

'use client';

import type { InfiniteData } from '@tanstack/react-query';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

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

import { conversationsApi } from '@/lib/api/conversations';
import { config } from '@/lib/config';
import { conversationKeys } from '@/lib/query-keys';

/**
 * Fetch archived messages with infinite scroll
 *
 * @param conversationId - Conversation ID
 * @returns Infinite query result with pages of archived messages
 *
 * @example
 * ```typescript
 * const { data, fetchNextPage, hasNextPage } = useArchivedMessages('507f1f77bcf86cd799439011');
 * ```
 */
export function useArchivedMessages(conversationId: string) {
  return useInfiniteQuery<
    Message[],
    Error,
    InfiniteData<Message[]>,
    readonly unknown[],
    number | undefined
  >({
    enabled: !!conversationId,
    // Use centralized cache time
    gcTime: config.cache.defaultCacheTime,
    getNextPageParam: (lastPage: Message[]) => {
      if (lastPage.length === 0) {
        return undefined;
      }
      // Return the sequence number of the oldest message for next fetch
      return lastPage[lastPage.length - 1].sequence;
    },
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      conversationsApi.getArchivedMessages(conversationId, {
        beforeSequence: pageParam,
        // Use pagination limit from config
        limit: config.pagination.defaultPageSize,
      }),
    queryKey: conversationKeys.archivedMessages(conversationId, undefined),
    // Archived messages don't change often, use longer stale time
    staleTime: config.cache.defaultStaleTime * 2, // 2 minutes
  });
}

/**
 * Fetch single conversation by ID
 *
 * @param id - Conversation ID
 * @returns Query result with conversation data
 *
 * @example
 * ```typescript
 * const { data: conversation, isLoading } = useConversation('507f1f77bcf86cd799439011');
 * ```
 */
export function useConversation(id: string) {
  return useQuery({
    enabled: !!id,
    // Use centralized cache time
    gcTime: config.cache.defaultCacheTime,
    queryFn: () => conversationsApi.getById(id),
    queryKey: conversationKeys.detail(id),
    // Use centralized stale time (conversation details may change frequently)
    staleTime: config.cache.defaultStaleTime / 2, // 30 seconds
  });
}

/**
 * Create new conversation with optimistic update
 *
 * Optimistically adds the conversation to the list before server confirmation.
 * Automatically rolls back on error and navigates to the new conversation on success.
 *
 * @returns Mutation result with create function
 *
 * @example
 * ```typescript
 * const { mutate: createConversation, isPending } = useCreateConversation();
 *
 * createConversation({
 *   title: 'React Performance',
 *   technique: 'elenchus',
 *   tags: ['react']
 * });
 * ```
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<
    Conversation,
    Error,
    CreateConversationDto,
    { previousData: [readonly unknown[], InfiniteData<PaginatedConversations> | undefined][] }
  >({
    mutationFn: (dto: CreateConversationDto) => conversationsApi.create(dto),

    onError: (err, newConversation, context) => {
      // Rollback optimistic update on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onMutate: async (newConversation) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() });

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueriesData<InfiniteData<PaginatedConversations>>({
        queryKey: conversationKeys.lists(),
      });

      // Optimistically update all conversation list queries
      queryClient.setQueriesData<InfiniteData<PaginatedConversations>>(
        { queryKey: conversationKeys.lists() },
        (old) => {
          if (!old) {
            return old;
          }

          // Create optimistic conversation
          const optimisticConversation: Conversation = {
            createdAt: new Date().toISOString(),
            hasArchivedMessages: false,
            id: 'temp-' + Date.now(),
            isArchived: false,
            isFavorite: false,
            metadata: {
              estimatedCost: 0,
              messageCount: 0,
              totalTokens: 0,
            },
            recentMessages: [],
            tags: newConversation.tags || [],
            technique: newConversation.technique,
            title: newConversation.title,
            updatedAt: new Date().toISOString(),
            userId: '', // Will be set by server
          };

          // Add to first page
          return {
            ...old,
            pages: old.pages.map((page, index) =>
              index === 0
                ? {
                    ...page,
                    data: [optimisticConversation, ...page.data],
                    meta: {
                      ...page.meta,
                      total: page.meta.total + 1,
                    },
                  }
                : page
            ),
          };
        }
      );

      return { previousData };
    },

    onSuccess: (data) => {
      // Invalidate and refetch to get accurate data from server
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });

      // Navigate to new conversation
      router.push(`/dashboard/conversations/${data.id}`);
    },
  });
}

/**
 * Delete conversation with optimistic update
 *
 * Optimistically removes the conversation from the list before server confirmation.
 * Automatically rolls back on error and navigates away on success.
 *
 * @returns Mutation result with delete function
 *
 * @example
 * ```typescript
 * const { mutate: deleteConversation, isPending } = useDeleteConversation();
 *
 * deleteConversation('507f1f77bcf86cd799439011');
 * ```
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<
    void,
    Error,
    string,
    { previousData: [readonly unknown[], InfiniteData<PaginatedConversations> | undefined][] }
  >({
    mutationFn: (id: string) => conversationsApi.delete(id),

    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() });

      // Snapshot previous value
      const previousData = queryClient.getQueriesData<InfiniteData<PaginatedConversations>>({
        queryKey: conversationKeys.lists(),
      });

      // Optimistically remove from all list queries
      queryClient.setQueriesData<InfiniteData<PaginatedConversations>>(
        { queryKey: conversationKeys.lists() },
        (old) => {
          if (!old) {
            return old;
          }

          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((conv) => conv.id !== id),
              meta: {
                ...page.meta,
                total: page.meta.total - 1,
              },
            })),
          };
        }
      );

      return { previousData };
    },

    onSuccess: (_, id) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });

      // Remove detail query from cache
      queryClient.removeQueries({ queryKey: conversationKeys.detail(id) });

      // Navigate back to list
      router.push('/dashboard/conversations');
    },
  });
}

/**
 * Fetch all conversations with infinite scroll
 *
 * @param filters - Optional filters (technique, tags, archived, favorite, sort)
 * @returns Infinite query result with pages of conversations
 *
 * @example
 * ```typescript
 * const { data, fetchNextPage, hasNextPage } = useInfiniteConversations({
 *   technique: 'elenchus',
 *   limit: 20
 * });
 * ```
 */
export function useInfiniteConversations(filters?: Omit<ConversationFilters, 'page'>) {
  // Apply default pagination limit from config
  const filtersWithDefaults = {
    ...filters,
    limit: filters?.limit || config.pagination.defaultPageSize,
  };

  return useInfiniteQuery<
    PaginatedConversations,
    Error,
    InfiniteData<PaginatedConversations>,
    readonly unknown[],
    number
  >({
    // Use centralized cache time
    gcTime: config.cache.defaultCacheTime,
    getNextPageParam: (lastPage: PaginatedConversations) => {
      // If we have more pages, return the next page number
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined; // No more pages
    },
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) =>
      conversationsApi.getAll({ ...filtersWithDefaults, page: pageParam }),
    queryKey: conversationKeys.list(filtersWithDefaults),
    // Use centralized stale time
    staleTime: config.cache.defaultStaleTime / 2, // 30 seconds
  });
}

/**
 * Send message with optimistic update
 *
 * Optimistically adds the user message to the conversation before server confirmation.
 * Automatically rolls back on error. AI response is delivered via SSE, so no manual refetch is needed.
 *
 * @param conversationId - Conversation ID to send message to
 * @returns Mutation result with send function
 *
 * @example
 * ```typescript
 * const { mutate: sendMessage, isPending } = useSendMessage('507f1f77bcf86cd799439011');
 *
 * sendMessage({
 *   content: 'What is the best way to optimize React rendering?'
 * });
 * ```
 */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    SendMessageResponse,
    Error,
    SendMessageDto,
    { previousConversation: Conversation | undefined }
  >({
    mutationFn: (dto: SendMessageDto) => conversationsApi.sendMessage(conversationId, dto),

    onError: (err, message, context) => {
      // Rollback on error
      if (context?.previousConversation) {
        queryClient.setQueryData(
          conversationKeys.detail(conversationId),
          context.previousConversation
        );
      }
    },

    onMutate: async (message) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationKeys.detail(conversationId) });

      // Snapshot previous value
      const previousConversation = queryClient.getQueryData<Conversation>(
        conversationKeys.detail(conversationId)
      );

      // Optimistically add user message
      queryClient.setQueryData<Conversation>(conversationKeys.detail(conversationId), (old) => {
        if (!old) {
          return old;
        }

        const newMessage: Message = {
          content: message.content,
          role: 'user',
          sequence: old.metadata.messageCount + 1,
          timestamp: new Date().toISOString(),
        };

        return {
          ...old,
          metadata: {
            ...old.metadata,
            lastMessageAt: newMessage.timestamp,
            messageCount: old.metadata.messageCount + 1,
          },
          recentMessages: [...old.recentMessages, newMessage],
          updatedAt: new Date().toISOString(),
        };
      });

      return { previousConversation };
    },

    onSuccess: () => {
      // No need to refetch - SSE will deliver the AI response in real-time
      // The useConversationStream hook automatically updates the cache when messages arrive
    },
  });
}

/**
 * Update conversation with optimistic update
 *
 * Optimistically updates the conversation in cache before server confirmation.
 * Automatically rolls back on error.
 *
 * @param id - Conversation ID to update
 * @returns Mutation result with update function
 *
 * @example
 * ```typescript
 * const { mutate: updateConversation } = useUpdateConversation('507f1f77bcf86cd799439011');
 *
 * updateConversation({
 *   title: 'Updated Title',
 *   isFavorite: true
 * });
 * ```
 */
export function useUpdateConversation(id: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Conversation,
    Error,
    UpdateConversationDto,
    { previousConversation: Conversation | undefined }
  >({
    mutationFn: (dto: UpdateConversationDto) => conversationsApi.update(id, dto),

    onError: (err, updates, context) => {
      // Rollback on error
      if (context?.previousConversation) {
        queryClient.setQueryData(conversationKeys.detail(id), context.previousConversation);
      }
    },

    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationKeys.detail(id) });

      // Snapshot previous value
      const previousConversation = queryClient.getQueryData<Conversation>(
        conversationKeys.detail(id)
      );

      // Optimistically update conversation detail
      queryClient.setQueryData<Conversation>(conversationKeys.detail(id), (old) => {
        if (!old) {
          return old;
        }
        return {
          ...old,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      });

      // Also update in list queries
      queryClient.setQueriesData<InfiniteData<PaginatedConversations>>(
        { queryKey: conversationKeys.lists() },
        (old) => {
          if (!old) {
            return old;
          }

          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((conv) =>
                conv.id === id
                  ? {
                      ...conv,
                      ...updates,
                      updatedAt: new Date().toISOString(),
                    }
                  : conv
              ),
            })),
          };
        }
      );

      return { previousConversation };
    },

    onSuccess: () => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}
