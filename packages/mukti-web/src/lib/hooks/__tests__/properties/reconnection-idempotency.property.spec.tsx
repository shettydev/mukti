/**
 * Property-Based Tests for Reconnection Idempotency
 *
 * Feature: sse-real-time-messages, Reconnection Idempotency
 *
 * For any SSE reconnection attempt, re-establishing the connection should not
 * cause duplicate message delivery or state inconsistency.
 */

import type { ReactNode } from 'react';

import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';

import type { Conversation } from '@/types/conversation.types';

import { conversationKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

import { useConversationStream } from '../../use-conversation-stream';

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];

  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState: number = 0;
  url: string;

  constructor(url: string) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    MockEventSource.instances.push(this);
  }

  static reset() {
    MockEventSource.instances = [];
  }

  close() {
    this.readyState = 2; // CLOSED
  }

  // Helper to simulate error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  // Helper to simulate message
  simulateMessage(data: string) {
    if (this.onmessage && this.readyState === 1) {
      const event = new MessageEvent('message', { data });
      this.onmessage(event);
    }
  }

  // Helper to simulate connection open
  simulateOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }
}

// Mock fetch for error detection
const mockFetch = jest.fn();

describe('useConversationStream - Reconnection Idempotency (Property-Based)', () => {
  let queryClient: QueryClient;

  beforeAll(() => {
    // Mock EventSource globally
    global.EventSource = MockEventSource as unknown as typeof EventSource;
    global.fetch = mockFetch as unknown as typeof fetch;
    // Enable fake timers for all tests
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    MockEventSource.reset();
    mockFetch.mockClear();

    // Set up auth store with a mock token
    useAuthStore.setState({ accessToken: 'mock-token' });

    // Mock successful fetch responses (for error detection)
    mockFetch.mockResolvedValue({
      headers: new Headers(),
      ok: true,
      status: 200,
    } as Response);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  /**
   * Reconnection Idempotency
   *
   * For any SSE reconnection attempt, re-establishing the connection should not
   * cause duplicate message delivery or state inconsistency.
   */
  describe('Reconnection Idempotency', () => {
    it(
      'should not deliver duplicate messages after reconnection',
      async () => {
        await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.uuid(),
            // Number of messages to send after reconnect
            messagesAfterReconnect: fc.integer({ max: 10, min: 3 }),
            // Number of messages to send before disconnect
            messagesBeforeDisconnect: fc.integer({ max: 10, min: 3 }),
            // Number of reconnection cycles
            reconnectionCycles: fc.integer({ max: 3, min: 1 }),
          }),
          async ({
            conversationId,
            messagesAfterReconnect,
            messagesBeforeDisconnect,
            reconnectionCycles,
          }) => {
            // Set up initial conversation in cache
            const initialConversation: Conversation = {
              createdAt: new Date().toISOString(),
              hasArchivedMessages: false,
              id: conversationId,
              isArchived: false,
              isFavorite: false,
              metadata: {
                estimatedCost: 0,
                lastMessageAt: new Date().toISOString(),
                messageCount: 0,
                totalTokens: 0,
              },
              recentMessages: [],
              tags: [],
              technique: 'elenchus',
              title: 'Test Conversation',
              updatedAt: new Date().toISOString(),
              userId: 'user-123',
            };

            queryClient.setQueryData(conversationKeys.detail(conversationId), initialConversation);

            const wrapper = ({ children }: { children: ReactNode }) => (
              <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

            // Track all messages received
            const receivedMessages: Array<{ content: string; sequence: number }> = [];

            const { result } = renderHook(
              () =>
                useConversationStream({
                  conversationId,
                  enabled: true,
                  onMessageReceived: (event) => {
                    receivedMessages.push({
                      content: event.data.content,
                      sequence: event.data.sequence,
                    });
                  },
                }),
              { wrapper }
            );

            let totalMessagesSent = 0;

            // Perform multiple reconnection cycles
            for (let cycle = 0; cycle < reconnectionCycles; cycle++) {
              // Get the current EventSource instance
              await waitFor(() => {
                expect(MockEventSource.instances.length).toBeGreaterThan(cycle);
              });

              const eventSource = MockEventSource.instances[cycle];

              // Simulate connection open
              act(() => {
                eventSource.simulateOpen();
              });

              await waitFor(() => {
                expect(result.current.isConnected).toBe(true);
              });

              // Send messages before disconnect
              for (let i = 0; i < messagesBeforeDisconnect; i++) {
                const sequence = totalMessagesSent;
                totalMessagesSent++;

                act(() => {
                  eventSource.simulateMessage(
                    JSON.stringify({
                      conversationId,
                      data: {
                        content: `Message ${sequence}`,
                        role: 'assistant',
                        sequence,
                        timestamp: new Date().toISOString(),
                      },
                      timestamp: new Date().toISOString(),
                      type: 'message',
                    })
                  );
                });
              }

              // Wait for messages to be processed
              await waitFor(() => {
                expect(receivedMessages.length).toBe(
                  (cycle + 1) * messagesBeforeDisconnect
                );
              });

              // Simulate disconnect (except on last cycle)
              if (cycle < reconnectionCycles - 1) {
                act(() => {
                  eventSource.simulateError();
                });

                await waitFor(() => {
                  expect(result.current.isConnected).toBe(false);
                });

                // Wait for reconnection attempt
                await act(async () => {
                  jest.advanceTimersByTime(1000); // First reconnection attempt after 1s
                });
              }
            }

            // After all reconnection cycles, send final batch of messages
            const finalEventSource =
              MockEventSource.instances[MockEventSource.instances.length - 1];

            for (let i = 0; i < messagesAfterReconnect; i++) {
              const sequence = totalMessagesSent;
              totalMessagesSent++;

              act(() => {
                finalEventSource.simulateMessage(
                  JSON.stringify({
                    conversationId,
                    data: {
                      content: `Message ${sequence}`,
                      role: 'assistant',
                      sequence,
                      timestamp: new Date().toISOString(),
                    },
                    timestamp: new Date().toISOString(),
                    type: 'message',
                  })
                );
              });
            }

            // Wait for final messages
            await waitFor(() => {
              expect(receivedMessages.length).toBe(totalMessagesSent);
            });

            // Verify no duplicate messages
            const sequences = receivedMessages.map((msg) => msg.sequence);
            const uniqueSequences = new Set(sequences);
            expect(uniqueSequences.size).toBe(sequences.length);

            // Verify messages are in order
            for (let i = 0; i < sequences.length; i++) {
              expect(sequences[i]).toBe(i);
            }

            // Verify conversation cache has correct message count
            const cachedConversation = queryClient.getQueryData<Conversation>(
              conversationKeys.detail(conversationId)
            );
            expect(cachedConversation?.recentMessages.length).toBe(totalMessagesSent);

            // Verify no duplicate messages in cache
            const cachedSequences = cachedConversation?.recentMessages.map(
              (msg) => msg.sequence
            );
            const uniqueCachedSequences = new Set(cachedSequences);
            expect(uniqueCachedSequences.size).toBe(cachedSequences?.length);
          }
        ),
        { numRuns: 10 }
      );
      },
      30000
    );

    it(
      'should maintain consistent conversation state after multiple reconnections',
      async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.uuid(),
            initialMessageCount: fc.integer({ max: 5, min: 0 }),
            messagesPerCycle: fc.integer({ max: 5, min: 1 }),
            reconnectionCycles: fc.integer({ max: 4, min: 2 }),
          }),
          async ({
            conversationId,
            initialMessageCount,
            messagesPerCycle,
            reconnectionCycles,
          }) => {
            // Set up initial conversation with some messages
            const initialMessages = Array.from({ length: initialMessageCount }, (_, i) => ({
              content: `Initial message ${i}`,
              role: 'assistant' as const,
              sequence: i,
              timestamp: new Date().toISOString(),
            }));

            const initialConversation: Conversation = {
              createdAt: new Date().toISOString(),
              hasArchivedMessages: false,
              id: conversationId,
              isArchived: false,
              isFavorite: false,
              metadata: {
                estimatedCost: 0,
                lastMessageAt: new Date().toISOString(),
                messageCount: initialMessageCount,
                totalTokens: 0,
              },
              recentMessages: initialMessages,
              tags: [],
              technique: 'elenchus',
              title: 'Test Conversation',
              updatedAt: new Date().toISOString(),
              userId: 'user-123',
            };

            queryClient.setQueryData(conversationKeys.detail(conversationId), initialConversation);

            const wrapper = ({ children }: { children: ReactNode }) => (
              <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

            const { result } = renderHook(
              () =>
                useConversationStream({
                  conversationId,
                  enabled: true,
                }),
              { wrapper }
            );

            let expectedMessageCount = initialMessageCount;

            // Perform reconnection cycles
            for (let cycle = 0; cycle < reconnectionCycles; cycle++) {
              await waitFor(() => {
                expect(MockEventSource.instances.length).toBeGreaterThan(cycle);
              });

              const eventSource = MockEventSource.instances[cycle];

              // Open connection
              act(() => {
                eventSource.simulateOpen();
              });

              await waitFor(() => {
                expect(result.current.isConnected).toBe(true);
              });

              // Send messages
              for (let i = 0; i < messagesPerCycle; i++) {
                const sequence = expectedMessageCount;
                expectedMessageCount++;

                act(() => {
                  eventSource.simulateMessage(
                    JSON.stringify({
                      conversationId,
                      data: {
                        content: `Cycle ${cycle} Message ${i}`,
                        role: 'assistant',
                        sequence,
                        timestamp: new Date().toISOString(),
                        tokens: 10,
                      },
                      timestamp: new Date().toISOString(),
                      type: 'message',
                    })
                  );
                });
              }

              // Wait for messages to be processed
              await waitFor(() => {
                const conversation = queryClient.getQueryData<Conversation>(
                  conversationKeys.detail(conversationId)
                );
                expect(conversation?.recentMessages.length).toBe(expectedMessageCount);
              });

              // Verify state consistency
              const conversation = queryClient.getQueryData<Conversation>(
                conversationKeys.detail(conversationId)
              );

              expect(conversation?.metadata.messageCount).toBe(expectedMessageCount);
              expect(conversation?.recentMessages.length).toBe(expectedMessageCount);

              // Verify no duplicate sequences
              const sequences = conversation?.recentMessages.map((msg) => msg.sequence);
              const uniqueSequences = new Set(sequences);
              expect(uniqueSequences.size).toBe(sequences?.length);

              // Disconnect (except on last cycle)
              if (cycle < reconnectionCycles - 1) {
                act(() => {
                  eventSource.simulateError();
                });

                await waitFor(() => {
                  expect(result.current.isConnected).toBe(false);
                });

                // Verify state is still consistent after disconnect
                const conversationAfterDisconnect = queryClient.getQueryData<Conversation>(
                  conversationKeys.detail(conversationId)
                );
                expect(conversationAfterDisconnect?.recentMessages.length).toBe(
                  expectedMessageCount
                );

                // Wait for reconnection
                await act(async () => {
                  jest.advanceTimersByTime(1000);
                });
              }
            }

            // Final verification
            const finalConversation = queryClient.getQueryData<Conversation>(
              conversationKeys.detail(conversationId)
            );

            expect(finalConversation?.recentMessages.length).toBe(expectedMessageCount);
            expect(finalConversation?.metadata.messageCount).toBe(expectedMessageCount);

            // Verify all sequences are unique and in order
            const finalSequences = finalConversation?.recentMessages.map((msg) => msg.sequence);
            for (let i = 0; i < expectedMessageCount; i++) {
              expect(finalSequences?.[i]).toBe(i);
            }
          }
        ),
        { numRuns: 10 }
      );
      },
      30000
    );

    it(
      'should not duplicate processing/complete events after reconnection',
      async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.uuid(),
            reconnectionCycles: fc.integer({ max: 3, min: 1 }),
          }),
          async ({ conversationId, reconnectionCycles }) => {
            const initialConversation: Conversation = {
              createdAt: new Date().toISOString(),
              hasArchivedMessages: false,
              id: conversationId,
              isArchived: false,
              isFavorite: false,
              metadata: {
                estimatedCost: 0,
                lastMessageAt: new Date().toISOString(),
                messageCount: 0,
                totalTokens: 0,
              },
              recentMessages: [],
              tags: [],
              technique: 'elenchus',
              title: 'Test Conversation',
              updatedAt: new Date().toISOString(),
              userId: 'user-123',
            };

            queryClient.setQueryData(conversationKeys.detail(conversationId), initialConversation);

            const wrapper = ({ children }: { children: ReactNode }) => (
              <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

            const processingEvents: string[] = [];
            const completeEvents: string[] = [];

            const { result } = renderHook(
              () =>
                useConversationStream({
                  conversationId,
                  enabled: true,
                  onComplete: (event) => {
                    completeEvents.push(event.data.jobId);
                  },
                  onProcessing: (event) => {
                    processingEvents.push(event.data.jobId);
                  },
                }),
              { wrapper }
            );

            let jobCounter = 0;

            // Perform reconnection cycles
            for (let cycle = 0; cycle < reconnectionCycles; cycle++) {
              await waitFor(() => {
                expect(MockEventSource.instances.length).toBeGreaterThan(cycle);
              });

              const eventSource = MockEventSource.instances[cycle];

              // Open connection
              act(() => {
                eventSource.simulateOpen();
              });

              await waitFor(() => {
                expect(result.current.isConnected).toBe(true);
              });

              // Simulate a complete workflow: processing -> message -> complete
              const jobId = `job-${jobCounter}`;
              jobCounter++;

              // Processing event
              act(() => {
                eventSource.simulateMessage(
                  JSON.stringify({
                    conversationId,
                    data: {
                      jobId,
                      status: 'started',
                    },
                    timestamp: new Date().toISOString(),
                    type: 'processing',
                  })
                );
              });

              // Message event
              act(() => {
                eventSource.simulateMessage(
                  JSON.stringify({
                    conversationId,
                    data: {
                      content: `Response for ${jobId}`,
                      role: 'assistant',
                      sequence: cycle,
                      timestamp: new Date().toISOString(),
                      tokens: 100,
                    },
                    timestamp: new Date().toISOString(),
                    type: 'message',
                  })
                );
              });

              // Complete event
              act(() => {
                eventSource.simulateMessage(
                  JSON.stringify({
                    conversationId,
                    data: {
                      cost: 0.001,
                      jobId,
                      latency: 1000,
                      tokens: 100,
                    },
                    timestamp: new Date().toISOString(),
                    type: 'complete',
                  })
                );
              });

              // Wait for events to be processed
              await waitFor(() => {
                expect(processingEvents.length).toBe(cycle + 1);
                expect(completeEvents.length).toBe(cycle + 1);
              });

              // Disconnect (except on last cycle)
              if (cycle < reconnectionCycles - 1) {
                act(() => {
                  eventSource.simulateError();
                });

                await waitFor(() => {
                  expect(result.current.isConnected).toBe(false);
                });

                // Wait for reconnection
                await act(async () => {
                  jest.advanceTimersByTime(1000);
                });
              }
            }

            // Verify no duplicate events
            const uniqueProcessingEvents = new Set(processingEvents);
            const uniqueCompleteEvents = new Set(completeEvents);

            expect(uniqueProcessingEvents.size).toBe(processingEvents.length);
            expect(uniqueCompleteEvents.size).toBe(completeEvents.length);
            expect(processingEvents.length).toBe(reconnectionCycles);
            expect(completeEvents.length).toBe(reconnectionCycles);
          }
        ),
        { numRuns: 10 }
      );
      },
      30000
    );

    it(
      'should handle rapid reconnections without state corruption',
      async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.uuid(),
            messagesPerConnection: fc.integer({ max: 3, min: 1 }),
            rapidReconnections: fc.integer({ max: 5, min: 3 }),
          }),
          async ({ conversationId, messagesPerConnection, rapidReconnections }) => {
            const initialConversation: Conversation = {
              createdAt: new Date().toISOString(),
              hasArchivedMessages: false,
              id: conversationId,
              isArchived: false,
              isFavorite: false,
              metadata: {
                estimatedCost: 0,
                lastMessageAt: new Date().toISOString(),
                messageCount: 0,
                totalTokens: 0,
              },
              recentMessages: [],
              tags: [],
              technique: 'elenchus',
              title: 'Test Conversation',
              updatedAt: new Date().toISOString(),
              userId: 'user-123',
            };

            queryClient.setQueryData(conversationKeys.detail(conversationId), initialConversation);

            const wrapper = ({ children }: { children: ReactNode }) => (
              <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

            renderHook(
              () =>
                useConversationStream({
                  conversationId,
                  enabled: true,
                }),
              { wrapper }
            );

            let expectedSequence = 0;

            // Perform rapid reconnections
            for (let cycle = 0; cycle < rapidReconnections; cycle++) {
              await waitFor(() => {
                expect(MockEventSource.instances.length).toBeGreaterThan(cycle);
              });

              const eventSource = MockEventSource.instances[cycle];

              // Open connection
              act(() => {
                eventSource.simulateOpen();
              });

              // Send messages immediately without waiting
              for (let i = 0; i < messagesPerConnection; i++) {
                act(() => {
                  eventSource.simulateMessage(
                    JSON.stringify({
                      conversationId,
                      data: {
                        content: `Message ${expectedSequence}`,
                        role: 'assistant',
                        sequence: expectedSequence,
                        timestamp: new Date().toISOString(),
                      },
                      timestamp: new Date().toISOString(),
                      type: 'message',
                    })
                  );
                });
                expectedSequence++;
              }

              // Immediately disconnect
              act(() => {
                eventSource.simulateError();
              });

              // Trigger rapid reconnection (very short delay)
              if (cycle < rapidReconnections - 1) {
                await act(async () => {
                  jest.advanceTimersByTime(100);
                });
              }
            }

            // Wait for all messages to be processed
            await waitFor(
              () => {
                const conversation = queryClient.getQueryData<Conversation>(
                  conversationKeys.detail(conversationId)
                );
                expect(conversation?.recentMessages.length).toBe(expectedSequence);
              },
              { timeout: 5000 }
            );

            // Verify state consistency
            const finalConversation = queryClient.getQueryData<Conversation>(
              conversationKeys.detail(conversationId)
            );

            // No duplicate messages
            const sequences = finalConversation?.recentMessages.map((msg) => msg.sequence);
            const uniqueSequences = new Set(sequences);
            expect(uniqueSequences.size).toBe(sequences?.length);

            // All sequences present and in order
            expect(sequences?.length).toBe(expectedSequence);
            for (let i = 0; i < expectedSequence; i++) {
              expect(sequences?.[i]).toBe(i);
            }

            // Metadata is consistent
            expect(finalConversation?.metadata.messageCount).toBe(expectedSequence);
          }
        ),
        { numRuns: 10 }
      );
      },
      30000
    );
  });
});
