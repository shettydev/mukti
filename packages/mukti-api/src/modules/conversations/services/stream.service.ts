import type { ConversationStreamEventContract } from '@muktiai/contracts';

import { Injectable, Logger, Optional } from '@nestjs/common';

import {
  InProcessStreamBus,
  StreamBus,
} from '../../../core/stream-bus/stream-bus';

/** Stream bus namespace for chat conversation events. */
const BUS_NAMESPACE = 'conversation';

/**
 * Any chat conversation stream event. Defined once in the shared wire
 * contract so the web client is type-checked against the same shape.
 */
export type StreamEvent = ConversationStreamEventContract;

/** What travels over the bus: the event, plus an optional target user. */
interface ConversationBusMessage {
  event: StreamEvent;
  userId?: string;
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
 *
 * Emitting publishes to the {@link StreamBus}; every instance delivers the
 * event to the connections it holds. So a job may run on any worker and the
 * client may be connected to any API instance.
 */
@Injectable()
export class StreamService {
  private readonly bus: StreamBus;

  /**
   * Map of conversation IDs to arrays of active connections.
   * Key: conversationId
   * Value: Array of StreamConnection objects for that conversation
   */
  private readonly connections = new Map<string, StreamConnection[]>();

  private readonly logger = new Logger(StreamService.name);

  constructor(@Optional() bus?: StreamBus) {
    this.bus = bus ?? new InProcessStreamBus();
    this.bus.listen(BUS_NAMESPACE, (conversationId, message) => {
      const { event, userId } = message as ConversationBusMessage;
      this.deliver(conversationId, event, userId);
    });
  }

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

    // First local connection for this stream: start receiving its events.
    if (existingConnections.length === 0) {
      void this.bus.track(BUS_NAMESPACE, conversationId);
    }

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
    this.bus.untrack(BUS_NAMESPACE, conversationId);

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
    this.publish(conversationId, event);
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
    this.publish(conversationId, event, userId);
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
      this.bus.untrack(BUS_NAMESPACE, conversationId);
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

  /**
   * Delivers an event to the connections this instance holds for a
   * conversation (optionally only one user's). Called for every bus message.
   */
  private deliver(
    conversationId: string,
    event: StreamEvent,
    userId?: string,
  ): void {
    const connections = (this.connections.get(conversationId) ?? []).filter(
      (conn) => userId === undefined || conn.userId === userId,
    );

    if (connections.length === 0) {
      return;
    }

    let errorCount = 0;
    for (const connection of connections) {
      try {
        connection.emitFn(event);
      } catch (error) {
        errorCount++;
        this.logger.error(
          `Failed to emit event to connection ${connection.connectionId}: ${this.getErrorMessage(error)}`,
          this.getErrorStack(error),
        );
      }
    }

    this.logger.debug(
      `Delivered ${event.type} to conversation ${conversationId}: success=${connections.length - errorCount}, errors=${errorCount}`,
    );
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

  /** Stamps the event and hands it to the bus for every instance. */
  private publish(
    conversationId: string,
    event: Omit<StreamEvent, 'conversationId' | 'timestamp'>,
    userId?: string,
  ): void {
    const fullEvent = {
      ...event,
      conversationId,
      timestamp: new Date().toISOString(),
    } as StreamEvent;

    this.bus.publish(BUS_NAMESPACE, conversationId, {
      event: fullEvent,
      userId,
    } satisfies ConversationBusMessage);
  }
}
