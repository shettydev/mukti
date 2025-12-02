/**
 * WebSocket type definitions for real-time messaging
 * Based on Socket.IO client/server event communication
 */

import type { Message } from './conversation.types';

/**
 * Client to Server events - Events that the client can emit to the server
 * @property {(conversationId: string) => void} conversation:join - Join a conversation room
 * @property {(conversationId: string) => void} conversation:leave - Leave a conversation room
 * @property {(data: { content: string; conversationId: string }) => void} message:send - Send a message in a conversation
 * @property {(conversationId: string) => void} typing:start - User started typing
 * @property {(conversationId: string) => void} typing:stop - User stopped typing
 */
export interface ClientToServerEvents {
  'conversation:join': (conversationId: string) => void;
  'conversation:leave': (conversationId: string) => void;
  'message:send': (data: { content: string; conversationId: string }) => void;
  'typing:start': (conversationId: string) => void;
  'typing:stop': (conversationId: string) => void;
}

/**
 * Connection status for WebSocket
 */
export type ConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'error'
  | 'reconnecting';

/**
 * Message processing event data
 * @property {string} [error] - Error message (if failed)
 * @property {string} jobId - Job ID for tracking
 * @property {string} messageId - Message ID being processed
 * @property {number} [position] - Position in queue (if queued)
 * @property {'complete' | 'failed' | 'processing' | 'queued'} status - Current status
 */
export interface MessageProcessingEvent {
  error?: string;
  jobId: string;
  messageId: string;
  position?: number;
  status: 'complete' | 'failed' | 'processing' | 'queued';
}

/**
 * Queued message pending send
 * @property {string} content - Message content
 * @property {string} id - Unique ID for the queued message
 * @property {number} retries - Number of retry attempts
 * @property {number} timestamp - Timestamp when queued
 */
export interface QueuedMessage {
  content: string;
  id: string;
  retries: number;
  timestamp: number;
}

/**
 * Server to Client events - Events that the server can emit to the client
 * @property {(error: { code: string; message: string }) => void} error - Connection error
 * @property {(data: { messageId: string; response: Message }) => void} message:complete - Message processing completed
 * @property {(data: { error: string; messageId: string }) => void} message:error - Message processing failed
 * @property {(message: Message) => void} message:new - New message received
 * @property {(data: MessageProcessingEvent) => void} message:processing - Message processing started
 * @property {(data: TypingEvent) => void} typing:user - Another user is typing
 */
export interface ServerToClientEvents {
  error: (error: { code: string; message: string }) => void;
  'message:complete': (data: { messageId: string; response: Message }) => void;
  'message:error': (data: { error: string; messageId: string }) => void;
  'message:new': (message: Message) => void;
  'message:processing': (data: MessageProcessingEvent) => void;
  'typing:user': (data: TypingEvent) => void;
}

/**
 * Typing event data
 * @property {string} conversationId - Conversation ID
 * @property {string} timestamp - Timestamp
 * @property {string} userId - User ID who is typing
 */
export interface TypingEvent {
  conversationId: string;
  timestamp: string;
  userId: string;
}

/**
 * WebSocket connection error
 * @property {string} code - Error code
 * @property {Record<string, unknown>} [details] - Additional error details
 * @property {string} message - Error message
 */
export interface WebSocketError {
  code: string;
  details?: Record<string, unknown>;
  message: string;
}

/**
 * WebSocket message with metadata
 * @property {string} content - Message content
 * @property {string} conversationId - Conversation ID
 * @property {string} id - Message ID
 * @property {'assistant' | 'user'} role - Message role (user or assistant)
 * @property {number} sequence - Sequence number for ordering
 * @property {string} timestamp - Timestamp
 */
export interface WebSocketMessage {
  content: string;
  conversationId: string;
  id: string;
  role: 'assistant' | 'user';
  sequence: number;
  timestamp: string;
}
