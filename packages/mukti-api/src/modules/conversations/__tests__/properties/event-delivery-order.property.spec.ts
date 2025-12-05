import { Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { Types } from 'mongoose';

import { type StreamEvent, StreamService } from '../../services/stream.service';

/**
 * Property-Based Tests for Event Delivery Order
 *
 * Feature: sse-real-time-messages, Event Delivery Order
 *
 * For any sequence of events emitted for a conversation, all connected clients
 * should receive events in the same order they were emitted.
 */
describe('StreamService - Event Delivery Order (Property-Based)', () => {
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Event Delivery Order
   *
   * For any sequence of events emitted for a conversation, all connected clients
   * should receive events in the same order they were emitted.
   */
  describe('Event Delivery Order', () => {
    it('should deliver events in the same order to all connected clients', () => {
      fc.assert(
        fc.property(
          fc.record({
            // Generate a conversation ID
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            // Generate 2-5 connections for the same conversation
            numConnections: fc.integer({ max: 5, min: 2 }),
            // Generate 5-15 events to emit in sequence
            numEvents: fc.integer({ max: 15, min: 5 }),
          }),
          ({ conversationId, numConnections, numEvents }) => {
            // Create arrays to track received events for each connection
            const receivedEvents: StreamEvent[][] = Array.from(
              { length: numConnections },
              () => [],
            );

            // Create emit functions that capture events in order
            const emitFunctions = receivedEvents.map(
              (eventArray) => (event: StreamEvent) => {
                eventArray.push(event);
              },
            );

            // Add multiple connections for the same conversation
            for (let i = 0; i < numConnections; i++) {
              const userId = new Types.ObjectId().toString();
              const connectionId = `conn-${i}`;
              streamService.addConnection(
                conversationId,
                userId,
                connectionId,
                emitFunctions[i],
              );
            }

            // Generate and emit a sequence of different event types
            const eventTypes: (
              | 'complete'
              | 'error'
              | 'message'
              | 'processing'
              | 'progress'
            )[] = ['processing', 'message', 'progress', 'complete', 'error'];

            for (let i = 0; i < numEvents; i++) {
              const eventType = eventTypes[i % eventTypes.length];

              // Emit different event types based on the sequence
              switch (eventType) {
                case 'complete':
                  streamService.emitToConversation(conversationId, {
                    data: {
                      cost: 0.001 * i,
                      jobId: `job-${i}`,
                      latency: 1000 + i * 100,
                      tokens: 100 + i * 10,
                    },
                    type: 'complete',
                  });
                  break;
                case 'error':
                  streamService.emitToConversation(conversationId, {
                    data: {
                      code: `ERROR_${i}`,
                      message: `Error message ${i}`,
                      retriable: i % 2 === 0,
                    },
                    type: 'error',
                  });
                  break;
                case 'message':
                  streamService.emitToConversation(conversationId, {
                    data: {
                      content: `Message ${i}`,
                      role: i % 2 === 0 ? 'user' : 'assistant',
                      sequence: i,
                      timestamp: new Date().toISOString(),
                    },
                    type: 'message',
                  });
                  break;
                case 'processing':
                  streamService.emitToConversation(conversationId, {
                    data: {
                      jobId: `job-${i}`,
                      status: 'started',
                    },
                    type: 'processing',
                  });
                  break;
                case 'progress':
                  streamService.emitToConversation(conversationId, {
                    data: {
                      jobId: `job-${i}`,
                      status: `Processing step ${i}`,
                    },
                    type: 'progress',
                  });
                  break;
              }
            }

            // Verify all connections received the same number of events
            for (let i = 0; i < numConnections; i++) {
              expect(receivedEvents[i].length).toBe(numEvents);
            }

            // Verify all connections received events in the same order
            // Compare each connection's events with the first connection's events
            const referenceEvents = receivedEvents[0];

            for (let connIdx = 1; connIdx < numConnections; connIdx++) {
              const currentEvents = receivedEvents[connIdx];

              for (let eventIdx = 0; eventIdx < numEvents; eventIdx++) {
                const refEvent = referenceEvents[eventIdx];
                const currEvent = currentEvents[eventIdx];

                // Verify event types match
                expect(currEvent.type).toBe(refEvent.type);

                // Verify conversation IDs match
                expect(currEvent.conversationId).toBe(refEvent.conversationId);

                // Verify event data matches (excluding timestamp which may vary slightly)
                // We compare the stringified data to ensure deep equality
                expect(JSON.stringify(currEvent.data)).toBe(
                  JSON.stringify(refEvent.data),
                );
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should maintain event order even with rapid sequential emissions', () => {
      fc.assert(
        fc.property(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            numConnections: fc.integer({ max: 3, min: 2 }),
            // Test with many rapid events
            numEvents: fc.integer({ max: 50, min: 20 }),
          }),
          ({ conversationId, numConnections, numEvents }) => {
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

            // Emit events rapidly without any delays
            for (let i = 0; i < numEvents; i++) {
              streamService.emitToConversation(conversationId, {
                data: {
                  content: `Rapid message ${i}`,
                  role: 'assistant',
                  sequence: i,
                  timestamp: new Date().toISOString(),
                },
                type: 'message',
              });
            }

            // Verify all connections received all events
            for (const events of receivedEvents) {
              expect(events.length).toBe(numEvents);
            }

            // Verify sequence numbers are in order for all connections
            for (const events of receivedEvents) {
              for (let i = 0; i < numEvents; i++) {
                const event = events[i];
                expect(event.type).toBe('message');
                expect((event.data as any).sequence).toBe(i);
                expect((event.data as any).content).toBe(`Rapid message ${i}`);
              }
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should maintain order across different event types in a realistic workflow', () => {
      fc.assert(
        fc.property(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            numConnections: fc.integer({ max: 4, min: 2 }),
            numWorkflows: fc.integer({ max: 5, min: 1 }),
          }),
          ({ conversationId, numConnections, numWorkflows }) => {
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

            // Simulate realistic workflow: processing -> message (user) -> message (assistant) -> complete
            for (let workflow = 0; workflow < numWorkflows; workflow++) {
              const jobId = `job-${workflow}`;

              // 1. Processing event
              streamService.emitToConversation(conversationId, {
                data: {
                  jobId,
                  status: 'started',
                },
                type: 'processing',
              });

              // 2. User message event
              streamService.emitToConversation(conversationId, {
                data: {
                  content: `User message ${workflow}`,
                  role: 'user',
                  sequence: workflow * 2,
                  timestamp: new Date().toISOString(),
                },
                type: 'message',
              });

              // 3. Assistant message event
              streamService.emitToConversation(conversationId, {
                data: {
                  content: `Assistant response ${workflow}`,
                  role: 'assistant',
                  sequence: workflow * 2 + 1,
                  timestamp: new Date().toISOString(),
                  tokens: 150,
                },
                type: 'message',
              });

              // 4. Complete event
              streamService.emitToConversation(conversationId, {
                data: {
                  cost: 0.002,
                  jobId,
                  latency: 1500,
                  tokens: 150,
                },
                type: 'complete',
              });
            }

            const expectedEventsPerWorkflow = 4;
            const totalExpectedEvents =
              numWorkflows * expectedEventsPerWorkflow;

            // Verify all connections received all events
            for (const events of receivedEvents) {
              expect(events.length).toBe(totalExpectedEvents);
            }

            // Verify the workflow pattern is maintained for all connections
            for (const events of receivedEvents) {
              for (let workflow = 0; workflow < numWorkflows; workflow++) {
                const baseIdx = workflow * expectedEventsPerWorkflow;

                // Check processing event
                expect(events[baseIdx].type).toBe('processing');
                expect((events[baseIdx].data as any).status).toBe('started');

                // Check user message
                expect(events[baseIdx + 1].type).toBe('message');
                expect((events[baseIdx + 1].data as any).role).toBe('user');

                // Check assistant message
                expect(events[baseIdx + 2].type).toBe('message');
                expect((events[baseIdx + 2].data as any).role).toBe(
                  'assistant',
                );

                // Check complete event
                expect(events[baseIdx + 3].type).toBe('complete');
              }
            }

            // Verify all connections have identical event sequences
            const referenceEvents = receivedEvents[0];
            for (let connIdx = 1; connIdx < numConnections; connIdx++) {
              const currentEvents = receivedEvents[connIdx];

              for (
                let eventIdx = 0;
                eventIdx < totalExpectedEvents;
                eventIdx++
              ) {
                expect(currentEvents[eventIdx].type).toBe(
                  referenceEvents[eventIdx].type,
                );
                expect(JSON.stringify(currentEvents[eventIdx].data)).toBe(
                  JSON.stringify(referenceEvents[eventIdx].data),
                );
              }
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should maintain order when connections are added during event emission', () => {
      fc.assert(
        fc.property(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            eventsAfterNewConnection: fc.integer({ max: 10, min: 3 }),
            eventsBeforeNewConnection: fc.integer({ max: 10, min: 3 }),
            initialConnections: fc.integer({ max: 3, min: 1 }),
          }),
          ({
            conversationId,
            eventsAfterNewConnection,
            eventsBeforeNewConnection,
            initialConnections,
          }) => {
            const receivedEvents: StreamEvent[][] = [];
            const emitFunctions: ((event: StreamEvent) => void)[] = [];

            // Helper to add a connection
            const addConnection = (connIdx: number) => {
              const eventArray: StreamEvent[] = [];
              receivedEvents.push(eventArray);

              const emitFn = (event: StreamEvent) => {
                eventArray.push(event);
              };
              emitFunctions.push(emitFn);

              streamService.addConnection(
                conversationId,
                new Types.ObjectId().toString(),
                `conn-${connIdx}`,
                emitFn,
              );
            };

            // Add initial connections
            for (let i = 0; i < initialConnections; i++) {
              addConnection(i);
            }

            // Emit first batch of events
            for (let i = 0; i < eventsBeforeNewConnection; i++) {
              streamService.emitToConversation(conversationId, {
                data: {
                  content: `Message ${i}`,
                  role: 'assistant',
                  sequence: i,
                  timestamp: new Date().toISOString(),
                },
                type: 'message',
              });
            }

            // Add a new connection mid-stream
            addConnection(initialConnections);

            // Emit second batch of events
            for (let i = 0; i < eventsAfterNewConnection; i++) {
              const sequence = eventsBeforeNewConnection + i;
              streamService.emitToConversation(conversationId, {
                data: {
                  content: `Message ${sequence}`,
                  role: 'assistant',
                  sequence,
                  timestamp: new Date().toISOString(),
                },
                type: 'message',
              });
            }

            // Initial connections should have all events
            for (let i = 0; i < initialConnections; i++) {
              expect(receivedEvents[i].length).toBe(
                eventsBeforeNewConnection + eventsAfterNewConnection,
              );

              // Verify sequence is correct
              for (let j = 0; j < receivedEvents[i].length; j++) {
                expect((receivedEvents[i][j].data as any).sequence).toBe(j);
              }
            }

            // New connection should only have events after it connected
            const newConnectionEvents =
              receivedEvents[receivedEvents.length - 1];
            expect(newConnectionEvents.length).toBe(eventsAfterNewConnection);

            // Verify the new connection's events are in order
            for (let i = 0; i < newConnectionEvents.length; i++) {
              const expectedSequence = eventsBeforeNewConnection + i;
              expect((newConnectionEvents[i].data as any).sequence).toBe(
                expectedSequence,
              );
            }

            // Verify all initial connections have identical sequences
            for (let connIdx = 1; connIdx < initialConnections; connIdx++) {
              const totalEvents =
                eventsBeforeNewConnection + eventsAfterNewConnection;
              for (let eventIdx = 0; eventIdx < totalEvents; eventIdx++) {
                expect(receivedEvents[connIdx][eventIdx].type).toBe(
                  receivedEvents[0][eventIdx].type,
                );
                expect(
                  (receivedEvents[connIdx][eventIdx].data as any).sequence,
                ).toBe((receivedEvents[0][eventIdx].data as any).sequence);
              }
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should maintain order even when one connection fails to receive an event', () => {
      fc.assert(
        fc.property(
          fc.record({
            conversationId: fc
              .string({ maxLength: 24, minLength: 24 })
              .map(() => new Types.ObjectId().toString()),
            failAtEventIndex: fc.integer({ max: 4, min: 1 }),
            failingConnectionIndex: fc.integer({ max: 2, min: 0 }),
            numConnections: fc.integer({ max: 4, min: 3 }),
            numEvents: fc.integer({ max: 10, min: 5 }),
          }),
          ({
            conversationId,
            failAtEventIndex,
            failingConnectionIndex,
            numConnections,
            numEvents,
          }) => {
            const receivedEvents: StreamEvent[][] = Array.from(
              { length: numConnections },
              () => [],
            );

            // Create emit functions, with one that fails at a specific event and continues failing
            const emitFunctions = receivedEvents.map((eventArray, idx) => {
              let eventCount = 0;
              return (event: StreamEvent) => {
                // Once a connection fails, it continues to fail for all subsequent events
                if (
                  idx === failingConnectionIndex &&
                  eventCount >= failAtEventIndex
                ) {
                  eventCount++;
                  throw new Error('Simulated connection failure');
                }
                eventArray.push(event);
                eventCount++;
              };
            });

            // Add connections
            for (let i = 0; i < numConnections; i++) {
              streamService.addConnection(
                conversationId,
                new Types.ObjectId().toString(),
                `conn-${i}`,
                emitFunctions[i],
              );
            }

            // Emit events
            for (let i = 0; i < numEvents; i++) {
              streamService.emitToConversation(conversationId, {
                data: {
                  content: `Message ${i}`,
                  role: 'assistant',
                  sequence: i,
                  timestamp: new Date().toISOString(),
                },
                type: 'message',
              });
            }

            // Verify non-failing connections received all events in order
            for (let connIdx = 0; connIdx < numConnections; connIdx++) {
              if (connIdx === failingConnectionIndex) {
                // Failing connection should have received events up to (but not including) the failure point
                expect(receivedEvents[connIdx].length).toBe(failAtEventIndex);

                // Verify the events it did receive are in order
                for (
                  let eventIdx = 0;
                  eventIdx < failAtEventIndex;
                  eventIdx++
                ) {
                  expect(
                    (receivedEvents[connIdx][eventIdx].data as any).sequence,
                  ).toBe(eventIdx);
                }
              } else {
                // Other connections should have all events
                expect(receivedEvents[connIdx].length).toBe(numEvents);

                // Verify order
                for (let eventIdx = 0; eventIdx < numEvents; eventIdx++) {
                  expect(
                    (receivedEvents[connIdx][eventIdx].data as any).sequence,
                  ).toBe(eventIdx);
                }
              }
            }

            // Verify all successful connections have identical sequences
            const successfulConnections = receivedEvents.filter(
              (_, idx) => idx !== failingConnectionIndex,
            );

            for (
              let connIdx = 1;
              connIdx < successfulConnections.length;
              connIdx++
            ) {
              for (let eventIdx = 0; eventIdx < numEvents; eventIdx++) {
                expect(successfulConnections[connIdx][eventIdx].type).toBe(
                  successfulConnections[0][eventIdx].type,
                );
                expect(
                  (successfulConnections[connIdx][eventIdx].data as any)
                    .sequence,
                ).toBe(
                  (successfulConnections[0][eventIdx].data as any).sequence,
                );
              }
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
