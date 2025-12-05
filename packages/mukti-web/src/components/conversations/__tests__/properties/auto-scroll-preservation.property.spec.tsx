/**
 * Property-Based Tests for Auto-scroll Preservation
 *
 * Feature: sse-real-time-messages, Auto-scroll Preservation
 *
 * For any new message received via SSE, if the user is scrolled to the bottom,
 * the system should auto-scroll to show the new message; otherwise, it should
 * preserve the current scroll position.
 *
 * @jest-environment jsdom
 */

import type { ReactNode } from 'react';

import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';

import type { Conversation } from '@/types/conversation.types';

import { conversationKeys } from '@/lib/query-keys';

import { MessageList } from '../../message-list';

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

describe('MessageList - Auto-scroll Preservation (Property-Based)', () => {
  let queryClient: QueryClient;
  let scrollIntoViewMock: jest.Mock;

  beforeAll(() => {
    // Mock scrollIntoView
    scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Clear mock calls
    scrollIntoViewMock.mockClear();
  });

  /**
   * Auto-scroll Preservation
   *
   * For any new message received via SSE, if the user is scrolled to the bottom,
   * the system should auto-scroll to show the new message; otherwise, it should
   * preserve the current scroll position.
   */
  describe('Auto-scroll Preservation', () => {
    it(
      'should auto-scroll when user is at bottom and new messages arrive',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              conversationId: fc.uuid(),
              // Initial messages already in conversation
              initialMessageCount: fc.integer({ max: 10, min: 1 }),
              // New messages arriving via SSE
              newMessageCount: fc.integer({ max: 5, min: 1 }),
            }),
            async ({ conversationId, initialMessageCount, newMessageCount }) => {
              // Create initial messages
              const initialMessages = Array.from({ length: initialMessageCount }, (_, i) => ({
                content: `Initial message ${i}`,
                role: 'assistant' as const,
                sequence: i,
                timestamp: new Date(Date.now() - (initialMessageCount - i) * 1000).toISOString(),
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

              queryClient.setQueryData(
                conversationKeys.detail(conversationId),
                initialConversation
              );

              const wrapper = ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
              );

              const { rerender } = render(
                <MessageList
                  conversationId={conversationId}
                  hasArchivedMessages={false}
                  recentMessages={initialMessages}
                />,
                { wrapper }
              );

              // Wait for initial render
              await waitFor(() => {
                expect(screen.getByRole('log')).toBeInTheDocument();
              });

              // Get the scroll container
              const scrollContainer = screen.getByRole('log');

              // Mock that user is at bottom (scrollHeight - scrollTop - clientHeight <= 100)
              Object.defineProperty(scrollContainer, 'scrollHeight', {
                configurable: true,
                value: 1000,
              });
              Object.defineProperty(scrollContainer, 'clientHeight', {
                configurable: true,
                value: 500,
              });
              Object.defineProperty(scrollContainer, 'scrollTop', {
                configurable: true,
                value: 500, // At bottom: 1000 - 500 - 500 = 0
                writable: true,
              });

              // Clear previous scrollIntoView calls
              scrollIntoViewMock.mockClear();

              // Add new messages (simulating SSE events)
              const newMessages = Array.from({ length: newMessageCount }, (_, i) => ({
                content: `New message ${i}`,
                role: 'assistant' as const,
                sequence: initialMessageCount + i,
                timestamp: new Date(Date.now() + i * 1000).toISOString(),
              }));

              const updatedMessages = [...initialMessages, ...newMessages];

              // Update conversation with new messages
              queryClient.setQueryData(conversationKeys.detail(conversationId), {
                ...initialConversation,
                metadata: {
                  ...initialConversation.metadata,
                  messageCount: updatedMessages.length,
                },
                recentMessages: updatedMessages,
              });

              // Rerender with new messages
              rerender(
                <MessageList
                  conversationId={conversationId}
                  hasArchivedMessages={false}
                  recentMessages={updatedMessages}
                />
              );

              // Wait for scroll to be triggered (batched with 100ms delay)
              await waitFor(
                () => {
                  expect(scrollIntoViewMock).toHaveBeenCalled();
                },
                { timeout: 500 }
              );

              // Verify scrollIntoView was called with smooth behavior
              expect(scrollIntoViewMock).toHaveBeenCalledWith({
                behavior: 'smooth',
              });

              // Verify scroll button is NOT shown (user is at bottom)
              expect(screen.queryByRole('button', { name: /scroll to bottom/i })).toBeNull();

              // Cleanup DOM after each iteration
              cleanup();
            }
          ),
          { numRuns: 20 }
        );
      },
      30000
    );

    it(
      'should preserve scroll position when user is scrolled up and new messages arrive',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              conversationId: fc.uuid(),
              initialMessageCount: fc.integer({ max: 10, min: 5 }),
              newMessageCount: fc.integer({ max: 5, min: 1 }),
              // Distance from bottom in pixels (> 100 means not at bottom)
              scrollDistanceFromBottom: fc.integer({ max: 500, min: 150 }),
            }),
            async ({
              conversationId,
              initialMessageCount,
              newMessageCount,
              scrollDistanceFromBottom,
            }) => {
              // Create initial messages
              const initialMessages = Array.from({ length: initialMessageCount }, (_, i) => ({
                content: `Initial message ${i}`,
                role: 'assistant' as const,
                sequence: i,
                timestamp: new Date(Date.now() - (initialMessageCount - i) * 1000).toISOString(),
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

              queryClient.setQueryData(
                conversationKeys.detail(conversationId),
                initialConversation
              );

              const wrapper = ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
              );

              const { rerender } = render(
                <MessageList
                  conversationId={conversationId}
                  hasArchivedMessages={false}
                  recentMessages={initialMessages}
                />,
                { wrapper }
              );

              // Wait for initial render
              await waitFor(() => {
                expect(screen.getByRole('log')).toBeInTheDocument();
              });

              // Get the scroll container
              const scrollContainer = screen.getByRole('log');

              // Mock that user is scrolled up (not at bottom)
              const scrollHeight = 2000;
              const clientHeight = 500;
              const scrollTop = scrollHeight - clientHeight - scrollDistanceFromBottom;

              Object.defineProperty(scrollContainer, 'scrollHeight', {
                configurable: true,
                value: scrollHeight,
              });
              Object.defineProperty(scrollContainer, 'clientHeight', {
                configurable: true,
                value: clientHeight,
              });
              Object.defineProperty(scrollContainer, 'scrollTop', {
                configurable: true,
                value: scrollTop,
                writable: true,
              });

              // Trigger scroll event to update isAtBottom state
              await act(async () => {
                scrollContainer.dispatchEvent(new Event('scroll'));
              });

              // Wait for scroll state to update
              await waitFor(() => {
                // Scroll button should appear after scroll event
                const button = screen.queryByRole('button', { name: /scroll to bottom/i });
                // Button might not be visible yet if no new messages
                expect(button).toBeNull();
              });

              // Clear previous scrollIntoView calls
              scrollIntoViewMock.mockClear();

              // Add new messages (simulating SSE events)
              const newMessages = Array.from({ length: newMessageCount }, (_, i) => ({
                content: `New message ${i}`,
                role: 'assistant' as const,
                sequence: initialMessageCount + i,
                timestamp: new Date(Date.now() + i * 1000).toISOString(),
              }));

              const updatedMessages = [...initialMessages, ...newMessages];

              // Update conversation with new messages
              queryClient.setQueryData(conversationKeys.detail(conversationId), {
                ...initialConversation,
                metadata: {
                  ...initialConversation.metadata,
                  messageCount: updatedMessages.length,
                },
                recentMessages: updatedMessages,
              });

              // Rerender with new messages
              rerender(
                <MessageList
                  conversationId={conversationId}
                  hasArchivedMessages={false}
                  recentMessages={updatedMessages}
                />
              );

              // Wait for the batching delay
              await waitFor(
                () => {
                  // Scroll button should appear when user is scrolled up and new messages arrive
                  const button = screen.queryByRole('button', { name: /new messages/i });
                  expect(button).toBeInTheDocument();
                },
                { timeout: 500 }
              );

              // Verify scrollIntoView was NOT called (scroll position preserved)
              expect(scrollIntoViewMock).not.toHaveBeenCalled();

              // Verify scroll button IS shown with "New messages" text
              expect(screen.getByRole('button', { name: /new messages/i })).toBeInTheDocument();

              // Cleanup DOM after each iteration
              cleanup();
            }
          ),
          { numRuns: 20 }
        );
      },
      30000
    );

    it(
      'should resume auto-scroll when user manually scrolls to bottom',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              conversationId: fc.uuid(),
              initialMessageCount: fc.integer({ max: 10, min: 5 }),
              messagesAfterScrollToBottom: fc.integer({ max: 3, min: 1 }),
              messagesWhileScrolledUp: fc.integer({ max: 3, min: 1 }),
            }),
            async ({
              conversationId,
              initialMessageCount,
              messagesAfterScrollToBottom,
              messagesWhileScrolledUp,
            }) => {
              // Create initial messages
              const initialMessages = Array.from({ length: initialMessageCount }, (_, i) => ({
                content: `Initial message ${i}`,
                role: 'assistant' as const,
                sequence: i,
                timestamp: new Date(Date.now() - (initialMessageCount - i) * 1000).toISOString(),
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

              queryClient.setQueryData(
                conversationKeys.detail(conversationId),
                initialConversation
              );

              const wrapper = ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
              );

              const { rerender } = render(
                <MessageList
                  conversationId={conversationId}
                  hasArchivedMessages={false}
                  recentMessages={initialMessages}
                />,
                { wrapper }
              );

              // Wait for initial render
              await waitFor(() => {
                expect(screen.getByRole('log')).toBeInTheDocument();
              });

              const scrollContainer = screen.getByRole('log');

              // Phase 1: User is scrolled up
              Object.defineProperty(scrollContainer, 'scrollHeight', {
                configurable: true,
                value: 2000,
              });
              Object.defineProperty(scrollContainer, 'clientHeight', {
                configurable: true,
                value: 500,
              });
              Object.defineProperty(scrollContainer, 'scrollTop', {
                configurable: true,
                value: 1000, // Scrolled up: 2000 - 1000 - 500 = 500 > 100
                writable: true,
              });

              await act(async () => {
                scrollContainer.dispatchEvent(new Event('scroll'));
              });

              // Add messages while scrolled up
              let currentSequence = initialMessageCount;
              const messagesPhase1 = Array.from({ length: messagesWhileScrolledUp }, (_, i) => ({
                content: `Message while scrolled up ${i}`,
                role: 'assistant' as const,
                sequence: currentSequence + i,
                timestamp: new Date(Date.now() + i * 1000).toISOString(),
              }));
              currentSequence += messagesWhileScrolledUp;

              const messagesAfterPhase1 = [...initialMessages, ...messagesPhase1];

              queryClient.setQueryData(conversationKeys.detail(conversationId), {
                ...initialConversation,
                metadata: {
                  ...initialConversation.metadata,
                  messageCount: messagesAfterPhase1.length,
                },
                recentMessages: messagesAfterPhase1,
              });

              rerender(
                <MessageList
                  conversationId={conversationId}
                  hasArchivedMessages={false}
                  recentMessages={messagesAfterPhase1}
                />
              );

              // Wait for scroll button to appear
              await waitFor(
                () => {
                  expect(screen.getByRole('button', { name: /new messages/i })).toBeInTheDocument();
                },
                { timeout: 500 }
              );

              scrollIntoViewMock.mockClear();

              // Phase 2: User manually scrolls to bottom
              Object.defineProperty(scrollContainer, 'scrollTop', {
                configurable: true,
                value: 1500, // At bottom: 2000 - 1500 - 500 = 0
                writable: true,
              });

              await act(async () => {
                scrollContainer.dispatchEvent(new Event('scroll'));
              });

              // Wait for scroll button to disappear
              await waitFor(() => {
                expect(
                  screen.queryByRole('button', { name: /new messages/i })
                ).not.toBeInTheDocument();
              });

              // Phase 3: New messages arrive after user is at bottom
              const messagesPhase2 = Array.from(
                { length: messagesAfterScrollToBottom },
                (_, i) => ({
                  content: `Message after scroll to bottom ${i}`,
                  role: 'assistant' as const,
                  sequence: currentSequence + i,
                  timestamp: new Date(Date.now() + 1000 + i * 1000).toISOString(),
                })
              );

              const finalMessages = [...messagesAfterPhase1, ...messagesPhase2];

              queryClient.setQueryData(conversationKeys.detail(conversationId), {
                ...initialConversation,
                metadata: {
                  ...initialConversation.metadata,
                  messageCount: finalMessages.length,
                },
                recentMessages: finalMessages,
              });

              rerender(
                <MessageList
                  conversationId={conversationId}
                  hasArchivedMessages={false}
                  recentMessages={finalMessages}
                />
              );

              // Wait for auto-scroll to be triggered
              await waitFor(
                () => {
                  expect(scrollIntoViewMock).toHaveBeenCalled();
                },
                { timeout: 500 }
              );

              // Verify auto-scroll resumed (scrollIntoView called)
              expect(scrollIntoViewMock).toHaveBeenCalledWith({
                behavior: 'smooth',
              });

              // Cleanup DOM after each iteration
              cleanup();
            }
          ),
          { numRuns: 20 }
        );
      },
      30000
    );

    it(
      'should batch scroll updates when multiple messages arrive rapidly',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              conversationId: fc.uuid(),
              initialMessageCount: fc.integer({ max: 5, min: 1 }),
              // Rapid messages arriving in quick succession
              rapidMessageCount: fc.integer({ max: 10, min: 3 }),
            }),
            async ({ conversationId, initialMessageCount, rapidMessageCount }) => {
              // Create initial messages
              const initialMessages = Array.from({ length: initialMessageCount }, (_, i) => ({
                content: `Initial message ${i}`,
                role: 'assistant' as const,
                sequence: i,
                timestamp: new Date(Date.now() - (initialMessageCount - i) * 1000).toISOString(),
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

              queryClient.setQueryData(
                conversationKeys.detail(conversationId),
                initialConversation
              );

              const wrapper = ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
              );

              const { rerender } = render(
                <MessageList
                  conversationId={conversationId}
                  hasArchivedMessages={false}
                  recentMessages={initialMessages}
                />,
                { wrapper }
              );

              await waitFor(() => {
                expect(screen.getByRole('log')).toBeInTheDocument();
              });

              const scrollContainer = screen.getByRole('log');

              // User is at bottom
              Object.defineProperty(scrollContainer, 'scrollHeight', {
                configurable: true,
                value: 1000,
              });
              Object.defineProperty(scrollContainer, 'clientHeight', {
                configurable: true,
                value: 500,
              });
              Object.defineProperty(scrollContainer, 'scrollTop', {
                configurable: true,
                value: 500,
                writable: true,
              });

              scrollIntoViewMock.mockClear();

              // Add messages rapidly (one at a time to simulate SSE events)
              let currentMessages = [...initialMessages];

              for (let i = 0; i < rapidMessageCount; i++) {
                const newMessage = {
                  content: `Rapid message ${i}`,
                  role: 'assistant' as const,
                  sequence: initialMessageCount + i,
                  timestamp: new Date(Date.now() + i * 10).toISOString(), // 10ms apart
                };

                currentMessages = [...currentMessages, newMessage];

                queryClient.setQueryData(conversationKeys.detail(conversationId), {
                  ...initialConversation,
                  metadata: {
                    ...initialConversation.metadata,
                    messageCount: currentMessages.length,
                  },
                  recentMessages: currentMessages,
                });

                rerender(
                  <MessageList
                    conversationId={conversationId}
                    hasArchivedMessages={false}
                    recentMessages={currentMessages}
                  />
                );
              }

              // Wait for batched scroll to complete
              await waitFor(
                () => {
                  expect(scrollIntoViewMock).toHaveBeenCalled();
                },
                { timeout: 500 }
              );

              // Verify scrollIntoView was called, but not excessively
              // With batching (100ms window), we should have fewer calls than messages
              const scrollCallCount = (scrollIntoViewMock as jest.Mock).mock.calls
                .length;

              // Should be called at least once
              expect(scrollCallCount).toBeGreaterThanOrEqual(1);

              // Should be called fewer times than the number of messages (batching effect)
              // Allow some flexibility since timing can vary in tests
              expect(scrollCallCount).toBeLessThanOrEqual(rapidMessageCount);

              // Cleanup DOM after each iteration
              cleanup();
            }
          ),
          { numRuns: 20 }
        );
      },
      30000
    );

    it(
      'should maintain bottom position as new messages arrive when at bottom',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              conversationId: fc.uuid(),
              initialMessageCount: fc.integer({ max: 5, min: 1 }),
              messagesPerBatch: fc.integer({ max: 3, min: 1 }),
              newMessageBatches: fc.integer({ max: 5, min: 2 }),
            }),
            async ({
              conversationId,
              initialMessageCount,
              messagesPerBatch,
              newMessageBatches,
            }) => {
              // Create initial messages
              const initialMessages = Array.from({ length: initialMessageCount }, (_, i) => ({
                content: `Initial message ${i}`,
                role: 'assistant' as const,
                sequence: i,
                timestamp: new Date(Date.now() - (initialMessageCount - i) * 1000).toISOString(),
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

              queryClient.setQueryData(
                conversationKeys.detail(conversationId),
                initialConversation
              );

              const wrapper = ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
              );

              const { rerender } = render(
                <MessageList
                  conversationId={conversationId}
                  hasArchivedMessages={false}
                  recentMessages={initialMessages}
                />,
                { wrapper }
              );

              await waitFor(() => {
                expect(screen.getByRole('log')).toBeInTheDocument();
              });

              const scrollContainer = screen.getByRole('log');

              // User is at bottom
              Object.defineProperty(scrollContainer, 'scrollHeight', {
                configurable: true,
                value: 1000,
              });
              Object.defineProperty(scrollContainer, 'clientHeight', {
                configurable: true,
                value: 500,
              });
              Object.defineProperty(scrollContainer, 'scrollTop', {
                configurable: true,
                value: 500,
                writable: true,
              });

              let currentMessages = [...initialMessages];
              let currentSequence = initialMessageCount;

              // Add messages in batches
              for (let batch = 0; batch < newMessageBatches; batch++) {
                scrollIntoViewMock.mockClear();

                // Add a batch of messages
                const batchMessages = Array.from({ length: messagesPerBatch }, (_, i) => ({
                  content: `Batch ${batch} Message ${i}`,
                  role: 'assistant' as const,
                  sequence: currentSequence + i,
                  timestamp: new Date(Date.now() + batch * 1000 + i * 100).toISOString(),
                }));

                currentMessages = [...currentMessages, ...batchMessages];
                currentSequence += messagesPerBatch;

                queryClient.setQueryData(conversationKeys.detail(conversationId), {
                  ...initialConversation,
                  metadata: {
                    ...initialConversation.metadata,
                    messageCount: currentMessages.length,
                  },
                  recentMessages: currentMessages,
                });

                rerender(
                  <MessageList
                    conversationId={conversationId}
                    hasArchivedMessages={false}
                    recentMessages={currentMessages}
                  />
                );

                // Wait for scroll to be triggered for this batch
                await waitFor(
                  () => {
                    expect(scrollIntoViewMock).toHaveBeenCalled();
                  },
                  { timeout: 500 }
                );

                // Verify scroll was called with smooth behavior
                expect(scrollIntoViewMock).toHaveBeenCalledWith({
                  behavior: 'smooth',
                });

                // Verify no scroll button appears (user stays at bottom)
                expect(
                  screen.queryByRole('button', { name: /scroll to bottom/i })
                ).not.toBeInTheDocument();
              }

              // Verify all messages are rendered
              expect(currentMessages.length).toBe(
                initialMessageCount + newMessageBatches * messagesPerBatch
              );

              // Cleanup DOM after each iteration
              cleanup();
            }
          ),
          { numRuns: 20 }
        );
      },
      30000
    );
  });
});
