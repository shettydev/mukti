import { Injectable, Logger } from '@nestjs/common';

/**
 * Union type of all possible dialogue stream events.
 */
export type DialogueStreamEvent =
  | DialogueCompleteEvent
  | DialogueErrorEvent
  | DialogueMessageEvent
  | DialogueProcessingEvent
  | DialogueProgressEvent;

/**
 * Base structure for all dialogue SSE events.
 */
interface BaseDialogueStreamEvent {
  data: unknown;
  dialogueId: string;
  nodeId: string;
  sessionId: string;
  timestamp: string;
  type: string;
}

/**
 * Processing complete event.
 */
interface DialogueCompleteEvent extends BaseDialogueStreamEvent {
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
interface DialogueErrorEvent extends BaseDialogueStreamEvent {
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
interface DialogueMessageEvent extends BaseDialogueStreamEvent {
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
interface DialogueProcessingEvent extends BaseDialogueStreamEvent {
  data: {
    jobId: string;
    status: 'started';
  };
  type: 'processing';
}

/**
 * Progress update event.
 */
interface DialogueProgressEvent extends BaseDialogueStreamEvent {
  data: {
    jobId: string;
    position?: number;
    status: string;
  };
  type: 'progress';
}

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
 */
@Injectable()
export class DialogueStreamService {
  /**
   * Map of composite keys (sessionId:nodeId) to arrays of active connections.
   */
  private readonly connections = new Map<string, DialogueStreamConnection[]>();

  private readonly logger = new Logger(DialogueStreamService.name);

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
    const connections = this.connections.get(key);

    if (!connections || connections.length === 0) {
      this.logger.debug(`No active connections for ${key}. Event not emitted.`);
      return;
    }

    const fullEvent: DialogueStreamEvent = {
      ...event,
      dialogueId,
      nodeId,
      sessionId,
      timestamp: new Date().toISOString(),
    } as DialogueStreamEvent;

    this.logger.log(
      `Emitting event to ${key}: type=${event.type}, connections=${connections.length}`,
    );

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
      this.logger.log(`All connections removed for ${key}`);
    } else {
      this.connections.set(key, updatedConnections);
      this.logger.log(
        `Remaining connections for ${key}: ${updatedConnections.length}`,
      );
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getKey(sessionId: string, nodeId: string): string {
    return `${sessionId}:${nodeId}`;
  }
}
