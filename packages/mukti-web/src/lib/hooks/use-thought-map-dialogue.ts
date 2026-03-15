'use client';

/**
 * TanStack Query hooks for Thought Map node dialogue
 *
 * Mirrors `use-dialogue.ts` but targets Thought Map endpoints.
 *
 * Provides:
 * - `useThoughtMapNodeMessages` — infinite-scroll paginated messages
 * - `useSendThoughtMapMessage` — send with optimistic user message
 * - `useThoughtMapDialogueStream` — SSE subscription for real-time AI responses
 * - `useStartThoughtMapDialogue` — start/load dialogue with initial question
 */

import type { InfiniteData } from '@tanstack/react-query';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import type {
  ThoughtMapDialogueMessage,
  ThoughtMapPaginatedMessagesResponse,
} from '@/types/thought-map';

import {
  type SendThoughtMapMessageDto,
  thoughtMapDialogueApi,
  type ThoughtMapDialogueStreamEvent,
  type ThoughtMapSendMessageResponse,
} from '@/lib/api/thought-map-dialogue';
import { config } from '@/lib/config';
import { thoughtMapDialogueKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

// ============================================================================
// Types
// ============================================================================

/** State for the Thought Map dialogue SSE subscription */
export interface ThoughtMapDialogueStreamState {
  error: Error | null;
  isConnected: boolean;
  isProcessing: boolean;
  processingStatus: null | string;
}

/** Context for optimistic update rollback */
interface SendMessageContext {
  optimisticMessageId: string;
  previousData: InfiniteData<ThoughtMapPaginatedMessagesResponse> | undefined;
}

// ============================================================================
// useStartThoughtMapDialogue
// ============================================================================

/**
 * Mutation to send a message to a Thought Map node dialogue.
 *
 * Optimistically adds the user message to the cache before the server confirms.
 * The AI response arrives via the SSE stream (`useThoughtMapDialogueStream`).
 * Rolls back on error.
 *
 * @param mapId - Thought Map ID
 * @param nodeId - Node identifier
 */
export function useSendThoughtMapMessage(mapId: string, nodeId: string) {
  const queryClient = useQueryClient();
  const queryKey = thoughtMapDialogueKeys.messages(mapId, nodeId);

  return useMutation<
    ThoughtMapSendMessageResponse,
    Error,
    SendThoughtMapMessageDto,
    SendMessageContext
  >({
    mutationFn: (dto) => thoughtMapDialogueApi.sendMessage(mapId, nodeId, dto),

    onError: (_err, _dto, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData =
        queryClient.getQueryData<InfiniteData<ThoughtMapPaginatedMessagesResponse>>(queryKey);

      const optimisticMessageId = `temp-${Date.now()}`;

      if (previousData) {
        const optimisticMessage: ThoughtMapDialogueMessage = {
          content: dto.content,
          dialogueId: previousData.pages[0]?.dialogue.id ?? '',
          id: optimisticMessageId,
          role: 'user',
          sequence: (previousData.pages[0]?.dialogue.messageCount ?? 0) + 1,
          timestamp: new Date().toISOString(),
        };

        queryClient.setQueryData<InfiniteData<ThoughtMapPaginatedMessagesResponse>>(queryKey, {
          ...previousData,
          pages: previousData.pages.map((page, index) =>
            index === 0
              ? {
                  ...page,
                  dialogue: {
                    ...page.dialogue,
                    lastMessageAt: optimisticMessage.timestamp,
                    messageCount: page.dialogue.messageCount + 1,
                  },
                  messages: [...page.messages, optimisticMessage],
                }
              : page
          ),
        });
      }

      return { optimisticMessageId, previousData };
    },

    onSuccess: () => {
      // AI response will arrive via SSE — no action needed here
    },
  });
}

// ============================================================================
// useThoughtMapNodeMessages
// ============================================================================

/**
 * Mutation to start (or re-load) a Thought Map node dialogue.
 *
 * On success, seeds the messages cache with the initial Socratic question
 * so `useThoughtMapNodeMessages` shows it immediately without a second request.
 *
 * @param mapId - Thought Map ID
 * @param nodeId - Node identifier
 */
export function useStartThoughtMapDialogue(mapId: string, nodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => thoughtMapDialogueApi.startDialogue(mapId, nodeId),

    onSuccess: (response) => {
      // Prime the messages cache with the initial question
      const queryKey = thoughtMapDialogueKeys.messages(mapId, nodeId);
      const existing =
        queryClient.getQueryData<InfiniteData<ThoughtMapPaginatedMessagesResponse>>(queryKey);

      if (!existing) {
        // No cache yet — seed it
        const seedPage: ThoughtMapPaginatedMessagesResponse = {
          dialogue: response.dialogue,
          messages: [response.initialQuestion],
          pagination: {
            hasMore: false,
            limit: config.pagination.defaultPageSize,
            page: 1,
            total: 1,
            totalPages: 1,
          },
        };
        queryClient.setQueryData<InfiniteData<ThoughtMapPaginatedMessagesResponse>>(queryKey, {
          pageParams: [1],
          pages: [seedPage],
        });
      }
    },
  });
}

// ============================================================================
// useSendThoughtMapMessage
// ============================================================================

/**
 * Subscribe to the SSE stream for a Thought Map node dialogue.
 *
 * Manages connection lifecycle, exponential backoff reconnection,
 * and cache updates when messages arrive.
 *
 * @param mapId - Thought Map ID
 * @param nodeId - Node identifier
 * @param enabled - Whether to connect (set false when panel is closed)
 */
