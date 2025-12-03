import { Injectable, Logger } from '@nestjs/common';

/**
 * Union type of all possible stream events.
 */
export type StreamEvent =
  | CompleteEvent
  | ErrorEvent
  | MessageEvent
  | ProcessingEvent
  | ProgressEvent;

/**
 * Base structure for all SSE events.
 *
 * @property conversationId - The conversation this event relates to
 * @property data - Event-specific payload data
 * @property timestamp - ISO 8601 timestamp when the event was created
 * @property type - The type of event being emitted
 */
interface BaseStreamEvent {
  conversationId: string;
  data: unknown;
  timestamp: string;
  type: string;
}

/**
 * Processing complete event.
 */
interface CompleteEvent extends BaseStreamEvent {
  data: {
    cost: number;
    jobId: string;
    latency: number;
    tokens: number;
  };
  type: 'complete';
}

/**
 * Error occurred event.
 */
interface ErrorEvent extends BaseStreamEvent {
  data: {
    code: string;
    message: string;
    retriable: boolean;
  };
  type: 'error';
}

/**
 * New message received event.
 */
interface MessageEvent extends BaseStreamEvent {
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
 * Processing started event.
 */
interface ProcessingEvent extends BaseStreamEvent {
  data: {
    jobId: string;
    status: 'started';
  };
  type: 'processing';
}

/**
 * Progress update event.
 */
interface ProgressEvent extends BaseStreamEvent {
  data: {
    jobId: string;
    position?: number;
    status: string;
  };
  type: 'progress';
}

/**
 * Represents an active SSE connection for a conversation.
 *
 * @property connectionId - Unique identifier for this specific connection
 * @property conversationId - The ID of the conversation this connection is subscribed to
 * @property emitFn - Function to emit events to this connection
 * @property userId - The ID of the user who owns this connection
 */
interface StreamConnection {
  connectionId: string;
  conversationId: string;
  emitFn: (event: StreamEvent) => void;
  userId: string;
}

/**
 * Service responsible for managing Server-Sent Events (SSE) connections for real-time conversation updates.
 * Handles connection lifecycle, event emission, and cleanup for multiple concurrent connections.
 *
 * @remarks
 * This service implements SSE connection management with:
 * - Multiple concurrent connections per conversation
 * - User-specific and conversation-wide event broadcasting
 * - Automatic connection cleanup on disconnect
 * - Proper logging for connection lifecycle events
 * - Thread-safe connection storage using Map data structure
 *
 * The service uses a Map<conversationId, StreamConnection[]> structure to efficiently
 * manage multiple connections per conversation while maintaining O(1) lookup performance.
 */
@Injectable()
export class StreamService {
  /**
   * Map of conversation IDs to arrays of active connections.
   * Key: conversationId
   * Value: Array of StreamConnection objects for that conversation
   */
  private readonly connections = new Map<string, StreamConnection[]>();

  private readonly logger = new Logger(StreamService.name);

  /**
   * Registers a new SSE connection for a conversation.
   * Multiple connections can exist for the same conversation (e.g., multiple browser tabs).
   *
   * @param conversationId - The ID of the conversation to subscribe to
   * @param userId - The ID of the user establishing the connection
   * @param connectionId - Unique identifier for this specific connection
   * @param emitFn - Function to call when emitting events to this connection
   *
   * @remarks
   * This method:
   * - Creates a new StreamConnection object
   * - Adds it to the connections map
   * - Logs the connection establishment
   * - Supports multiple concurrent connections per conversation
   *
   * @example
   * ```typescript
   * streamService.addConnection(
   *   'conv-123',
   *   'user-456',
   *   'conn-789',
   *   (event) => observer.next(event)
   * );
   * ```
   */
  addConnection(
    conversationId: string,
    userId: string,
    connectionId: string,
    emitFn: (event: StreamEvent) => void,
  ): void {
    this.logger.log(
      `Adding SSE connection: conversationId=${conversationId}, userId=${userId}, connectionId=${connectionId}`,
    );

    const connection: StreamConnection = {
      connectionId,
      conversationId,
      emitFn,
      userId,
    };

    // Get existing connections for this conversation or create new array
    const existingConnections = this.connections.get(conversationId) ?? [];

    // Add new connection to the array
    existingConnections.push(connection);

    // Update the map
    this.connections.set(conversationId, existingConnections);

    this.logger.log(
      `SSE connection added successfully. Total connections for conversation ${conversationId}: ${existingConnections.length}`,
    );
  }

