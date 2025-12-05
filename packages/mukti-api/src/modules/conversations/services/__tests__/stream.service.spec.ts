import { Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';

import { StreamService } from '../stream.service';

describe('StreamService', () => {
  let service: StreamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamService],
    }).compile();

    service = module.get<StreamService>(StreamService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Multiple Connection Support', () => {
    /**
     * Feature: sse-real-time-messages, Multiple Connection Support
     *
     * For any conversation, the system should support multiple concurrent SSE connections
     * from different clients without event duplication or loss.
     */
    it('should support multiple concurrent connections without event duplication or loss', () => {
      fc.assert(
        fc.property(
          fc.record({
            // Generate 2-5 connections for the same conversation
            connectionCount: fc.integer({ max: 5, min: 2 }),
            // Generate a conversation ID
            conversationId: fc.string({ maxLength: 30, minLength: 10 }),
            // Generate an event to broadcast
            eventType: fc.constantFrom(
              'processing',
              'message',
              'complete',
              'error',
              'progress',
            ),
            // Generate different user IDs for each connection
            userIds: fc.array(fc.string({ maxLength: 30, minLength: 10 }), {
              maxLength: 5,
              minLength: 2,
            }),
          }),
          ({ connectionCount, conversationId, eventType, userIds }) => {
            // Ensure we have enough unique user IDs
            const uniqueUserIds = Array.from(new Set(userIds)).slice(
              0,
              connectionCount,
            );
            if (uniqueUserIds.length < connectionCount) {
              // Pad with generated IDs if needed
              while (uniqueUserIds.length < connectionCount) {
                uniqueUserIds.push(`user-${uniqueUserIds.length}`);
              }
            }

            // Track events received by each connection
            const receivedEvents = new Map<string, any[]>();

            // Add multiple connections for the same conversation
            const connectionIds: string[] = [];
            for (let i = 0; i < connectionCount; i++) {
              const connectionId = `conn-${i}`;
              connectionIds.push(connectionId);

              const emitFn = jest.fn((event: any) => {
                if (!receivedEvents.has(connectionId)) {
                  receivedEvents.set(connectionId, []);
                }
                receivedEvents.get(connectionId)!.push(event);
              });

              service.addConnection(
                conversationId,
                uniqueUserIds[i],
                connectionId,
                emitFn,
              );
            }

            // Verify all connections were added
            expect(service.getConversationConnectionCount(conversationId)).toBe(
              connectionCount,
            );

            // Create a test event based on the event type
            let testEvent: any;
            switch (eventType) {
              case 'complete':
                testEvent = {
                  data: {
                    cost: 0.001,
                    jobId: 'job-123',
                    latency: 500,
                    tokens: 100,
                  },
                  type: 'complete',
                };
                break;
              case 'error':
                testEvent = {
                  data: {
                    code: 'TEST_ERROR',
                    message: 'Test error message',
                    retriable: true,
                  },
                  type: 'error',
                };
                break;
              case 'message':
                testEvent = {
                  data: {
                    content: 'Test message',
                    role: 'assistant',
                    sequence: 1,
                    timestamp: new Date().toISOString(),
                  },
                  type: 'message',
                };
                break;
              case 'processing':
                testEvent = {
                  data: { jobId: 'job-123', status: 'started' },
                  type: 'processing',
                };
                break;
              case 'progress':
                testEvent = {
                  data: {
                    jobId: 'job-123',
                    position: 1,
                    status: 'processing',
                  },
                  type: 'progress',
                };
                break;
            }

            // Emit event to all connections in the conversation
            service.emitToConversation(conversationId, testEvent);

            // Verify all connections received the event exactly once
            expect(receivedEvents.size).toBe(connectionCount);

            for (const connectionId of connectionIds) {
              const events = receivedEvents.get(connectionId);
              expect(events).toBeDefined();
              expect(events!.length).toBe(1); // Each connection receives exactly one event

              const receivedEvent = events![0];
              expect(receivedEvent.type).toBe(eventType);
              expect(receivedEvent.conversationId).toBe(conversationId);
              expect(receivedEvent.timestamp).toBeDefined();
              expect(receivedEvent.data).toEqual(testEvent.data);
            }

            // Verify no event duplication - each connection should have exactly 1 event
            const totalEvents = Array.from(receivedEvents.values()).reduce(
              (sum, events) => sum + events.length,
              0,
            );
            expect(totalEvents).toBe(connectionCount);

            // Clean up
            service.cleanupConversation(conversationId);
            expect(service.getConversationConnectionCount(conversationId)).toBe(
              0,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle multiple connections from the same user', () => {
      const conversationId = 'conv-123';
      const userId = 'user-456';
      const connectionIds = ['conn-1', 'conn-2', 'conn-3'];

      const receivedEvents = new Map<string, any[]>();

      // Add multiple connections for the same user (e.g., multiple browser tabs)
      for (const connectionId of connectionIds) {
        const emitFn = jest.fn((event: any) => {
          if (!receivedEvents.has(connectionId)) {
            receivedEvents.set(connectionId, []);
          }
          receivedEvents.get(connectionId)!.push(event);
        });

        service.addConnection(conversationId, userId, connectionId, emitFn);
      }

      expect(service.getConversationConnectionCount(conversationId)).toBe(3);

      // Emit event to conversation
      service.emitToConversation(conversationId, {
        data: {
          content: 'Test message',
          role: 'assistant',
          sequence: 1,
          timestamp: new Date().toISOString(),
        },
        type: 'message',
      });

      // All connections should receive the event
      expect(receivedEvents.size).toBe(3);
      for (const connectionId of connectionIds) {
        expect(receivedEvents.get(connectionId)!.length).toBe(1);
      }
    });

    it('should handle connection removal without affecting other connections', () => {
      const conversationId = 'conv-123';
      const connectionIds = ['conn-1', 'conn-2', 'conn-3'];
      const emitFns: jest.Mock[] = [];

      // Add multiple connections
      for (let i = 0; i < connectionIds.length; i++) {
        const emitFn = jest.fn();
        emitFns.push(emitFn);
        service.addConnection(
          conversationId,
          `user-${i}`,
          connectionIds[i],
          emitFn,
        );
      }

      expect(service.getConversationConnectionCount(conversationId)).toBe(3);

      // Remove one connection
      service.removeConnection(conversationId, connectionIds[1]);

      expect(service.getConversationConnectionCount(conversationId)).toBe(2);

      // Emit event
      service.emitToConversation(conversationId, {
        data: {
          content: 'Test',
          role: 'assistant',
          sequence: 1,
          timestamp: new Date().toISOString(),
        },
        type: 'message',
      });

      // Only remaining connections should receive the event
      expect(emitFns[0]).toHaveBeenCalledTimes(1);
      expect(emitFns[1]).not.toHaveBeenCalled(); // Removed connection
      expect(emitFns[2]).toHaveBeenCalledTimes(1);
    });

    it('should handle emitToUser with multiple connections from same user', () => {
      const conversationId = 'conv-123';
      const userId = 'user-456';
      const otherUserId = 'user-789';
      const connectionIds = ['conn-1', 'conn-2', 'conn-3'];

      const receivedEvents = new Map<string, any[]>();

      // Add connections for target user
      for (let i = 0; i < 2; i++) {
        const emitFn = jest.fn((event: any) => {
          if (!receivedEvents.has(connectionIds[i])) {
            receivedEvents.set(connectionIds[i], []);
          }
          receivedEvents.get(connectionIds[i])!.push(event);
        });
        service.addConnection(conversationId, userId, connectionIds[i], emitFn);
      }

      // Add connection for different user
      const otherEmitFn = jest.fn((event: any) => {
        if (!receivedEvents.has(connectionIds[2])) {
          receivedEvents.set(connectionIds[2], []);
        }
        receivedEvents.get(connectionIds[2])!.push(event);
      });
      service.addConnection(
        conversationId,
        otherUserId,
        connectionIds[2],
        otherEmitFn,
      );

      // Emit to specific user
      service.emitToUser(conversationId, userId, {
        data: {
          code: 'RATE_LIMIT',
          message: 'Rate limit exceeded',
          retriable: true,
        },
        type: 'error',
      });

      // Only target user's connections should receive the event
      expect(receivedEvents.get(connectionIds[0])!.length).toBe(1);
      expect(receivedEvents.get(connectionIds[1])!.length).toBe(1);
      expect(receivedEvents.has(connectionIds[2])).toBe(false); // Other user should not receive
    });

    it('should handle errors in emit functions gracefully', () => {
      const conversationId = 'conv-123';
      const connectionIds = ['conn-1', 'conn-2', 'conn-3'];
      const emitFns: jest.Mock[] = [];

      // Add connections, with one that throws an error
      for (let i = 0; i < connectionIds.length; i++) {
        const emitFn = jest.fn();
        if (i === 1) {
          // Make second connection throw an error
          emitFn.mockImplementation(() => {
            throw new Error('Connection error');
          });
        }
        emitFns.push(emitFn);
        service.addConnection(
          conversationId,
          `user-${i}`,
          connectionIds[i],
          emitFn,
        );
      }

      // Emit event - should not throw despite one connection failing
      expect(() => {
        service.emitToConversation(conversationId, {
          data: {
            content: 'Test',
            role: 'assistant',
            sequence: 1,
            timestamp: new Date().toISOString(),
          },
          type: 'message',
        });
      }).not.toThrow();

      // Other connections should still receive the event
      expect(emitFns[0]).toHaveBeenCalledTimes(1);
      expect(emitFns[1]).toHaveBeenCalledTimes(1); // Called but threw error
      expect(emitFns[2]).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection Management', () => {
    it('should add and track connections correctly', () => {
      const conversationId = 'conv-123';
      const userId = 'user-456';
      const connectionId = 'conn-789';
      const emitFn = jest.fn();

      service.addConnection(conversationId, userId, connectionId, emitFn);

      expect(service.getConversationConnectionCount(conversationId)).toBe(1);
      expect(service.getConnectionCount()).toBe(1);
    });

    it('should remove connections correctly', () => {
      const conversationId = 'conv-123';
      const userId = 'user-456';
      const connectionId = 'conn-789';
      const emitFn = jest.fn();

      service.addConnection(conversationId, userId, connectionId, emitFn);
      expect(service.getConversationConnectionCount(conversationId)).toBe(1);

      service.removeConnection(conversationId, connectionId);
      expect(service.getConversationConnectionCount(conversationId)).toBe(0);
    });

    it('should cleanup all connections for a conversation', () => {
      const conversationId = 'conv-123';
      const emitFn = jest.fn();

      // Add multiple connections
      service.addConnection(conversationId, 'user-1', 'conn-1', emitFn);
      service.addConnection(conversationId, 'user-2', 'conn-2', emitFn);
      service.addConnection(conversationId, 'user-3', 'conn-3', emitFn);

      expect(service.getConversationConnectionCount(conversationId)).toBe(3);

      service.cleanupConversation(conversationId);
      expect(service.getConversationConnectionCount(conversationId)).toBe(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit events to all connections in a conversation', () => {
      const conversationId = 'conv-123';
      const emitFn1 = jest.fn();
      const emitFn2 = jest.fn();

      service.addConnection(conversationId, 'user-1', 'conn-1', emitFn1);
      service.addConnection(conversationId, 'user-2', 'conn-2', emitFn2);

      service.emitToConversation(conversationId, {
        data: {
          content: 'Test message',
          role: 'assistant',
          sequence: 1,
          timestamp: new Date().toISOString(),
        },
        type: 'message',
      });

      expect(emitFn1).toHaveBeenCalledTimes(1);
      expect(emitFn2).toHaveBeenCalledTimes(1);

      const event1 = emitFn1.mock.calls[0][0];
      expect(event1.type).toBe('message');
      expect(event1.conversationId).toBe(conversationId);
      expect(event1.timestamp).toBeDefined();
    });

    it('should emit events only to specific user connections', () => {
      const conversationId = 'conv-123';
      const userId = 'user-456';
      const otherUserId = 'user-789';
      const emitFn1 = jest.fn();
      const emitFn2 = jest.fn();

      service.addConnection(conversationId, userId, 'conn-1', emitFn1);
      service.addConnection(conversationId, otherUserId, 'conn-2', emitFn2);

      service.emitToUser(conversationId, userId, {
        data: {
          code: 'TEST_ERROR',
          message: 'Test error',
          retriable: true,
        },
        type: 'error',
      });

      expect(emitFn1).toHaveBeenCalledTimes(1);
      expect(emitFn2).not.toHaveBeenCalled();
    });

    it('should handle emitting to non-existent conversation gracefully', () => {
      expect(() => {
        service.emitToConversation('non-existent', {
          data: {
            content: 'Test',
            role: 'assistant',
            sequence: 1,
            timestamp: new Date().toISOString(),
          },
          type: 'message',
        });
      }).not.toThrow();
    });

    it('should handle emitting to non-existent user gracefully', () => {
      const conversationId = 'conv-123';
      const emitFn = jest.fn();

      service.addConnection(conversationId, 'user-1', 'conn-1', emitFn);

      expect(() => {
        service.emitToUser(conversationId, 'non-existent-user', {
          data: {
            code: 'TEST_ERROR',
            message: 'Test error',
            retriable: true,
          },
          type: 'error',
        });
      }).not.toThrow();

      expect(emitFn).not.toHaveBeenCalled();
    });
  });
});