export function useThoughtMapDialogueStream(
  mapId: string,
  nodeId: string,
  enabled = true
): ThoughtMapDialogueStreamState {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);

  const cleanupRef = useRef<(() => void) | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const isUnmountedRef = useRef(false);

  const mapIdRef = useRef(mapId);
  const nodeIdRef = useRef(nodeId);

  useEffect(() => {
    mapIdRef.current = mapId;
    nodeIdRef.current = nodeId;
  }, [mapId, nodeId]);

  const [state, setState] = useState<ThoughtMapDialogueStreamState>({
    error: null,
    isConnected: false,
    isProcessing: false,
    processingStatus: null,
  });

  useEffect(() => {
    isUnmountedRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (!enabled || !mapId || !nodeId || !accessToken) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      setState({ error: null, isConnected: false, isProcessing: false, processingStatus: null });
      return;
    }

    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 1000;

    function handleEvent(event: ThoughtMapDialogueStreamEvent) {
      if (isUnmountedRef.current) {
        return;
      }

      const currentMapId = mapIdRef.current;
      const currentNodeId = nodeIdRef.current;
      const queryKey = thoughtMapDialogueKeys.messages(currentMapId, currentNodeId);

      switch (event.type) {
        case 'complete':
          setState((prev) => ({ ...prev, isProcessing: false, processingStatus: null }));
          queryClient.invalidateQueries({
            queryKey: thoughtMapDialogueKeys.node(currentMapId, currentNodeId),
          });
          break;

        case 'error': {
          const errorData = event.data as { message: string };
          setState((prev) => ({
            ...prev,
            error: new Error(errorData.message),
            isProcessing: false,
            processingStatus: null,
          }));
          break;
        }

        case 'message': {
          const msgData = event.data as {
            content: string;
            role: 'assistant' | 'user';
            sequence: number;
            timestamp: string;
            tokens?: number;
          };
          const newMessage: ThoughtMapDialogueMessage = {
            content: msgData.content,
            dialogueId: event.dialogueId ?? '',
            id: `msg-${msgData.sequence}-${Date.now()}`,
            metadata: msgData.tokens ? { tokens: msgData.tokens } : undefined,
            role: msgData.role,
            sequence: msgData.sequence,
            timestamp: msgData.timestamp,
          };

          queryClient.setQueryData<InfiniteData<ThoughtMapPaginatedMessagesResponse>>(
            queryKey,
            (old) => {
              if (!old) {
                return old;
              }

              return {
                ...old,
                pages: old.pages.map((page, index) => {
                  if (index !== 0) {
                    return page;
                  }

                  const existingMessages =
                    msgData.role === 'user'
                      ? page.messages.filter(
                          (msg) => !msg.id.startsWith('temp-') || msg.role !== 'user'
                        )
                      : page.messages;

                  const messageExists = existingMessages.some(
                    (msg) => msg.sequence === newMessage.sequence && msg.role === newMessage.role
                  );

                  if (messageExists) {
                    return page;
                  }

                  return {
                    ...page,
                    dialogue: {
                      ...page.dialogue,
                      lastMessageAt: newMessage.timestamp,
                      messageCount: Math.max(page.dialogue.messageCount, newMessage.sequence + 1),
                    },
                    messages: [...existingMessages, newMessage],
                  };
                }),
              };
            }
          );
          break;
        }

        case 'processing':
          setState((prev) => ({
            ...prev,
            isProcessing: true,
            processingStatus: 'Processing...',
          }));
          break;

        case 'progress': {
          const progressData = event.data as { status: string };
          setState((prev) => ({ ...prev, processingStatus: progressData.status }));
          break;
        }
      }
    }

    function handleError(error: Error) {
      if (isUnmountedRef.current) {
        return;
      }

      setState((prev) => ({ ...prev, error, isConnected: false }));

      if (reconnectAttemptRef.current < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptRef.current);
        reconnectAttemptRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isUnmountedRef.current) {
            connect();
          }
        }, delay);
      }
    }

    function handleOpen() {
      if (isUnmountedRef.current) {
        return;
      }
      setState((prev) => ({ ...prev, error: null, isConnected: true }));
      reconnectAttemptRef.current = 0;
    }

    function connect() {
      if (isUnmountedRef.current || !accessToken) {
        return;
      }

      cleanupRef.current?.();
      cleanupRef.current = null;

      cleanupRef.current = thoughtMapDialogueApi.subscribeToStream(
        mapIdRef.current,
        nodeIdRef.current,
        accessToken,
        handleEvent,
        handleError,
        handleOpen
      );
    }

    connect();

    return () => {
      isUnmountedRef.current = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [enabled, mapId, nodeId, accessToken, queryClient]);

  return state;
}

// ============================================================================
// useThoughtMapDialogueStream
// ============================================================================

/**
 * Infinite-scroll paginated messages for a Thought Map node dialogue.
 *
 * @param mapId - Thought Map ID
 * @param nodeId - Node identifier
 * @param enabled - Whether to fetch (lazy loading)
 */
export function useThoughtMapNodeMessages(mapId: string, nodeId: string, enabled = true) {
  return useInfiniteQuery<
    ThoughtMapPaginatedMessagesResponse,
    Error,
    InfiniteData<ThoughtMapPaginatedMessagesResponse>,
    readonly unknown[],
    number
  >({
    enabled: enabled && !!mapId && !!nodeId,
    gcTime: config.cache.defaultCacheTime,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) =>
      thoughtMapDialogueApi.getMessages(mapId, nodeId, {
        limit: config.pagination.defaultPageSize,
        page: pageParam,
      }),
    queryKey: thoughtMapDialogueKeys.messages(mapId, nodeId),
    staleTime: config.cache.defaultStaleTime,
  });
}
