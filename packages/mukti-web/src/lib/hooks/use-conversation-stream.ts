/**
 * TanStack Query hook for managing SSE (Server-Sent Events) connections
 *
 * Provides real-time updates for conversations through SSE:
 * - Automatic connection establishment and cleanup
 * - Connection state management (isConnected, error)
 * - Event parsing and handling
 * - Automatic reconnection with exponential backoff
 * - Authentication credential inclusion
 * - TanStack Query cache updates
 * - Event-specific callbacks for component logic
 *
 * Event Types:
 * - 'processing': Message processing started - use onProcessing to set loading state
 * - 'message': New message received (user or assistant) - use onMessageReceived for message-specific logic
 * - 'complete': Processing completed - use onComplete to clear loading state and update metadata
 * - 'error': Error occurred during processing - use onErrorEvent to show error messages and handle retry
 * - 'progress': Progress update for long-running operations - use onProgress to update progress indicators
 *
 * @example
 * ```typescript
 * const { isConnected, error } = useConversationStream({
 *   conversationId: '507f1f77bcf86cd799439011',
 *   enabled: true,
 *   onProcessing: (event) => {
 *     setIsProcessing(true);
 *     setStatus('AI is thinking...');
 *   },
 *   onMessageReceived: (event) => {
 *     console.log('New message:', event.data.content);
 *   },
 *   onComplete: (event) => {
 *     setIsProcessing(false);
 *     console.log('Processing complete. Tokens:', event.data.tokens);
 *   },
 *   onErrorEvent: (event) => {
 *     setError(event.data.message);
 *     setIsProcessing(false);
 *   },
 *   onProgress: (event) => {
 *     setStatus(event.data.status);
 *     setQueuePosition(event.data.position);
 *   }
 * });
 * ```
 */

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import type { Conversation, Message } from '@/types/conversation.types';

