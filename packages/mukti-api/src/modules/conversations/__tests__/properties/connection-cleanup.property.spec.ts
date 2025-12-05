import { Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { Types } from 'mongoose';

import { type StreamEvent, StreamService } from '../../services/stream.service';

/**
 * Property-Based Tests for Connection Cleanup
 *
 * Feature: sse-real-time-messages, Connection Cleanup
 *
 * For any SSE connection that is closed (by client or server), the system should
 * remove the connection from the active connections map and release all associated resources.
 */
describe('StreamService - Connection Cleanup (Property-Based)', () => {
  let streamService: StreamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamService],
    }).compile();

    streamService = module.get<StreamService>(StreamService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Connection Cleanup
   *
   * For any SSE connection that is closed (by client or server), the system should
   * remove the connection from the active connections map and release all associated resources.
   */
  describe('Connection Cleanup', () => {
    it('should remove a specific connection and maintain other connections', () => {
      fc.assert(
        fc.property(
          fc.record({
            // Which connection to remove (0-indexed)
            connectionToRemove: fc.nat(),
            // Generate a conversation ID
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            // Generate 2-10 connections
            numConnections: fc.integer({ max: 10, min: 2 }),
          }),
          ({ connectionToRemove, conversationId, numConnections }) => {
            // Ensure connectionToRemove is within bounds
            const removeIndex = connectionToRemove % numConnections;

            // Track which connections received events
            const receivedEvents: StreamEvent[][] = Array.from(
              { length: numConnections },
              () => [],
            );

            const emitFunctions = receivedEvents.map(
              (eventArray) => (event: StreamEvent) => {
                eventArray.push(event);
              },
            );

            const connectionIds: string[] = [];

            // Add all connections
            for (let i = 0; i < numConnections; i++) {
              const userId = new Types.ObjectId().toString();
              const connectionId = `conn-${i}`;
              connectionIds.push(connectionId);

              streamService.addConnection(
                conversationId,
                userId,
                connectionId,
                emitFunctions[i],
              );
            }

            // Verify all connections are active
            expect(
              streamService.getConversationConnectionCount(conversationId),
            ).toBe(numConnections);

            // Emit an event to verify all connections work
            streamService.emitToConversation(conversationId, {
              data: {
                content: 'Test message before removal',
                role: 'assistant',
                sequence: 0,
                timestamp: new Date().toISOString(),
              },
              type: 'message',
            });

            // All connections should have received the event
            for (let i = 0; i < numConnections; i++) {
              expect(receivedEvents[i].length).toBe(1);
            }

            // Remove the specific connection
            streamService.removeConnection(
              conversationId,
              connectionIds[removeIndex],
            );

            // Verify connection count decreased by 1
            expect(
              streamService.getConversationConnectionCount(conversationId),
            ).toBe(numConnections - 1);

            // Emit another event
            streamService.emitToConversation(conversationId, {
              data: {
                content: 'Test message after removal',
                role: 'assistant',
                sequence: 1,
                timestamp: new Date().toISOString(),
              },
              type: 'message',
            });

            // Verify the removed connection did NOT receive the second event
            expect(receivedEvents[removeIndex].length).toBe(1);

            // Verify all other connections DID receive the second event
            for (let i = 0; i < numConnections; i++) {
              if (i === removeIndex) {
                expect(receivedEvents[i].length).toBe(1);
              } else {
                expect(receivedEvents[i].length).toBe(2);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should remove all connections when cleanupConversation is called', () => {
      fc.assert(
        fc.property(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            numConnections: fc.integer({ max: 10, min: 1 }),
          }),
          ({ conversationId, numConnections }) => {
            const receivedEvents: StreamEvent[][] = Array.from(
              { length: numConnections },
              () => [],
            );

            const emitFunctions = receivedEvents.map(
              (eventArray) => (event: StreamEvent) => {
                eventArray.push(event);
              },
            );

            // Add connections
            for (let i = 0; i < numConnections; i++) {
              streamService.addConnection(
                conversationId,
                new Types.ObjectId().toString(),
                `conn-${i}`,
                emitFunctions[i],
              );
            }

            // Verify connections are active
            expect(
              streamService.getConversationConnectionCount(conversationId),
            ).toBe(numConnections);

            // Emit an event before cleanup
            streamService.emitToConversation(conversationId, {
              data: {
                content: 'Message before cleanup',
                role: 'assistant',
                sequence: 0,
                timestamp: new Date().toISOString(),
              },
              type: 'message',
            });

            // All connections should have received the event
            for (const events of receivedEvents) {
              expect(events.length).toBe(1);
            }

            // Clean up all connections
            streamService.cleanupConversation(conversationId);

            // Verify no connections remain
            expect(
              streamService.getConversationConnectionCount(conversationId),
            ).toBe(0);

            // Emit an event after cleanup
            streamService.emitToConversation(conversationId, {
              data: {
                content: 'Message after cleanup',
                role: 'assistant',
                sequence: 1,
                timestamp: new Date().toISOString(),
              },
              type: 'message',
            });

            // No connections should have received the second event
            for (const events of receivedEvents) {
              expect(events.length).toBe(1);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle removing the last connection and clean up the conversation entry', () => {
      fc.assert(
        fc.property(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
          }),
          ({ conversationId }) => {
            const receivedEvents: StreamEvent[] = [];
            const emitFn = (event: StreamEvent) => {
              receivedEvents.push(event);
            };

            const userId = new Types.ObjectId().toString();
            const connectionId = 'conn-single';

            // Add a single connection
            streamService.addConnection(
              conversationId,
              userId,
              connectionId,
              emitFn,
            );

            // Verify connection is active
            expect(
              streamService.getConversationConnectionCount(conversationId),
            ).toBe(1);

            // Emit an event
            streamService.emitToConversation(conversationId, {
              data: {
                content: 'Test message',
                role: 'assistant',
                sequence: 0,
                timestamp: new Date().toISOString(),
              },
              type: 'message',
            });

            expect(receivedEvents.length).toBe(1);

            // Remove the only connection
            streamService.removeConnection(conversationId, connectionId);

            // Verify no connections remain
            expect(
              streamService.getConversationConnectionCount(conversationId),
            ).toBe(0);

            // Emit another event - should not be received
            streamService.emitToConversation(conversationId, {
              data: {
                content: 'Message after removal',
                role: 'assistant',
                sequence: 1,
                timestamp: new Date().toISOString(),
              },
              type: 'message',
            });

            // Should still only have the first event
            expect(receivedEvents.length).toBe(1);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle removing connections in sequence until none remain', () => {
      fc.assert(
        fc.property(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            numConnections: fc.integer({ max: 8, min: 2 }),
          }),
          ({ conversationId, numConnections }) => {
            const receivedEvents: StreamEvent[][] = Array.from(
              { length: numConnections },
              () => [],
            );

            const emitFunctions = receivedEvents.map(
              (eventArray) => (event: StreamEvent) => {
                eventArray.push(event);
              },
            );

            const connectionIds: string[] = [];

            // Add all connections
            for (let i = 0; i < numConnections; i++) {
              const connectionId = `conn-${conversationId}-${i}`;
              connectionIds.push(connectionId);

              streamService.addConnection(
                conversationId,
                new Types.ObjectId().toString(),
                connectionId,
                emitFunctions[i],
              );
            }

            // Verify all connections are active
            expect(
              streamService.getConversationConnectionCount(conversationId),
            ).toBe(numConnections);

            // Emit an initial event that all connections should receive
            streamService.emitToConversation(conversationId, {
              data: {
                content: 'Initial message',
                role: 'assistant',
                sequence: 0,
                timestamp: new Date().toISOString(),
              },
              type: 'message',
            });

            // All connections should have received the initial event
            for (let i = 0; i < numConnections; i++) {
              expect(receivedEvents[i].length).toBe(1);
            }

            // Remove connections one by one
            for (let i = 0; i < numConnections; i++) {
              const expectedRemaining = numConnections - i;

              // Verify count before removal
              expect(
                streamService.getConversationConnectionCount(conversationId),
              ).toBe(expectedRemaining);

              // Remove the connection
              streamService.removeConnection(conversationId, connectionIds[i]);

              // Verify count after removal
              expect(
                streamService.getConversationConnectionCount(conversationId),
              ).toBe(expectedRemaining - 1);
            }

            // Verify no connections remain
            expect(
              streamService.getConversationConnectionCount(conversationId),
            ).toBe(0);

            // Emit a final event - no one should receive it
            streamService.emitToConversation(conversationId, {
              data: {
                content: 'Final message',
                role: 'assistant',
                sequence: 1,
                timestamp: new Date().toISOString(),
              },
              type: 'message',
            });

            // Verify no connection received the final event (all should still have only 1 event)
            for (let i = 0; i < numConnections; i++) {
              expect(receivedEvents[i].length).toBe(1);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should handle removing non-existent connections gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            numConnections: fc.integer({ max: 5, min: 1 }),
          }),
          ({ conversationId, numConnections }) => {
            const receivedEvents: StreamEvent[][] = Array.from(
              { length: numConnections },
              () => [],
            );

            const emitFunctions = receivedEvents.map(
              (eventArray) => (event: StreamEvent) => {
                eventArray.push(event);
              },
            );

            // Add connections
            for (let i = 0; i < numConnections; i++) {
              streamService.addConnection(
                conversationId,
                new Types.ObjectId().toString(),
                `conn-${i}`,
                emitFunctions[i],
              );
            }

            const initialCount =
              streamService.getConversationConnectionCount(conversationId);
            expect(initialCount).toBe(numConnections);

            // Try to remove a non-existent connection
            streamService.removeConnection(
              conversationId,
              'non-existent-connection-id',
            );

            // Verify count hasn't changed
            expect(
              streamService.getConversationConnectionCount(conversationId),
            ).toBe(initialCount);

            // Emit an event to verify all connections still work
            streamService.emitToConversation(conversationId, {
              data: {
                content: 'Test message',
                role: 'assistant',
                sequence: 0,
                timestamp: new Date().toISOString(),
              },
              type: 'message',
            });

            // All connections should have received the event
            for (const events of receivedEvents) {
              expect(events.length).toBe(1);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle cleanup of non-existent conversations gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
          }),
          ({ conversationId }) => {
            // Verify no connections exist
            expect(
              streamService.getConversationConnectionCount(conversationId),
            ).toBe(0);

            // Try to cleanup a conversation with no connections
            // This should not throw an error
            expect(() => {
              streamService.cleanupConversation(conversationId);
            }).not.toThrow();

            // Verify count is still 0
            expect(
              streamService.getConversationConnectionCount(conversationId),
            ).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should properly isolate connections across different conversations', () => {
      fc.assert(
        fc.property(
          fc.record({
            connectionsPerConversation: fc.integer({ max: 4, min: 1 }),
            conversationToCleanup: fc.nat(),
            numConversations: fc.integer({ max: 5, min: 2 }),
          }),
          ({
            connectionsPerConversation,
            conversationToCleanup,
            numConversations,
          }) => {
            const cleanupIndex = conversationToCleanup % numConversations;

            // Create multiple conversations with connections
            const conversationIds: string[] = [];
            const allReceivedEvents: StreamEvent[][][] = [];

            for (let convIdx = 0; convIdx < numConversations; convIdx++) {
              const conversationId = new Types.ObjectId().toString();
              conversationIds.push(conversationId);

              const receivedEvents: StreamEvent[][] = Array.from(
                { length: connectionsPerConversation },
                () => [],
              );
              allReceivedEvents.push(receivedEvents);

              const emitFunctions = receivedEvents.map(
                (eventArray) => (event: StreamEvent) => {
                  eventArray.push(event);
                },
              );

              // Add connections for this conversation
              for (
                let connIdx = 0;
                connIdx < connectionsPerConversation;
                connIdx++
              ) {
                streamService.addConnection(
                  conversationId,
                  new Types.ObjectId().toString(),
                  `conv-${convIdx}-conn-${connIdx}`,
                  emitFunctions[connIdx],
                );
              }

              // Verify connections are active
              expect(
                streamService.getConversationConnectionCount(conversationId),
              ).toBe(connectionsPerConversation);
            }

            // Emit events to all conversations
            for (let convIdx = 0; convIdx < numConversations; convIdx++) {
              streamService.emitToConversation(conversationIds[convIdx], {
                data: {
                  content: `Message for conversation ${convIdx}`,
                  role: 'assistant',
                  sequence: 0,
                  timestamp: new Date().toISOString(),
                },
                type: 'message',
              });
            }

            // Verify all connections received their events
            for (let convIdx = 0; convIdx < numConversations; convIdx++) {
              for (
                let connIdx = 0;
                connIdx < connectionsPerConversation;
                connIdx++
              ) {
                expect(allReceivedEvents[convIdx][connIdx].length).toBe(1);
              }
            }

            // Cleanup one specific conversation
            streamService.cleanupConversation(conversationIds[cleanupIndex]);

            // Verify the cleaned up conversation has no connections
            expect(
              streamService.getConversationConnectionCount(
                conversationIds[cleanupIndex],
              ),
            ).toBe(0);

            // Verify other conversations still have their connections
            for (let convIdx = 0; convIdx < numConversations; convIdx++) {
              if (convIdx !== cleanupIndex) {
                expect(
                  streamService.getConversationConnectionCount(
                    conversationIds[convIdx],
                  ),
                ).toBe(connectionsPerConversation);
              }
            }

            // Emit events to all conversations again
            for (let convIdx = 0; convIdx < numConversations; convIdx++) {
              streamService.emitToConversation(conversationIds[convIdx], {
                data: {
                  content: `Second message for conversation ${convIdx}`,
                  role: 'assistant',
                  sequence: 1,
                  timestamp: new Date().toISOString(),
                },
                type: 'message',
              });
            }

            // Verify cleaned up conversation's connections did NOT receive the second event
            for (
              let connIdx = 0;
              connIdx < connectionsPerConversation;
              connIdx++
            ) {
              expect(allReceivedEvents[cleanupIndex][connIdx].length).toBe(1);
            }

            // Verify other conversations' connections DID receive the second event
            for (let convIdx = 0; convIdx < numConversations; convIdx++) {
              if (convIdx !== cleanupIndex) {
                for (
                  let connIdx = 0;
                  connIdx < connectionsPerConversation;
                  connIdx++
                ) {
                  expect(allReceivedEvents[convIdx][connIdx].length).toBe(2);
                }
              }
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should handle rapid connection additions and removals', () => {
      fc.assert(
        fc.property(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            operations: fc.array(
              fc.record({
                connectionId: fc.integer({ max: 9, min: 0 }),
                type: fc.constantFrom('add', 'remove'),
              }),
              { maxLength: 20, minLength: 5 },
            ),
          }),
          ({ conversationId, operations }) => {
            const activeConnections = new Set<number>();
            const receivedEvents = new Map<number, StreamEvent[]>();

            // Process operations
            for (const op of operations) {
              if (op.type === 'add') {
                if (!activeConnections.has(op.connectionId)) {
                  const eventArray: StreamEvent[] = [];
                  receivedEvents.set(op.connectionId, eventArray);

                  streamService.addConnection(
                    conversationId,
                    new Types.ObjectId().toString(),
                    `conn-${op.connectionId}`,
                    (event: StreamEvent) => {
                      eventArray.push(event);
                    },
                  );

                  activeConnections.add(op.connectionId);
                }
              } else if (op.type === 'remove') {
                if (activeConnections.has(op.connectionId)) {
                  streamService.removeConnection(
                    conversationId,
                    `conn-${op.connectionId}`,
                  );
                  activeConnections.delete(op.connectionId);
                }
              }
            }

            // Verify connection count matches our tracking
            expect(
              streamService.getConversationConnectionCount(conversationId),
            ).toBe(activeConnections.size);

            // Emit an event
            streamService.emitToConversation(conversationId, {
              data: {
                content: 'Test message',
                role: 'assistant',
                sequence: 0,
                timestamp: new Date().toISOString(),
              },
              type: 'message',
            });

            // Verify only active connections received the event
            for (const [connId, events] of receivedEvents.entries()) {
              if (activeConnections.has(connId)) {
                expect(events.length).toBe(1);
              } else {
                expect(events.length).toBe(0);
              }
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
