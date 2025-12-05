/**
 * TanStack Query hooks for node dialogue management
 *
 * Provides hooks for:
 * - Fetching node dialogue messages with pagination
 * - Sending messages to node dialogues with optimistic updates
 * - SSE subscription for real-time updates
 *
 * All mutations implement optimistic updates for immediate UI feedback
 * with automatic rollback on errors.
 *
 * Performance optimizations:
 * - Lazy loading: messages are only fetched when a node is selected
 * - Pagination: long histories are paginated for efficient loading
 * - Centralized cache configuration from config.ts
 * - SSE for real-time AI response streaming
 */

'use client';

import type { InfiniteData } from '@tanstack/react-query';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import type {
  DialogueMessage,
  DialogueStreamEvent,
  PaginatedMessagesResponse,
  SendMessageResponse,
  SendNodeMessageDto,
} from '@/types/dialogue.types';

import { dialogueApi } from '@/lib/api/dialogue';
import { config } from '@/lib/config';
import { dialogueKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * State for dialogue stream subscription
 */
export interface DialogueStreamState {
  error: Error | null;
  isConnected: boolean;
  isProcessing: boolean;
  processingStatus: null | string;
}

/**
 * Context for optimistic update rollback
 */
interface SendMessageContext {
  optimisticMessageId: string;
  previousData: InfiniteData<PaginatedMessagesResponse> | undefined;
}

/**
 * Subscribe to dialogue SSE stream for real-time updates
 *
 * Automatically connects when enabled and handles reconnection.
 * Updates the query cache when messages arrive via SSE.
 *
 * @param sessionId - Canvas session ID
 * @param nodeId - Node identifier
 * @param enabled - Whether to enable the subscription
 * @returns Stream state and control functions
 *
 * @example
 * ```typescript
 * const { isConnected, isProcessing, processingStatus, error } = useDialogueStream(
 *   'session-id',
 *   'root-0',
 *   true
 * );
 * ```
 */
export function useDialogueStream(
  sessionId: string,
  nodeId: string,
  enabled = true
): DialogueStreamState {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const isUnmountedRef = useRef(false);

  // Store sessionId and nodeId in refs to avoid dependency changes
  const sessionIdRef = useRef(sessionId);
  const nodeIdRef = useRef(nodeId);

  // Update refs when props change
  useEffect(() => {
    sessionIdRef.current = sessionId;
    nodeIdRef.current = nodeId;
  }, [sessionId, nodeId]);

  // Get access token from auth store
  const accessToken = useAuthStore((state) => state.accessToken);

  const [state, setState] = useState<DialogueStreamState>({
    error: null,
    isConnected: false,
    isProcessing: false,
    processingStatus: null,
  });

  // Connect/disconnect based on enabled state and access token
  useEffect(() => {
    // Reset unmounted flag
    isUnmountedRef.current = false;

    // Cleanup any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (!enabled || !sessionId || !nodeId || !accessToken) {
      // Cleanup existing connection
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      setState({
        error: null,
        isConnected: false,
        isProcessing: false,
        processingStatus: null,
      });
      return;
    }

    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 1000;

    /**
     * Handle incoming SSE events
     */
    function handleEvent(event: DialogueStreamEvent) {
      if (isUnmountedRef.current) {
        return;
      }

      const currentSessionId = sessionIdRef.current;
      const currentNodeId = nodeIdRef.current;
      const queryKey = dialogueKeys.messages(currentSessionId, currentNodeId);

      switch (event.type) {
        case 'complete':
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            processingStatus: null,
          }));
          // Invalidate to ensure consistency
          queryClient.invalidateQueries({
            queryKey: dialogueKeys.node(currentSessionId, currentNodeId),
          });
          break;

        case 'error':
          setState((prev) => ({
            ...prev,
            error: new Error(event.data.message),
            isProcessing: false,
            processingStatus: null,
          }));
          break;

        case 'message': {
          // Add message to cache
          const newMessage: DialogueMessage = {
            content: event.data.content,
            dialogueId: event.dialogueId,
            id: `msg-${event.data.sequence}-${Date.now()}`,
            metadata: event.data.tokens ? { tokens: event.data.tokens } : undefined,
            role: event.data.role,
            sequence: event.data.sequence,
            timestamp: event.data.timestamp,
          };

          queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(queryKey, (old) => {
            if (!old) {
              return old;
            }

            return {
              ...old,
              pages: old.pages.map((page, index) => {
                if (index === 0) {
                  const existingMessages =
                    event.data.role === 'user'
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
                }
                return page;
              }),
            };
          });
          break;
        }

        case 'processing':
          setState((prev) => ({
            ...prev,
            isProcessing: true,
            processingStatus: 'Processing...',
          }));
          break;

        case 'progress':
          setState((prev) => ({
            ...prev,
            processingStatus: event.data.status,
          }));
          break;
      }
    }

    /**
     * Handle SSE errors with reconnection logic
     */
    function handleError(error: Error) {
      if (isUnmountedRef.current) {
        return;
      }

      setState((prev) => ({
        ...prev,
        error,
        isConnected: false,
      }));

      // Attempt reconnection with exponential backoff
      if (reconnectAttemptRef.current < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptRef.current);
        reconnectAttemptRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isUnmountedRef.current) {
            return;
          }
          // Reconnect by creating a new connection
          connect();
        }, delay);
      }
    }

    /**
     * Handle successful connection
     */
    function handleOpen() {
      if (isUnmountedRef.current) {
        return;
      }
      setState((prev) => ({ ...prev, error: null, isConnected: true }));
      reconnectAttemptRef.current = 0;
    }

    /**
     * Establish connection
     */
    function connect() {
      if (isUnmountedRef.current || !accessToken) {
        return;
      }

      // Cleanup existing connection first
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      cleanupRef.current = dialogueApi.subscribeToStream(
        sessionIdRef.current,
        nodeIdRef.current,
        accessToken,
        handleEvent,
        handleError,
        handleOpen
      );
    }

    // Initial connection
    connect();

    // Cleanup on unmount or dependency change
    return () => {
      isUnmountedRef.current = true;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [enabled, sessionId, nodeId, accessToken, queryClient]);

  return state;
}

