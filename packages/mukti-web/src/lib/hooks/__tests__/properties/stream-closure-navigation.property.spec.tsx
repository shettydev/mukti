/**
 * Property-Based Tests for Stream Closure on Navigation
 *
 * Feature: sse-real-time-messages, Stream Closure on Navigation
 *
 * For any SSE connection, when the user navigates away from the conversation,
 * the connection should be closed and cleaned up.
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

  closed: boolean = false;
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
    this.closed = true;
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

describe('useConversationStream - Stream Closure on Navigation (Property-Based)', () => {
  let queryClient: QueryClient;

  beforeAll(() => {
    // Mock EventSource globally
    global.EventSource = MockEventSource as unknown as typeof EventSource;
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  beforeEach(() => {
    // Enable fake timers for each test
    jest.useFakeTimers();

    // Reset MockEventSource instances BEFORE creating new query client
    MockEventSource.reset();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockFetch.mockClear();

    // Set up auth store with a mock token
    useAuthStore.setState({ accessToken: 'mock-token' });

    // Mock successful fetch responses (for error detection)
    mockFetch.mockResolvedValue({
      headers: {
        get: () => null,
      },
      ok: true,
      status: 200,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  /**
   * Stream Closure on Navigation
   *
   * For any SSE connection, when the user navigates away from the conversation,
   * the connection should be closed and cleaned up.
   */
  describe('Stream Closure on Navigation', () => {
    it('should close EventSource connection when hook unmounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.uuid(),
            // Number of messages to send before unmount
            messagesBeforeUnmount: fc.integer({ max: 10, min: 0 }),
          }),
          async ({ conversationId, messagesBeforeUnmount }) => {
            // Reset MockEventSource instances for this property test iteration
            MockEventSource.reset();

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

            const { result, unmount } = renderHook(
              () =>
                useConversationStream({
                  conversationId,
                  enabled: true,
                }),
              { wrapper }
            );

            // Wait for EventSource to be created
            await waitFor(() => {
              expect(MockEventSource.instances.length).toBe(1);
            });

            const eventSource = MockEventSource.instances[0];

            // Simulate connection open
            act(() => {
              eventSource.simulateOpen();
            });

            await waitFor(() => {
              expect(result.current.isConnected).toBe(true);
            });

            // Send some messages before unmount
            for (let i = 0; i < messagesBeforeUnmount; i++) {
              act(() => {
                eventSource.simulateMessage(
                  JSON.stringify({
                    conversationId,
                    data: {
                      content: `Message ${i}`,
                      role: 'assistant',
                      sequence: i,
                      timestamp: new Date().toISOString(),
                    },
                    timestamp: new Date().toISOString(),
                    type: 'message',
                  })
                );
              });
            }

            // Wait for messages to be processed
            if (messagesBeforeUnmount > 0) {
              await waitFor(() => {
                const conversation = queryClient.getQueryData<Conversation>(
                  conversationKeys.detail(conversationId)
                );
                expect(conversation?.recentMessages.length).toBe(messagesBeforeUnmount);
              });
            }

            // Verify EventSource is open before unmount
            expect(eventSource.closed).toBe(false);
            expect(eventSource.readyState).toBe(1); // OPEN

            // Unmount the hook (simulating navigation)
            act(() => {
              unmount();
            });

            // Verify EventSource was closed
            expect(eventSource.closed).toBe(true);
            expect(eventSource.readyState).toBe(2); // CLOSED

            // Verify no new EventSource instances were created
            expect(MockEventSource.instances.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should clear reconnection timeout when unmounting', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.uuid(),
          }),
          async ({ conversationId }) => {
            // Reset MockEventSource instances for this property test iteration
            MockEventSource.reset();

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

            const { result, unmount } = renderHook(
              () =>
                useConversationStream({
                  conversationId,
                  enabled: true,
                }),
              { wrapper }
            );

            // Wait for EventSource to be created
            await waitFor(() => {
              expect(MockEventSource.instances.length).toBe(1);
            });

            const eventSource = MockEventSource.instances[0];

            // Simulate connection open
            act(() => {
              eventSource.simulateOpen();
            });

            await waitFor(() => {
              expect(result.current.isConnected).toBe(true);
            });

            // Simulate error to trigger reconnection logic
            act(() => {
              eventSource.simulateError();
            });

            await waitFor(() => {
              expect(result.current.isConnected).toBe(false);
            });

            // At this point, a reconnection timeout should be scheduled
            // Unmount before the reconnection happens
            act(() => {
              unmount();
            });

            // Advance timers past the reconnection delay
            await act(async () => {
              jest.advanceTimersByTime(5000);
            });

            // Verify no new EventSource was created (reconnection was cancelled)
            expect(MockEventSource.instances.length).toBe(1);

            // Verify the original EventSource is closed
            expect(eventSource.closed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should not process messages after unmount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.uuid(),
            messagesAfterUnmount: fc.integer({ max: 5, min: 1 }),
            messagesBeforeUnmount: fc.integer({ max: 5, min: 1 }),
          }),
          async ({ conversationId, messagesAfterUnmount, messagesBeforeUnmount }) => {
            // Reset MockEventSource instances for this property test iteration
            MockEventSource.reset();

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

            const receivedMessages: number[] = [];

            const { unmount } = renderHook(
              () =>
                useConversationStream({
                  conversationId,
                  enabled: true,
                  onMessageReceived: (event) => {
                    receivedMessages.push(event.data.sequence);
                  },
                }),
              { wrapper }
            );

            // Wait for EventSource to be created
            await waitFor(() => {
              expect(MockEventSource.instances.length).toBe(1);
            });

            const eventSource = MockEventSource.instances[0];

            // Simulate connection open
            act(() => {
              eventSource.simulateOpen();
            });

            // Send messages before unmount
            for (let i = 0; i < messagesBeforeUnmount; i++) {
              act(() => {
                eventSource.simulateMessage(
                  JSON.stringify({
                    conversationId,
                    data: {
                      content: `Message ${i}`,
                      role: 'assistant',
                      sequence: i,
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
              expect(receivedMessages.length).toBe(messagesBeforeUnmount);
            });

            // Unmount the hook
            act(() => {
              unmount();
            });

            // Try to send messages after unmount
            // These should NOT be processed
            for (let i = 0; i < messagesAfterUnmount; i++) {
              act(() => {
                eventSource.simulateMessage(
                  JSON.stringify({
                    conversationId,
                    data: {
                      content: `Message after unmount ${i}`,
                      role: 'assistant',
                      sequence: messagesBeforeUnmount + i,
                      timestamp: new Date().toISOString(),
                    },
                    timestamp: new Date().toISOString(),
                    type: 'message',
                  })
                );
              });
            }

            // Wait a bit to ensure no messages are processed
            await act(async () => {
              jest.advanceTimersByTime(1000);
            });

            // Verify only messages before unmount were received
            expect(receivedMessages.length).toBe(messagesBeforeUnmount);

            // Verify conversation cache only has messages from before unmount
            const conversation = queryClient.getQueryData<Conversation>(
              conversationKeys.detail(conversationId)
            );
            expect(conversation?.recentMessages.length).toBe(messagesBeforeUnmount);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should handle unmount during active message processing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.uuid(),
            messagesBeforeUnmount: fc.integer({ max: 5, min: 1 }),
          }),
          async ({ conversationId, messagesBeforeUnmount }) => {
            // Reset MockEventSource instances for this property test iteration
            MockEventSource.reset();

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

            let processingEventReceived = false;
            let completeEventReceived = false;

            const { unmount } = renderHook(
              () =>
                useConversationStream({
                  conversationId,
                  enabled: true,
                  onComplete: () => {
                    completeEventReceived = true;
                  },
                  onProcessing: () => {
                    processingEventReceived = true;
                  },
                }),
              { wrapper }
            );

            // Wait for EventSource to be created
            await waitFor(() => {
              expect(MockEventSource.instances.length).toBe(1);
            });

            const eventSource = MockEventSource.instances[0];

            // Simulate connection open
            act(() => {
              eventSource.simulateOpen();
            });

            // Send processing event
            act(() => {
              eventSource.simulateMessage(
                JSON.stringify({
                  conversationId,
                  data: {
                    jobId: 'job-123',
                    status: 'started',
                  },
                  timestamp: new Date().toISOString(),
                  type: 'processing',
                })
              );
            });

            await waitFor(() => {
              expect(processingEventReceived).toBe(true);
            });

            // Send some messages
            for (let i = 0; i < messagesBeforeUnmount; i++) {
              act(() => {
                eventSource.simulateMessage(
                  JSON.stringify({
                    conversationId,
                    data: {
                      content: `Message ${i}`,
                      role: 'assistant',
                      sequence: i,
                      timestamp: new Date().toISOString(),
                    },
                    timestamp: new Date().toISOString(),
                    type: 'message',
                  })
                );
              });
            }

            // Unmount BEFORE sending complete event (simulating navigation during processing)
            act(() => {
              unmount();
            });

            // Try to send complete event after unmount
            act(() => {
              eventSource.simulateMessage(
                JSON.stringify({
                  conversationId,
                  data: {
                    cost: 0.001,
                    jobId: 'job-123',
                    latency: 1000,
                    tokens: 100,
                  },
                  timestamp: new Date().toISOString(),
                  type: 'complete',
                })
              );
            });

            // Wait a bit
            await act(async () => {
              jest.advanceTimersByTime(1000);
            });

            // Verify complete event was NOT processed
            expect(completeEventReceived).toBe(false);

            // Verify EventSource is closed
            expect(eventSource.closed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should handle multiple mount/unmount cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.uuid(),
            cycles: fc.integer({ max: 5, min: 2 }),
            messagesPerCycle: fc.integer({ max: 3, min: 1 }),
          }),
          async ({ conversationId, cycles, messagesPerCycle }) => {
            // Reset MockEventSource instances for this property test iteration
            MockEventSource.reset();

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

            let totalMessages = 0;

            // Perform multiple mount/unmount cycles
            for (let cycle = 0; cycle < cycles; cycle++) {
              const { unmount } = renderHook(
                () =>
                  useConversationStream({
                    conversationId,
                    enabled: true,
                  }),
                { wrapper }
              );

              // Wait for EventSource to be created
              await waitFor(() => {
                expect(MockEventSource.instances.length).toBe(cycle + 1);
              });

              const eventSource = MockEventSource.instances[cycle];

              // Simulate connection open
              act(() => {
                eventSource.simulateOpen();
              });

              // Send messages
              for (let i = 0; i < messagesPerCycle; i++) {
                act(() => {
                  eventSource.simulateMessage(
                    JSON.stringify({
                      conversationId,
                      data: {
                        content: `Cycle ${cycle} Message ${i}`,
                        role: 'assistant',
                        sequence: totalMessages,
                        timestamp: new Date().toISOString(),
                      },
                      timestamp: new Date().toISOString(),
                      type: 'message',
                    })
                  );
                });
                totalMessages++;
              }

              // Wait for messages to be processed
              await waitFor(() => {
                const conversation = queryClient.getQueryData<Conversation>(
                  conversationKeys.detail(conversationId)
                );
                expect(conversation?.recentMessages.length).toBe(totalMessages);
              });

              // Unmount (simulating navigation away)
              act(() => {
                unmount();
              });

              // Verify EventSource is closed
              expect(eventSource.closed).toBe(true);

              // Wait a bit before next cycle
              await act(async () => {
                jest.advanceTimersByTime(100);
              });
            }

            // Verify all EventSources were closed
            for (const instance of MockEventSource.instances) {
              expect(instance.closed).toBe(true);
            }

            // Verify correct number of EventSource instances created
            expect(MockEventSource.instances.length).toBe(cycles);

            // Verify conversation has all messages
            const finalConversation = queryClient.getQueryData<Conversation>(
              conversationKeys.detail(conversationId)
            );
            expect(finalConversation?.recentMessages.length).toBe(totalMessages);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should not create new connections after unmount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            conversationId: fc.uuid(),
            waitTimeAfterUnmount: fc.integer({ max: 10000, min: 1000 }),
          }),
          async ({ conversationId, waitTimeAfterUnmount }) => {
            // Reset MockEventSource instances for this property test iteration
            MockEventSource.reset();

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

            const { unmount } = renderHook(
              () =>
                useConversationStream({
                  conversationId,
                  enabled: true,
                }),
              { wrapper }
            );

            // Wait for EventSource to be created
            await waitFor(() => {
              expect(MockEventSource.instances.length).toBe(1);
            });

            const eventSource = MockEventSource.instances[0];

            // Simulate connection open
            act(() => {
              eventSource.simulateOpen();
            });

            // Simulate error to trigger reconnection logic
            act(() => {
              eventSource.simulateError();
            });

            // Unmount immediately after error
            act(() => {
              unmount();
            });

            const instanceCountAfterUnmount = MockEventSource.instances.length;

            // Advance timers well past any reconnection delays
            await act(async () => {
              jest.advanceTimersByTime(waitTimeAfterUnmount);
            });

            // Verify no new EventSource instances were created
            expect(MockEventSource.instances.length).toBe(instanceCountAfterUnmount);

            // Verify the original EventSource is closed
            expect(eventSource.closed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});