import { config } from '@/lib/config';
import { conversationKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Base stream event structure
 */
export interface BaseStreamEvent {
  conversationId: string;
  timestamp: string;
  type: StreamEventType;
}

/**
 * Complete event - emitted when processing finishes
 */
export interface CompleteEvent extends BaseStreamEvent {
  data: {
    cost: number;
    jobId: string;
    latency: number;
    tokens: number;
  };
  type: 'complete';
}

/**
 * Error event - emitted when an error occurs
 */
export interface ErrorEvent extends BaseStreamEvent {
  data: {
    code: string;
    message: string;
    retriable: boolean;
  };
  type: 'error';
}

/**
 * Message event - emitted when a new message is added
 */
export interface MessageStreamEvent extends BaseStreamEvent {
  data: {
    content: string;
    role: 'assistant' | 'user';
    sequence: number;
    timestamp: string;
    tokens?: number;
  };
  type: 'message';
}

/**
 * Processing event - emitted when message processing starts
 */
export interface ProcessingEvent extends BaseStreamEvent {
  data: {
    jobId: string;
    position?: number;
    status: 'started';
  };
  type: 'processing';
}

/**
 * Progress event - emitted for long-running operations
 */
export interface ProgressEvent extends BaseStreamEvent {
  data: {
    jobId: string;
    position?: number;
    status: string;
  };
  type: 'progress';
}

/**
 * SSE error types
 */
export type SSEErrorType =
  | 'authentication' // 401 - Invalid or missing token
  | 'authorization' // 403 - User doesn't own conversation
  | 'connection' // Network/connection errors
  | 'not_found' // 404 - Conversation not found
  | 'rate_limit' // 429 - Rate limit exceeded
  | 'server'; // 500 - Server error

/**
 * Union type for all stream events
 */
export type StreamEvent =
  | CompleteEvent
  | ErrorEvent
  | MessageStreamEvent
  | ProcessingEvent
  | ProgressEvent;

/**
 * SSE event types
 */
export type StreamEventType = 'complete' | 'error' | 'message' | 'processing' | 'progress';

/**
 * Hook options
 */
export interface UseConversationStreamOptions {
  /**
   * Conversation ID to stream
   */
  conversationId: string;

  /**
   * Whether to enable the SSE connection
   * @default true
   */
  enabled?: boolean;

  /**
   * Callback when processing completes
   * Use this to clear loading state and update metadata
   */
  onComplete?: (event: CompleteEvent) => void;

  /**
   * Custom error handler
   */
  onError?: (error: SSEError) => void;

  /**
   * Callback when an error event is received
   * Use this to show error messages and handle retry logic
   */
  onErrorEvent?: (event: ErrorEvent) => void;

  /**
   * Custom message handler - receives all events
   */
  onMessage?: (event: StreamEvent) => void;

  /**
   * Callback when a new message is received
   * Use this to handle message-specific logic
   */
  onMessageReceived?: (event: MessageStreamEvent) => void;

  /**
   * Callback when processing starts
   * Use this to set loading state in your component
   */
  onProcessing?: (event: ProcessingEvent) => void;

  /**
   * Callback when progress updates are received
   * Use this to update progress indicators
   */
  onProgress?: (event: ProgressEvent) => void;

  /**
   * Callback for rate limit errors
   * Useful for showing rate limit banners
   */
  onRateLimit?: (retryAfter?: number) => void;
}

/**
 * Reconnection configuration
 */
interface ReconnectionConfig {
  attempt: number;
  maxAttempts: number;
  maxDelay: number;
  shouldRetry: boolean;
}

/**
 * Enhanced error with SSE-specific information
 */
export class SSEError extends Error {
  constructor(
    message: string,
    public readonly type: SSEErrorType,
    public readonly statusCode?: number,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'SSEError';
  }
}

/**
 * Hook for managing SSE connection to a conversation
 *
 * Features:
 * - Automatic connection establishment with authentication
 * - Connection state tracking (isConnected, error)
 * - Event parsing and handling
 * - Automatic TanStack Query cache updates
 * - Exponential backoff reconnection (1s, 2s, 4s, 8s, max 30s)
 * - Automatic cleanup on unmount
 *
 * @param options - Hook configuration
 * @returns Connection state and error
 */
export function useConversationStream(options: UseConversationStreamOptions) {
  const {
    conversationId,
    enabled = true,
    onComplete,
    onError,
    onErrorEvent,
    onMessage,
    onMessageReceived,
    onProcessing,
    onProgress,
    onRateLimit,
  } = options;

  const accessToken = useAuthStore((state) => state.accessToken);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<null | SSEError>(null);

  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const callbacksRef = useRef({
    onComplete,
    onError,
    onErrorEvent,
    onMessage,
    onMessageReceived,
    onProcessing,
    onProgress,
    onRateLimit,
  });
  const reconnectionRef = useRef<ReconnectionConfig>({
    attempt: 0,
    maxAttempts: 5,
    maxDelay: 30000,
    shouldRetry: true,
  });
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Keep callback references stable so the SSE effect doesn't reconnect on every render
  useEffect(() => {
    callbacksRef.current = {
      onComplete,
      onError,
      onErrorEvent,
      onMessage,
      onMessageReceived,
      onProcessing,
      onProgress,
      onRateLimit,
    };
  }, [
    onComplete,
    onError,
    onErrorEvent,
    onMessage,
    onMessageReceived,
    onProcessing,
    onProgress,
    onRateLimit,
  ]);

  useEffect(() => {
    // Reset unmounted flag
    isUnmountedRef.current = false;

    // Don't establish connection if disabled or no conversation ID
    if (!enabled || !conversationId) {
      return;
    }

    // Get access token for authentication
    if (!accessToken) {
      const authError = new SSEError('No access token available', 'authentication', 401);
      setError(authError);
      callbacksRef.current.onError?.(authError);
      return;
    }

    /**
     * Handle TanStack Query cache updates and event-specific callbacks
     */
    function handleEvent(event: StreamEvent) {
      switch (event.type) {
        case 'complete': {
          // Update conversation metadata with final stats
          queryClient.setQueryData<Conversation>(conversationKeys.detail(conversationId), (old) => {
            if (!old) {
              return old;
            }

            return {
              ...old,
              metadata: {
                ...old.metadata,
                estimatedCost: old.metadata.estimatedCost + event.data.cost,
                totalTokens: old.metadata.totalTokens + event.data.tokens,
              },
              updatedAt: new Date().toISOString(),
            };
          });

          // Call complete callback for component-specific logic
          // Components can use this to clear loading state
          callbacksRef.current.onComplete?.(event);
          break;
        }

        case 'error': {
          // Call error event callback for component-specific logic
          // Components can use this to show error messages and handle retry
          callbacksRef.current.onErrorEvent?.(event);
          break;
        }

        case 'message': {
          // Update conversation detail with new message
          queryClient.setQueryData<Conversation>(conversationKeys.detail(conversationId), (old) => {
            if (!old) {
              return old;
            }

            const newMessage: Message = {
              content: event.data.content,
              role: event.data.role,
              sequence: event.data.sequence,
              timestamp: event.data.timestamp,
              tokens: event.data.tokens,
            };

            // Check if message already exists (prevent duplicates)
            const messageExists = old.recentMessages.some(
              (msg) => msg.sequence === newMessage.sequence
            );

            if (messageExists) {
              return old;
            }

            return {
              ...old,
              metadata: {
                ...old.metadata,
                lastMessageAt: newMessage.timestamp,
                messageCount: old.metadata.messageCount + 1,
                totalTokens: old.metadata.totalTokens + (newMessage.tokens || 0),
              },
              recentMessages: [...old.recentMessages, newMessage],
              updatedAt: new Date().toISOString(),
            };
          });

          // Invalidate conversation list to update counts
          queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });

          // Call message callback for component-specific logic
          callbacksRef.current.onMessageReceived?.(event);
          break;
        }

        case 'processing': {
          // Call processing callback for component-specific logic
          // Components can use this to set loading state
          callbacksRef.current.onProcessing?.(event);
          break;
        }

        case 'progress': {
          // Call progress callback for component-specific logic
          // Components can use this to update progress indicators
          callbacksRef.current.onProgress?.(event);
          break;
        }
      }
    }

    /**
     * Attempt reconnection with exponential backoff
     */
    function attemptReconnection() {
      const { attempt, maxAttempts, shouldRetry } = reconnectionRef.current;

      // Don't retry if component is unmounted
      if (isUnmountedRef.current) {
        return;
      }

      // Don't retry if explicitly disabled (e.g., for auth/authorization errors)
      if (!shouldRetry) {
        return;
      }

      // Don't retry if we've exceeded max attempts
      if (attempt >= maxAttempts) {
        const maxAttemptsError = new SSEError(
          `Failed to reconnect after ${maxAttempts} attempts`,
          'connection'
        );
        setError(maxAttemptsError);
        callbacksRef.current.onError?.(maxAttemptsError);
        return;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt);

      // Schedule reconnection
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          reconnectionRef.current.attempt += 1;
          connect();
        }
      }, delay);
    }

    /**
     * Parse error from EventSource and determine error type
     */
    async function parseConnectionError(_eventSource: EventSource): Promise<SSEError> {
      // EventSource doesn't expose HTTP status codes directly
      // We need to make a test request to determine the error type
      try {
        const url = new URL(`${config.api.baseUrl}/conversations/${conversationId}/stream`);
        url.searchParams.set('token', accessToken || '');

        const response = await fetch(url.toString(), {
          credentials: 'include',
          headers: {
            Accept: 'text/event-stream',
          },
          method: 'GET',
        });

        const statusCode = response.status;

        // Handle different error types based on status code
        switch (statusCode) {
          case 401:
            // Authentication error - don't retry, redirect to login
            reconnectionRef.current.shouldRetry = false;
            return new SSEError(
              'Authentication failed. Please log in again.',
              'authentication',
              401
            );

          case 403:
            // Authorization error - don't retry, show error
            reconnectionRef.current.shouldRetry = false;
            return new SSEError(
              'You do not have permission to access this conversation.',
              'authorization',
              403
            );

          case 404:
            // Not found error - don't retry, show error
            reconnectionRef.current.shouldRetry = false;
            return new SSEError('Conversation not found.', 'not_found', 404);

          case 429: {
            // Rate limit error - pause reconnection, show banner
            reconnectionRef.current.shouldRetry = false;
            const retryAfter = response.headers.get('Retry-After');
            const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;

            // Call rate limit callback
            callbacksRef.current.onRateLimit?.(retryAfterSeconds);

            return new SSEError(
              'Rate limit exceeded. Please try again later.',
              'rate_limit',
              429,
              retryAfterSeconds
            );
          }

          case 500:
          case 502:
          case 503:
          case 504:
            // Server error - retry with backoff
            reconnectionRef.current.shouldRetry = true;
            return new SSEError('Server error. Retrying connection...', 'server', statusCode);

          default:
            // Unknown error - retry with backoff
            reconnectionRef.current.shouldRetry = true;
            return new SSEError('Connection error. Retrying...', 'connection', statusCode);
        }
      } catch {
        // Network error - retry with backoff
        reconnectionRef.current.shouldRetry = true;
        return new SSEError('Network error. Retrying connection...', 'connection');
      }
    }

    /**
     * Establish SSE connection
     */
    function connect() {
      try {
        // Construct SSE endpoint URL with authentication
        // EventSource doesn't support custom headers, so we pass token as query param
        const url = new URL(`${config.api.baseUrl}/conversations/${conversationId}/stream`);
        url.searchParams.set('token', accessToken || '');

        // Create EventSource connection
        const eventSource = new EventSource(url.toString(), {
          withCredentials: true,
        });

        eventSourceRef.current = eventSource;

        // Handle connection open
        eventSource.onopen = () => {
          if (isUnmountedRef.current) {
            return;
          }

          setIsConnected(true);
          setError(null);
          // Reset reconnection attempts on successful connection
          reconnectionRef.current.attempt = 0;
          reconnectionRef.current.shouldRetry = true;
        };

        // Handle incoming messages
        eventSource.onmessage = (ev: globalThis.MessageEvent) => {
          if (isUnmountedRef.current) {
            return;
          }

          try {
            const event: StreamEvent = JSON.parse(ev.data);

            // Handle event-specific logic and cache updates
            handleEvent(event);

            // Call generic message handler (for backward compatibility)
            callbacksRef.current.onMessage?.(event);
          } catch (parseError) {
            console.error('Failed to parse SSE event:', parseError);
          }
        };

        // Handle errors
        eventSource.onerror = async () => {
          if (isUnmountedRef.current) {
            return;
          }

          setIsConnected(false);

          // Parse the error to determine type and appropriate action
          const connectionError = await parseConnectionError(eventSource);
          setError(connectionError);
          callbacksRef.current.onError?.(connectionError);

          // Close the EventSource to prevent automatic reconnection
          // We'll handle reconnection manually based on error type
          eventSource.close();

          // Attempt reconnection based on error type
          // (parseConnectionError sets shouldRetry appropriately)
          attemptReconnection();
        };
      } catch (err) {
        if (isUnmountedRef.current) {
          return;
        }

        const connectionError = new SSEError(
          err instanceof Error ? err.message : 'Failed to establish connection',
          'connection'
        );
        setError(connectionError);
        callbacksRef.current.onError?.(connectionError);

        // Attempt reconnection for connection establishment errors
        attemptReconnection();
      }
    }

    // Establish initial connection
    connect();

    // Cleanup on unmount
    return () => {
      isUnmountedRef.current = true;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      setIsConnected(false);
    };
  }, [conversationId, accessToken, enabled, queryClient]);

  return {
    error,
    isConnected,
  };
}

/**
 * Calculate exponential backoff delay
 *
 * @param attempt - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoff(attempt: number): number {
  const BASE_DELAY = 1000; // 1 second
  const MAX_DELAY = 30000; // 30 seconds

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
  const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);

  return delay;
}