/**
 * Fetch node dialogue messages with infinite scroll pagination
 *
 * Implements lazy loading - messages are only fetched when enabled is true.
 * Supports pagination for nodes with many messages.
 *
 * @param sessionId - Canvas session ID
 * @param nodeId - Node identifier (e.g., 'seed', 'soil-0', 'root-1')
 * @param enabled - Whether to enable the query (for lazy loading)
 * @returns Infinite query result with pages of messages
 *
 * @example
 * ```typescript
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage,
 *   isLoading
 * } = useNodeMessages('session-id', 'root-0', true);
 *
 * // Access all messages
 * const allMessages = data?.pages.flatMap(page => page.messages) ?? [];
 *
 * // Load more messages
 * if (hasNextPage) {
 *   fetchNextPage();
 * }
 * ```
 */
export function useNodeMessages(sessionId: string, nodeId: string, enabled = true) {
  return useInfiniteQuery<
    PaginatedMessagesResponse,
    Error,
    InfiniteData<PaginatedMessagesResponse>,
    readonly unknown[],
    number
  >({
    enabled: enabled && !!sessionId && !!nodeId,
    // Use centralized cache time
    gcTime: config.cache.defaultCacheTime,
    getNextPageParam: (lastPage: PaginatedMessagesResponse) => {
      // If there are more pages, return the next page number
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    queryFn: ({ pageParam = 1 }) =>
      dialogueApi.getMessages(sessionId, nodeId, {
        limit: config.pagination.defaultPageSize,
        page: pageParam,
      }),
    queryKey: dialogueKeys.messages(sessionId, nodeId),
    // Dialogue messages don't change often once created
    staleTime: config.cache.defaultStaleTime,
  });
}

/**
 * Send a message to a node dialogue with optimistic updates
 *
 * Optimistically adds the user message to the cache before server confirmation.
 * The actual AI response comes via SSE stream (use useDialogueStream hook).
 * Automatically rolls back on error.
 *
 * @param sessionId - Canvas session ID
 * @param nodeId - Node identifier (e.g., 'seed', 'soil-0', 'root-1')
 * @returns Mutation result with send function
 *
 * @example
 * ```typescript
 * const { mutate: sendMessage, isPending } = useSendNodeMessage('session-id', 'root-0');
 *
 * sendMessage(
 *   { content: 'I believe this assumption is valid because...' },
 *   {
 *     onSuccess: (response) => {
 *       // Message enqueued - AI response will come via SSE
 *       console.log('Job ID:', response.jobId);
 *     },
 *     onError: (error) => {
 *       toast.error('Failed to send message');
 *     }
 *   }
 * );
 * ```
 */
export function useSendNodeMessage(sessionId: string, nodeId: string) {
  const queryClient = useQueryClient();
  const queryKey = dialogueKeys.messages(sessionId, nodeId);

  return useMutation<SendMessageResponse, Error, SendNodeMessageDto, SendMessageContext>({
    mutationFn: (dto: SendNodeMessageDto) => dialogueApi.sendMessage(sessionId, nodeId, dto),

    onError: (_err, _dto, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onMutate: async (dto) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData =
        queryClient.getQueryData<InfiniteData<PaginatedMessagesResponse>>(queryKey);

      const optimisticMessageId = `temp-${Date.now()}`;

      // Optimistically add user message
      if (previousData) {
        const optimisticMessage: DialogueMessage = {
          content: dto.content,
          dialogueId: previousData.pages[0]?.dialogue.id ?? '',
          id: optimisticMessageId,
          role: 'user',
          sequence: (previousData.pages[0]?.dialogue.messageCount ?? 0) + 1,
          timestamp: new Date().toISOString(),
        };

        queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(queryKey, {
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

    // Note: onSuccess no longer updates messages - that's handled by SSE
    onSuccess: () => {
      // Job enqueued successfully - messages will arrive via SSE
    },
  });
}
