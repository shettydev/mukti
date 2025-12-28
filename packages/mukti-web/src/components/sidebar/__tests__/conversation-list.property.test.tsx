/**
 * Property-based tests for ConversationList component
 *
 * **Sidebar updates reactively**
 *
 * Tests that:
 * - Sidebar updates reactively when conversation titles change or new conversations are created
 * - New conversations appear at the top of the sidebar conversation list
 * - Clicking a conversation in the sidebar navigates to `/chat/:id`
 * - When a conversation is active (its ID matches the activeConversationId
 *   or the URL param), it should have a visual highlight in the sidebar conversation list.
 */

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';

import type { Conversation, SocraticTechnique } from '@/types/conversation.types';

import { ConversationList } from '../conversation-list';

// Mock next/navigation
const mockPush = jest.fn();
const mockParams: { id?: string } = {};

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the hooks
const mockUseInfiniteConversations = jest.fn();
const mockUseDeleteConversation = jest.fn();
const mockUseUpdateConversation = jest.fn();

jest.mock('@/lib/hooks/use-conversations', () => ({
  useDeleteConversation: () => mockUseDeleteConversation(),
  useInfiniteConversations: () => mockUseInfiniteConversations(),
  useUpdateConversation: () => mockUseUpdateConversation(),
}));

// Mock the conversations API
jest.mock('@/lib/api/conversations', () => ({
  conversationsApi: {
    update: jest.fn().mockResolvedValue({}),
  },
}));

// Valid Socratic techniques
const VALID_TECHNIQUES: SocraticTechnique[] = [
  'elenchus',
  'maieutics',
  'dialectic',
  'definitional',
  'analogical',
  'counterfactual',
];

// Arbitrary for generating conversation IDs - using uniqueArray to ensure no duplicates
const conversationIdArbitrary = fc.uuid();

