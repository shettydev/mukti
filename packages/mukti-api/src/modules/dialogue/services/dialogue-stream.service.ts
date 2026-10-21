import type { NodeDialogueStreamEventContract } from '@muktiai/contracts';

import { Injectable, Logger, Optional } from '@nestjs/common';

import {
  InProcessStreamBus,
  StreamBus,
} from '../../../core/stream-bus/stream-bus';

/** Stream bus namespace for canvas and thought-map node dialogue events. */
const BUS_NAMESPACE = 'dialogue';

/**
 * Any canvas or thought-map node-dialogue stream event. Defined once in the
 * shared wire contract so the web client is type-checked against it.
 */
export type DialogueStreamEvent = NodeDialogueStreamEventContract;

/**
 * Represents an active SSE connection for a node dialogue.
 */
interface DialogueStreamConnection {
  connectionId: string;
  emitFn: (event: DialogueStreamEvent) => void;
  nodeId: string;
  sessionId: string;
  userId: string;
}

/**
 * Service responsible for managing SSE connections for node dialogue real-time updates.
 *
 * @remarks
 * Uses a composite key of sessionId:nodeId to manage connections per node dialogue.
 * Emitting publishes to the {@link StreamBus}, so the instance holding the
 * client's connection delivers the event wherever the job ran.
 */
@Injectable()
export class DialogueStreamService {
  private readonly bus: StreamBus;

  /**
   * Map of composite keys (sessionId:nodeId) to arrays of active connections.
   */
  private readonly connections = new Map<string, DialogueStreamConnection[]>();

  private readonly logger = new Logger(DialogueStreamService.name);

  constructor(@Optional() bus?: StreamBus) {
    this.bus = bus ?? new InProcessStreamBus();
    this.bus.listen(BUS_NAMESPACE, (key, event) =>
      this.deliver(key, event as DialogueStreamEvent),
    );
  }

  /**
   * Registers a new SSE connection for a node dialogue.
   */
  addConnection(
    sessionId: string,
    nodeId: string,
    userId: string,
    connectionId: string,
    emitFn: (event: DialogueStreamEvent) => void,
  ): void {
    const key = this.getKey(sessionId, nodeId);
    this.logger.log(
      `Adding SSE connection: sessionId=${sessionId}, nodeId=${nodeId}, connectionId=${connectionId}`,
    );

    const connection: DialogueStreamConnection = {
      connectionId,
      emitFn,
      nodeId,
      sessionId,
      userId,
    };

    const existingConnections = this.connections.get(key) ?? [];
    // First local connection for this stream: start receiving its events.
    if (existingConnections.length === 0) {
      void this.bus.track(BUS_NAMESPACE, key);
    }
    existingConnections.push(connection);
    this.connections.set(key, existingConnections);

    this.logger.log(
      `SSE connection added. Total connections for ${key}: ${existingConnections.length}`,
    );
  }

  /**
   * Removes all connections for a specific node dialogue.
   */
  cleanupNodeDialogue(sessionId: string, nodeId: string): void {
    const key = this.getKey(sessionId, nodeId);
    this.logger.log(`Cleaning up all connections for ${key}`);

    const connections = this.connections.get(key);
    if (!connections || connections.length === 0) {
      return;
    }

    this.connections.delete(key);
    this.bus.untrack(BUS_NAMESPACE, key);
    this.logger.log(
      `Cleaned up ${connections.length} connection(s) for ${key}`,
    );
  }

  /**
   * Emits an event to all active connections for a specific node dialogue.
   */
  emitToNodeDialogue(
    sessionId: string,
    nodeId: string,
    dialogueId: string,
    event: Omit<
      DialogueStreamEvent,
      'dialogueId' | 'nodeId' | 'sessionId' | 'timestamp'
    >,
  ): void {
    const key = this.getKey(sessionId, nodeId);
    const fullEvent: DialogueStreamEvent = {
      ...event,
      dialogueId,
      nodeId,
      sessionId,
      timestamp: new Date().toISOString(),
    } as DialogueStreamEvent;

    this.bus.publish(BUS_NAMESPACE, key, fullEvent);
  }

  /**
   * Gets the total number of active connections.
   */
  getConnectionCount(): number {
    let total = 0;
    for (const connections of this.connections.values()) {
      total += connections.length;
    }
    return total;
  }

  /**
   * Gets the number of active connections for a specific node dialogue.
   */
  getNodeDialogueConnectionCount(sessionId: string, nodeId: string): number {
    const key = this.getKey(sessionId, nodeId);
    const connections = this.connections.get(key);
    return connections ? connections.length : 0;
  }

  /**
   * Removes a specific SSE connection.
   */
  removeConnection(
    sessionId: string,
    nodeId: string,
    connectionId: string,
  ): void {
    const key = this.getKey(sessionId, nodeId);
    this.logger.log(
      `Removing SSE connection: ${key}, connectionId=${connectionId}`,
    );

    const existingConnections = this.connections.get(key);
    if (!existingConnections) {
      return;
    }

    const updatedConnections = existingConnections.filter(
      (conn) => conn.connectionId !== connectionId,
    );

    if (updatedConnections.length === 0) {
      this.connections.delete(key);
      this.bus.untrack(BUS_NAMESPACE, key);
      this.logger.log(`All connections removed for ${key}`);
    } else {
      this.connections.set(key, updatedConnections);
      this.logger.log(
        `Remaining connections for ${key}: ${updatedConnections.length}`,
      );
    }
  }

  /** Delivers a bus event to the connections this instance holds. */
  private deliver(key: string, fullEvent: DialogueStreamEvent): void {
    const connections = this.connections.get(key);

    if (!connections || connections.length === 0) {
      return;
    }

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
        );
      }
    }

    this.logger.log(
      `Event emitted to ${key}: success=${successCount}, errors=${errorCount}`,
    );
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getKey(sessionId: string, nodeId: string): string {
    return `${sessionId}:${nodeId}`;
  }
}