  /**
   * Removes all connections for a specific conversation.
   * This is used for cleanup when a conversation is deleted or needs to be reset.
   *
   * @param conversationId - The ID of the conversation to clean up
   *
   * @remarks
   * This method:
   * - Removes all connections for the conversation from the map
   * - Logs the cleanup operation
   * - Handles cases where the conversation has no connections
   *
   * Use cases:
   * - Conversation deletion
   * - Server shutdown cleanup
   * - Administrative actions
   *
   * @example
   * ```typescript
   * streamService.cleanupConversation('conv-123');
   * ```
   */
  cleanupConversation(conversationId: string): void {
    this.logger.log(
      `Cleaning up all connections for conversation ${conversationId}`,
    );

    const connections = this.connections.get(conversationId);

    if (!connections || connections.length === 0) {
      this.logger.debug(
        `No connections to clean up for conversation ${conversationId}`,
      );
      return;
    }

    const connectionCount = connections.length;

    // Remove all connections for this conversation
    this.connections.delete(conversationId);

    this.logger.log(
      `Cleaned up ${connectionCount} connection(s) for conversation ${conversationId}`,
    );
  }

  /**
   * Emits an event to all active connections for a specific conversation.
   * This is used for broadcasting events that all clients viewing the conversation should receive.
   *
   * @param conversationId - The ID of the conversation to broadcast to
   * @param event - The event to emit (without timestamp and conversationId, which are added automatically)
   *
   * @remarks
   * This method:
   * - Adds timestamp and conversationId to the event
   * - Broadcasts to all connections for the conversation
   * - Handles errors gracefully if a connection fails
   * - Logs the emission and any errors
   *
   * @example
   * ```typescript
   * streamService.emitToConversation('conv-123', {
   *   type: 'message',
   *   data: {
   *     role: 'assistant',
   *     content: 'What do you mean by that?',
   *     timestamp: new Date().toISOString(),
   *     sequence: 5
   *   }
   * });
   * ```
   */
  emitToConversation(
    conversationId: string,
    event: Omit<StreamEvent, 'conversationId' | 'timestamp'>,
  ): void {
    const connections = this.connections.get(conversationId);

    if (!connections || connections.length === 0) {
      this.logger.debug(
        `No active connections for conversation ${conversationId}. Event not emitted.`,
      );
      return;
    }

    // Add timestamp and conversationId to the event
    const fullEvent: StreamEvent = {
      ...event,
      conversationId,
      timestamp: new Date().toISOString(),
    } as StreamEvent;

    this.logger.log(
      `Emitting event to conversation ${conversationId}: type=${event.type}, connections=${connections.length}`,
    );

    // Emit to all connections for this conversation
    let successCount = 0;
    let errorCount = 0;

    for (const connection of connections) {
      try {
        connection.emitFn(fullEvent);
        successCount++;
      } catch (error) {
        errorCount++;
        this.logger.error(
          `Failed to emit event to connection ${connection.connectionId}: ${this.getErrorMessage(error)}`,
          this.getErrorStack(error),
        );
      }
    }

    this.logger.log(
      `Event emitted to conversation ${conversationId}: success=${successCount}, errors=${errorCount}`,
    );
  }