// Arbitrary for generating conversation titles
const conversationTitleArbitrary = fc
  .string({ maxLength: 60, minLength: 1 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// Arbitrary for generating unique conversation data (id, title pairs)
// Ensures both IDs and titles are unique
const uniqueConversationDataArbitrary = (minLength: number, maxLength: number) =>
  fc.uniqueArray(fc.tuple(conversationIdArbitrary, conversationTitleArbitrary), {
    comparator: (a, b) => a[0] === b[0] || a[1] === b[1], // Compare by ID or title
    maxLength,
    minLength,
  });

// Helper to create a mock conversation
const createMockConversation = (
  id: string,
  title: string,
  technique: SocraticTechnique = 'elenchus'
): Conversation => ({
  createdAt: new Date().toISOString(),
  hasArchivedMessages: false,
  id,
  isArchived: false,
  isFavorite: false,
  metadata: {
    estimatedCost: 0,
    lastMessageAt: new Date().toISOString(),
    messageCount: 5,
    totalTokens: 100,
  },
  recentMessages: [],
  tags: [],
  technique,
  title,
  updatedAt: new Date().toISOString(),
  userId: 'user-123',
});

describe('ConversationList - Property Tests', () => {
  /**
   * Sidebar updates reactively
   *
   * For any conversation title update or new conversation creation,
   * the sidebar conversation list should reflect the change immediately.
   *
   */
  describe('Sidebar updates reactively', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockParams.id = undefined;

      // Default mock implementations
      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      mockUseUpdateConversation.mockReturnValue({
        mutate: jest.fn(),
      });
    });

    afterEach(() => {
      cleanup();
    });

    it('should reflect title changes immediately when conversation data updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a list of 2-5 unique conversations
          uniqueConversationDataArbitrary(2, 5),
          // Select one index to update
          fc.nat(),
          // Generate a new title
          conversationTitleArbitrary,
          fc.constantFrom(...VALID_TECHNIQUES),
          async (conversationData, updateIndexSeed, newTitle, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Create conversations from generated data
            const conversations = conversationData.map(([id, title]) =>
              createMockConversation(id, title, technique)
            );

            // Select conversation to update using modulo to ensure valid index
            const updateIndex = updateIndexSeed % conversations.length;
            const originalTitle = conversations[updateIndex].title;

            // Ensure new title is different from original
            if (newTitle === originalTitle) {
              return; // Skip this test case
            }

            // Setup mock to return initial conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: conversations,
                    meta: { limit: 20, page: 1, total: conversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            const { rerender } = render(<ConversationList collapsed={false} />);

            // Verify original title is displayed
            const originalItems = screen
              .getAllByRole('button')
              .filter((item) => item.getAttribute('title') === originalTitle);
            expect(originalItems.length).toBeGreaterThan(0);

            // Update the conversation title (simulating reactive update)
            const updatedConversations = conversations.map((conv, index) =>
              index === updateIndex
                ? { ...conv, title: newTitle, updatedAt: new Date().toISOString() }
                : conv
            );

            // Update mock to return updated conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: updatedConversations,
                    meta: { limit: 20, page: 1, total: updatedConversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            // Re-render to simulate reactive update
            rerender(<ConversationList collapsed={false} />);

            // Verify new title is displayed
            const updatedItems = screen
              .getAllByRole('button')
              .filter((item) => item.getAttribute('title') === newTitle);
            expect(updatedItems.length).toBeGreaterThan(0);

            // Verify original title is no longer displayed
            const oldItems = screen
              .queryAllByRole('button')
              .filter((item) => item.getAttribute('title') === originalTitle);
            expect(oldItems.length).toBe(0);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should reflect new conversation immediately when added to the list', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate existing conversations
          uniqueConversationDataArbitrary(2, 4),
          // Generate a new conversation
          conversationIdArbitrary,
          conversationTitleArbitrary,
          fc.constantFrom(...VALID_TECHNIQUES),
          async (existingConversationData, newId, newTitle, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Ensure the new ID and title are unique
            const existingIds = existingConversationData.map(([id]) => id);
            const existingTitles = existingConversationData.map(([, title]) => title);
            if (existingIds.includes(newId) || existingTitles.includes(newTitle)) {
              return; // Skip this test case if there's a collision
            }

            // Create existing conversations
            const existingConversations = existingConversationData.map(([id, title]) =>
              createMockConversation(id, title, technique)
            );

            // Setup mock to return initial conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: existingConversations,
                    meta: {
                      limit: 20,
                      page: 1,
                      total: existingConversations.length,
                      totalPages: 1,
                    },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            const { rerender } = render(<ConversationList collapsed={false} />);

            // Verify new conversation is not yet displayed
            const initialItems = screen
              .queryAllByRole('button')
              .filter((item) => item.getAttribute('title') === newTitle);
            expect(initialItems.length).toBe(0);

            // Create the new conversation
            const newConversation = createMockConversation(newId, newTitle, technique);
            newConversation.updatedAt = new Date().toISOString();

            // Add new conversation to the list (at the top)
            const updatedConversations = [newConversation, ...existingConversations];

            // Update mock to return updated conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: updatedConversations,
                    meta: { limit: 20, page: 1, total: updatedConversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            // Re-render to simulate reactive update
            rerender(<ConversationList collapsed={false} />);

            // Verify new conversation is now displayed
            const newItems = screen
              .getAllByRole('button')
              .filter((item) => item.getAttribute('title') === newTitle);
            expect(newItems.length).toBeGreaterThan(0);

            // Verify total count increased
            const allConversationButtons = screen
              .getAllByRole('button')
              .filter((item) => item.getAttribute('title') !== null);
            expect(allConversationButtons.length).toBe(updatedConversations.length);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should maintain correct order after title update (sorted by updatedAt)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a list of 3-5 unique conversations
          uniqueConversationDataArbitrary(3, 5),
          // Select one index to update
          fc.nat(),
          // Generate a new title
          conversationTitleArbitrary,
          fc.constantFrom(...VALID_TECHNIQUES),
          async (conversationData, updateIndexSeed, newTitle, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Create conversations with timestamps
            const now = Date.now();
            const conversations = conversationData.map(([id, title], index) => {
              const conv = createMockConversation(id, title, technique);
              // Older conversations have older timestamps
              conv.updatedAt = new Date(now - (index + 1) * 60000).toISOString();
              conv.metadata.lastMessageAt = conv.updatedAt;
              return conv;
            });

            // Select conversation to update using modulo to ensure valid index
            const updateIndex = updateIndexSeed % conversations.length;
            const originalTitle = conversations[updateIndex].title;

            // Ensure new title is different from original and unique
            const existingTitles = conversations.map((c) => c.title);
            if (newTitle === originalTitle || existingTitles.includes(newTitle)) {
              return; // Skip this test case
            }

            // Setup mock to return initial conversations (sorted by updatedAt desc)
            const sortedConversations = [...conversations].sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );

            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: sortedConversations,
                    meta: { limit: 20, page: 1, total: sortedConversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            const { rerender } = render(<ConversationList collapsed={false} />);

            // Update the conversation title and timestamp (making it the most recent)
            const updatedConversations = conversations.map((conv, index) =>
              index === updateIndex
                ? { ...conv, title: newTitle, updatedAt: new Date().toISOString() }
                : conv
            );

            // Re-sort after update
            const reSortedConversations = [...updatedConversations].sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );

            // Update mock to return updated and re-sorted conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: reSortedConversations,
                    meta: {
                      limit: 20,
                      page: 1,
                      total: reSortedConversations.length,
                      totalPages: 1,
                    },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            // Re-render to simulate reactive update
            rerender(<ConversationList collapsed={false} />);

            // Verify the updated conversation is now at the top (most recent)
            const conversationButtons = screen
              .getAllByRole('button')
              .filter((item) => item.getAttribute('title') !== null);

            // The first conversation should be the one we just updated
            expect(conversationButtons[0].getAttribute('title')).toBe(newTitle);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);
  });

  /**
   * New conversations appear at top
   *
   * For any newly created conversation, it should appear at the top of the
   * sidebar conversation list.
   *
   */
  describe('New conversations appear at top', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockParams.id = undefined;

      // Default mock implementations
      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      mockUseUpdateConversation.mockReturnValue({
        mutate: jest.fn(),
      });
    });

    afterEach(() => {
      cleanup();
    });

    it('should display conversations in the order provided (newest first)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a list of 3-6 unique conversations
          uniqueConversationDataArbitrary(3, 6),
          fc.constantFrom(...VALID_TECHNIQUES),
          async (conversationData, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Create conversations from generated data with timestamps
            // The first conversation in the array should be the newest (most recent updatedAt)
            const now = Date.now();
            const conversations = conversationData.map(([id, title], index) => {
              const conv = createMockConversation(id, title, technique);
              // Make earlier items in array have more recent timestamps
              conv.updatedAt = new Date(now - index * 1000).toISOString();
              conv.metadata.lastMessageAt = conv.updatedAt;
              return conv;
            });

            // Setup mock to return conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: conversations,
                    meta: { limit: 20, page: 1, total: conversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            render(<ConversationList collapsed={false} />);

            // Find all conversation items
            const conversationItems = screen.getAllByRole('button');

            // Filter to only conversation items (exclude checkboxes and other buttons)
            const conversationButtons = conversationItems.filter(
              (item) => item.getAttribute('title') !== null
            );

            // Verify we have the expected number of conversations
            expect(conversationButtons.length).toBe(conversations.length);

            // Verify the order matches the input order (newest first)
            conversationButtons.forEach((button, index) => {
              expect(button.getAttribute('title')).toBe(conversations[index].title);
            });
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should show the newest conversation at the top when a new conversation is added', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate existing conversations
          uniqueConversationDataArbitrary(2, 4),
          // Generate a new conversation
          conversationIdArbitrary,
          conversationTitleArbitrary,
          fc.constantFrom(...VALID_TECHNIQUES),
          async (existingConversationData, newId, newTitle, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Ensure the new ID and title are unique
            const existingIds = existingConversationData.map(([id]) => id);
            const existingTitles = existingConversationData.map(([, title]) => title);
            if (existingIds.includes(newId) || existingTitles.includes(newTitle)) {
              // Skip this test case if there's a collision
              return;
            }

            // Create existing conversations with older timestamps
            const now = Date.now();
            const existingConversations = existingConversationData.map(([id, title], index) => {
              const conv = createMockConversation(id, title, technique);
              // Existing conversations have older timestamps
              conv.updatedAt = new Date(now - (index + 1) * 60000).toISOString();
              conv.metadata.lastMessageAt = conv.updatedAt;
              return conv;
            });

            // Create the new conversation with the most recent timestamp
            const newConversation = createMockConversation(newId, newTitle, technique);
            newConversation.updatedAt = new Date(now).toISOString();
            newConversation.metadata.lastMessageAt = newConversation.updatedAt;

            // The new conversation should be at the top
            const allConversations = [newConversation, ...existingConversations];

            // Setup mock to return conversations with new one at top
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: allConversations,
                    meta: { limit: 20, page: 1, total: allConversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            render(<ConversationList collapsed={false} />);

            // Find all conversation items
            const conversationItems = screen.getAllByRole('button');

            // Filter to only conversation items (exclude checkboxes and other buttons)
            const conversationButtons = conversationItems.filter(
              (item) => item.getAttribute('title') !== null
            );

            // Verify the new conversation is at the top
            expect(conversationButtons[0].getAttribute('title')).toBe(newTitle);

            // Verify the order is maintained (newest first)
            expect(conversationButtons.length).toBe(allConversations.length);
            conversationButtons.forEach((button, index) => {
              expect(button.getAttribute('title')).toBe(allConversations[index].title);
            });
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should maintain newest-first order regardless of conversation content', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a list of 3-5 unique conversations
          uniqueConversationDataArbitrary(3, 5),
          // Generate random timestamps to shuffle
          fc.array(fc.nat({ max: 1000000 }), { maxLength: 5, minLength: 3 }),
          fc.constantFrom(...VALID_TECHNIQUES),
          async (conversationData, timestampOffsets, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Ensure we have enough timestamp offsets
            const offsets = timestampOffsets.slice(0, conversationData.length);
            while (offsets.length < conversationData.length) {
              offsets.push(Math.floor(Math.random() * 1000000));
            }

            // Create conversations with random timestamps
            const now = Date.now();
            const conversations = conversationData.map(([id, title], index) => {
              const conv = createMockConversation(id, title, technique);
              conv.updatedAt = new Date(now - offsets[index]).toISOString();
              conv.metadata.lastMessageAt = conv.updatedAt;
              return conv;
            });

            // Sort by updatedAt descending (newest first) - this is what the API should return
            const sortedConversations = [...conversations].sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );

            // Setup mock to return sorted conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: sortedConversations,
                    meta: { limit: 20, page: 1, total: sortedConversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            render(<ConversationList collapsed={false} />);

            // Find all conversation items
            const conversationItems = screen.getAllByRole('button');

            // Filter to only conversation items (exclude checkboxes and other buttons)
            const conversationButtons = conversationItems.filter(
              (item) => item.getAttribute('title') !== null
            );

            // Verify the first conversation displayed is the one with the most recent timestamp
            const newestConversation = sortedConversations[0];
            expect(conversationButtons[0].getAttribute('title')).toBe(newestConversation.title);

            // Verify the entire order matches the sorted order
            conversationButtons.forEach((button, index) => {
              expect(button.getAttribute('title')).toBe(sortedConversations[index].title);
            });
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);
  });

  /**
   * Sidebar navigation works
   *
   * For any conversation in the sidebar list, clicking it should navigate to `/chat/:id`
   *
   */
  describe('Sidebar navigation works', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockParams.id = undefined;

      // Default mock implementations
      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      mockUseUpdateConversation.mockReturnValue({
        mutate: jest.fn(),
      });
    });

    afterEach(() => {
      cleanup();
    });

    it('should navigate to /chat/:id when clicking a conversation', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          // Generate a list of 2-5 unique conversations
          uniqueConversationDataArbitrary(2, 5),
          // Select one index to click
          fc.nat(),
          fc.constantFrom(...VALID_TECHNIQUES),
          async (conversationData, clickIndexSeed, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Create conversations from generated data
            const conversations = conversationData.map(([id, title]) =>
              createMockConversation(id, title, technique)
            );

            // Select conversation to click using modulo to ensure valid index
            const clickIndex = clickIndexSeed % conversations.length;
            const targetConversation = conversations[clickIndex];

            // Setup mock to return conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: conversations,
                    meta: { limit: 20, page: 1, total: conversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            render(<ConversationList collapsed={false} />);

            // Find the conversation item to click - use getAllByTitle and filter for the button
            const conversationItems = screen.getAllByTitle(targetConversation.title);
            const conversationItem = conversationItems.find(
              (item) => item.getAttribute('role') === 'button'
            );

            expect(conversationItem).toBeTruthy();

            // Click the conversation
            await user.click(conversationItem!);

            // Verify router.push was called with the correct path
            expect(mockPush).toHaveBeenCalledWith(`/chat/${targetConversation.id}`);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should call onConversationClick callback when clicking a conversation', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          // Generate a list of 2-5 unique conversations
          uniqueConversationDataArbitrary(2, 5),
          // Select one index to click
          fc.nat(),
          fc.constantFrom(...VALID_TECHNIQUES),
          async (conversationData, clickIndexSeed, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Create conversations from generated data
            const conversations = conversationData.map(([id, title]) =>
              createMockConversation(id, title, technique)
            );

            // Select conversation to click using modulo to ensure valid index
            const clickIndex = clickIndexSeed % conversations.length;
            const targetConversation = conversations[clickIndex];

            // Setup mock to return conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: conversations,
                    meta: { limit: 20, page: 1, total: conversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            // Create a mock callback
            const mockOnConversationClick = jest.fn();

            render(
              <ConversationList collapsed={false} onConversationClick={mockOnConversationClick} />
            );

            // Find the conversation item to click - use getAllByTitle and filter for the button
            const conversationItems = screen.getAllByTitle(targetConversation.title);
            const conversationItem = conversationItems.find(
              (item) => item.getAttribute('role') === 'button'
            );

            expect(conversationItem).toBeTruthy();

            // Click the conversation
            await user.click(conversationItem!);

            // Verify the callback was called with the correct ID
            expect(mockOnConversationClick).toHaveBeenCalledWith(targetConversation.id);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should navigate to correct conversation regardless of list position', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          // Generate a list of 3-6 unique conversations
          uniqueConversationDataArbitrary(3, 6),
          // Generate multiple click indices to test different positions
          fc.array(fc.nat(), { maxLength: 3, minLength: 1 }),
          fc.constantFrom(...VALID_TECHNIQUES),
          async (conversationData, clickIndices, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Create conversations from generated data
            const conversations = conversationData.map(([id, title]) =>
              createMockConversation(id, title, technique)
            );

            // Setup mock to return conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: conversations,
                    meta: { limit: 20, page: 1, total: conversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            render(<ConversationList collapsed={false} />);

            // Test clicking multiple conversations
            for (const indexSeed of clickIndices) {
              const clickIndex = indexSeed % conversations.length;
              const targetConversation = conversations[clickIndex];

              // Find the conversation item to click - use getAllByTitle and filter for the button
              const conversationItems = screen.getAllByTitle(targetConversation.title);
              const conversationItem = conversationItems.find(
                (item) => item.getAttribute('role') === 'button'
              );

              expect(conversationItem).toBeTruthy();

              // Click the conversation
              await user.click(conversationItem!);

              // Verify router.push was called with the correct path
              expect(mockPush).toHaveBeenCalledWith(`/chat/${targetConversation.id}`);
            }
          }
        ),
        { numRuns: 15 }
      );
    }, 60000);
  });

  /**
   * Active conversation is highlighted
   *
   * For any active conversation, it should have a visual highlight
   * in the sidebar conversation list.
   *
   */
  describe('Active conversation is highlighted', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockParams.id = undefined;

      // Default mock implementations
      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      mockUseUpdateConversation.mockReturnValue({
        mutate: jest.fn(),
      });
    });

    afterEach(() => {
      cleanup();
    });

    it('should highlight the active conversation when activeConversationId prop matches', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a list of 2-5 unique conversations
          uniqueConversationDataArbitrary(2, 5),
          // Select one index to be the active conversation
          fc.nat(),
          fc.constantFrom(...VALID_TECHNIQUES),
          async (conversationData, activeIndexSeed, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Create conversations from generated data
            const conversations = conversationData.map(([id, title]) =>
              createMockConversation(id, title, technique)
            );

            // Select active conversation using modulo to ensure valid index
            const activeIndex = activeIndexSeed % conversations.length;
            const activeConversationId = conversations[activeIndex].id;

            // Setup mock to return conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: conversations,
                    meta: { limit: 20, page: 1, total: conversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            render(
              <ConversationList activeConversationId={activeConversationId} collapsed={false} />
            );

            // Find all conversation items
            const conversationItems = screen.getAllByRole('button');

            // Filter to only conversation items (exclude checkboxes and other buttons)
            const conversationButtons = conversationItems.filter(
              (item) => item.getAttribute('title') !== null
            );

            // Verify we have the expected number of conversations
            expect(conversationButtons.length).toBe(conversations.length);

            // Find the active conversation item
            const activeItem = conversationButtons.find(
              (item) => item.getAttribute('title') === conversations[activeIndex].title
            );

            expect(activeItem).toBeTruthy();

            // Verify the active conversation has the highlight class
            // The active class is 'bg-white/10 text-white font-medium'
            expect(activeItem).toHaveClass('bg-white/10');
            expect(activeItem).toHaveClass('font-medium');

            // Verify other conversations don't have the active highlight
            conversationButtons.forEach((item) => {
              if (item.getAttribute('title') !== conversations[activeIndex].title) {
                // Non-active items should have the default styling
                expect(item).not.toHaveClass('bg-white/10');
              }
            });
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should highlight the active conversation when URL param matches', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a list of 2-5 unique conversations
          uniqueConversationDataArbitrary(2, 5),
          // Select one index to be the active conversation
          fc.nat(),
          fc.constantFrom(...VALID_TECHNIQUES),
          async (conversationData, activeIndexSeed, technique) => {
            cleanup();
            jest.clearAllMocks();

            // Create conversations from generated data
            const conversations = conversationData.map(([id, title]) =>
              createMockConversation(id, title, technique)
            );

            // Select active conversation using modulo to ensure valid index
            const activeIndex = activeIndexSeed % conversations.length;
            const activeConversationId = conversations[activeIndex].id;

            // Set the URL param to the active conversation ID
            mockParams.id = activeConversationId;

            // Setup mock to return conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: conversations,
                    meta: { limit: 20, page: 1, total: conversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            // Render without activeConversationId prop - should use URL param
            render(<ConversationList collapsed={false} />);

            // Find all conversation items
            const conversationItems = screen.getAllByRole('button');

            // Filter to only conversation items (exclude checkboxes and other buttons)
            const conversationButtons = conversationItems.filter(
              (item) => item.getAttribute('title') !== null
            );

            // Find the active conversation item
            const activeItem = conversationButtons.find(
              (item) => item.getAttribute('title') === conversations[activeIndex].title
            );

            expect(activeItem).toBeTruthy();

            // Verify the active conversation has the highlight class
            expect(activeItem).toHaveClass('bg-white/10');
            expect(activeItem).toHaveClass('font-medium');
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should not highlight any conversation when no active ID is set', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a list of 2-5 unique conversations
          uniqueConversationDataArbitrary(2, 5),
          fc.constantFrom(...VALID_TECHNIQUES),
          async (conversationData, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Create conversations from generated data
            const conversations = conversationData.map(([id, title]) =>
              createMockConversation(id, title, technique)
            );

            // Setup mock to return conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: conversations,
                    meta: { limit: 20, page: 1, total: conversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            // Render without any active conversation ID
            render(<ConversationList collapsed={false} />);

            // Find all conversation items
            const conversationItems = screen.getAllByRole('button');

            // Filter to only conversation items (exclude checkboxes and other buttons)
            const conversationButtons = conversationItems.filter(
              (item) => item.getAttribute('title') !== null
            );

            // Verify no conversation has the active highlight
            conversationButtons.forEach((item) => {
              expect(item).not.toHaveClass('bg-white/10');
            });
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should highlight exactly one conversation when active ID matches one in the list', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a list of 3-5 unique conversations
          uniqueConversationDataArbitrary(3, 5),
          // Select one index to be the active conversation
          fc.nat(),
          fc.constantFrom(...VALID_TECHNIQUES),
          async (conversationData, activeIndexSeed, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Create conversations from generated data
            const conversations = conversationData.map(([id, title]) =>
              createMockConversation(id, title, technique)
            );

            // Select active conversation using modulo to ensure valid index
            const activeIndex = activeIndexSeed % conversations.length;
            const activeConversationId = conversations[activeIndex].id;

            // Setup mock to return conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: conversations,
                    meta: { limit: 20, page: 1, total: conversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            render(
              <ConversationList activeConversationId={activeConversationId} collapsed={false} />
            );

            // Find all conversation items
            const conversationItems = screen.getAllByRole('button');

            // Filter to only conversation items (exclude checkboxes and other buttons)
            const conversationButtons = conversationItems.filter(
              (item) => item.getAttribute('title') !== null
            );

            // Count how many items have the active highlight
            const highlightedItems = conversationButtons.filter((item) =>
              item.classList.contains('bg-white/10')
            );

            // Verify exactly one conversation is highlighted
            expect(highlightedItems.length).toBe(1);

            // Verify it's the correct conversation
            expect(highlightedItems[0].getAttribute('title')).toBe(
              conversations[activeIndex].title
            );
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should not highlight any conversation when active ID does not match any in the list', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a list of 2-5 unique conversations
          uniqueConversationDataArbitrary(2, 5),
          // Generate a non-matching ID
          conversationIdArbitrary,
          fc.constantFrom(...VALID_TECHNIQUES),
          async (conversationData, nonMatchingId, technique) => {
            cleanup();
            jest.clearAllMocks();
            mockParams.id = undefined;

            // Create conversations from generated data
            const conversations = conversationData.map(([id, title]) =>
              createMockConversation(id, title, technique)
            );

            // Ensure the non-matching ID is actually not in the list
            const existingIds = conversations.map((c) => c.id);
            if (existingIds.includes(nonMatchingId)) {
              // Skip this test case if the generated ID happens to match
              return;
            }

            // Setup mock to return conversations
            mockUseInfiniteConversations.mockReturnValue({
              data: {
                pages: [
                  {
                    data: conversations,
                    meta: { limit: 20, page: 1, total: conversations.length, totalPages: 1 },
                  },
                ],
              },
              error: null,
              fetchNextPage: jest.fn(),
              hasNextPage: false,
              isFetchingNextPage: false,
              isLoading: false,
              refetch: jest.fn(),
            });

            render(<ConversationList activeConversationId={nonMatchingId} collapsed={false} />);

            // Find all conversation items
            const conversationItems = screen.getAllByRole('button');

            // Filter to only conversation items (exclude checkboxes and other buttons)
            const conversationButtons = conversationItems.filter(
              (item) => item.getAttribute('title') !== null
            );

            // Verify no conversation has the active highlight
            conversationButtons.forEach((item) => {
              expect(item).not.toHaveClass('bg-white/10');
            });
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);
  });
});