  /**
   * Emits an event to a specific user's connection within a conversation.
   * This is used for user-specific events that shouldn't be broadcast to all clients.
   *
   * @param conversationId - The ID of the conversation
   * @param userId - The ID of the user to send the event to
   * @param event - The event to emit (without timestamp and conversationId, which are added automatically)
   *
   * @remarks
   * This method:
   * - Finds all connections for the user in the conversation
   * - Adds timestamp and conversationId to the event
   * - Emits only to the user's connections
   * - Handles errors gracefully if a connection fails
   *
   * Use cases:
   * - User-specific error messages
   * - Personal notifications
   * - Rate limit warnings
   *
   * @example
   * ```typescript
   * streamService.emitToUser('conv-123', 'user-456', {
   *   type: 'error',
   *   data: {
   *     code: 'RATE_LIMIT_EXCEEDED',
   *     message: 'You have exceeded your rate limit',
   *     retriable: true
   *   }
   * });
   * ```
   */
  emitToUser(
    conversationId: string,
    userId: string,
    event: Omit<StreamEvent, 'conversationId' | 'timestamp'>,
  ): void {
    const connections = this.connections.get(conversationId);

    if (!connections || connections.length === 0) {
      this.logger.debug(
        `No active connections for conversation ${conversationId}. Event not emitted.`,
      );
      return;
    }

    // Filter connections for the specific user
    const userConnections = connections.filter(
      (conn) => conn.userId === userId,
    );

    if (userConnections.length === 0) {
      this.logger.debug(
        `No active connections for user ${userId} in conversation ${conversationId}. Event not emitted.`,
      );
      return;
    }

    // Add timestamp and conversationId to the event
    const fullEvent: StreamEvent = {
      ...event,
      conversationId,
      timestamp: new Date().toISOString(),
    } as StreamEvent;

    this.logger.log(
      `Emitting event to user ${userId} in conversation ${conversationId}: type=${event.type}, connections=${userConnections.length}`,
    );

    // Emit to all of the user's connections
    let successCount = 0;
    let errorCount = 0;

    for (const connection of userConnections) {
      try {
        connection.emitFn(fullEvent);
        successCount++;
      } catch (error) {
        errorCount++;
        this.logger.error(
          `Failed to emit event to connection ${connection.connectionId}: ${this.getErrorMessage(error)}`,
          this.getErrorStack(error),
        );
      }
    }

    this.logger.log(
      `Event emitted to user ${userId}: success=${successCount}, errors=${errorCount}`,
    );
  }

  /**
   * Gets the total number of active connections across all conversations.
   * Useful for monitoring and debugging.
   *
   * @returns The total number of active SSE connections
   *
   * @example
   * ```typescript
   * const count = streamService.getConnectionCount();
   * console.log(`Active connections: ${count}`);
   * ```
   */
  getConnectionCount(): number {
    let total = 0;
    for (const connections of this.connections.values()) {
      total += connections.length;
    }
    return total;
  }

  /**
   * Gets the number of active connections for a specific conversation.
   * Useful for monitoring and debugging.
   *
   * @param conversationId - The ID of the conversation
   * @returns The number of active connections for the conversation
   *
   * @example
   * ```typescript
   * const count = streamService.getConversationConnectionCount('conv-123');
   * console.log(`Connections for conversation: ${count}`);
   * ```
   */
  getConversationConnectionCount(conversationId: string): number {
    const connections = this.connections.get(conversationId);
    return connections ? connections.length : 0;
  }

  /**
   * Removes a specific SSE connection when a client disconnects.
   * Cleans up the connection from the connections map and releases resources.
   *
   * @param conversationId - The ID of the conversation
   * @param connectionId - The unique identifier of the connection to remove
   *
   * @remarks
   * This method:
   * - Finds and removes the specific connection from the array
   * - Removes the conversation entry if no connections remain
   * - Logs the disconnection event
   * - Handles cases where the conversation or connection doesn't exist
   *
   * Requirements: 2.4
   *
   * @example
   * ```typescript
   * streamService.removeConnection('conv-123', 'conn-789');
   * ```
   */
  removeConnection(conversationId: string, connectionId: string): void {
    this.logger.log(
      `Removing SSE connection: conversationId=${conversationId}, connectionId=${connectionId}`,
    );

    const existingConnections = this.connections.get(conversationId);

    if (!existingConnections) {
      this.logger.warn(
        `No connections found for conversation ${conversationId}`,
      );
      return;
    }

    // Filter out the connection to remove
    const updatedConnections = existingConnections.filter(
      (conn) => conn.connectionId !== connectionId,
    );

    if (updatedConnections.length === existingConnections.length) {
      this.logger.warn(
        `Connection ${connectionId} not found in conversation ${conversationId}`,
      );
      return;
    }

    // Update or remove the conversation entry
    if (updatedConnections.length === 0) {
      this.connections.delete(conversationId);
      this.logger.log(
        `All connections removed for conversation ${conversationId}. Entry deleted from map.`,
      );
    } else {
      this.connections.set(conversationId, updatedConnections);
      this.logger.log(
        `SSE connection removed. Remaining connections for conversation ${conversationId}: ${updatedConnections.length}`,
      );
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
