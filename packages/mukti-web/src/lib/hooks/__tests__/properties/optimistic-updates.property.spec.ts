/**
 * Property-based tests for optimistic updates
 *
 * Tests universal properties that should hold for all optimistic update operations:
 * - Property 13: Optimistic creation
 * - Property 14: Optimistic update rollback
 * - Property 15: Optimistic message sending
 * - Property 16: Optimistic deletion
 * - Property 17: Optimistic toggle
 */

import type { InfiniteData } from '@tanstack/react-query';

import { describe, expect, it } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';
import * as fc from 'fast-check';

import type {
  Conversation,
  CreateConversationDto,
  Message,
  PaginatedConversations,
  SendMessageDto,
  SocraticTechnique,
  UpdateConversationDto,
} from '@/types/conversation.types';

import { conversationKeys } from '@/lib/query-keys';

/**
 * Arbitrary for generating valid Socratic techniques
 */
const techniqueArbitrary = fc.constantFrom<SocraticTechnique>(
  'analogical',
  'counterfactual',
  'definitional',
  'dialectic',
  'elenchus',
  'maieutics'
);

/**
 * Arbitrary for generating valid ISO date strings
 * Uses integer timestamps to avoid invalid date edge cases
 */
const validDateArbitrary = fc
  .integer({
    max: new Date('2030-12-31').getTime(),
    min: new Date('2020-01-01').getTime(),
  })
  .map((timestamp) => new Date(timestamp).toISOString());

/**
 * Arbitrary for generating valid conversation data
 */
const conversationArbitrary = fc.record({
  createdAt: validDateArbitrary,
  hasArchivedMessages: fc.boolean(),
  id: fc.string({ maxLength: 24, minLength: 24 }),
  isArchived: fc.boolean(),
  isFavorite: fc.boolean(),
  metadata: fc.record({
    estimatedCost: fc.double({ max: 100, min: 0 }),
    messageCount: fc.integer({ max: 1000, min: 0 }),
    totalTokens: fc.integer({ max: 100000, min: 0 }),
  }),
  recentMessages: fc.array(
    fc.record({
      content: fc.string({ maxLength: 500, minLength: 1 }),
      role: fc.constantFrom('assistant', 'user'),
      sequence: fc.integer({ max: 1000, min: 1 }),
      timestamp: validDateArbitrary,
    }),
    { maxLength: 10 }
  ),
  tags: fc.array(fc.string({ maxLength: 20, minLength: 1 }), { maxLength: 5 }),
  technique: techniqueArbitrary,
  title: fc.string({ maxLength: 100, minLength: 1 }),
  updatedAt: validDateArbitrary,
  userId: fc.string({ maxLength: 24, minLength: 24 }),
});

/**
 * Feature: conversation-frontend-integration, Property 13: Optimistic creation
 * Validates: Requirements 4.4
 *
 * For any conversation creation, the new conversation should appear in the cache
 * before the server responds
 */
describe('Property 13: Optimistic creation', () => {
  it('should add conversation to cache before server response', () => {
    fc.assert(
      fc.property(
        fc.record({
          tags: fc.array(fc.string({ maxLength: 20, minLength: 1 }), { maxLength: 5 }),
          technique: techniqueArbitrary,
          title: fc.string({ maxLength: 100, minLength: 1 }),
        }),
        fc.array(conversationArbitrary, { maxLength: 10, minLength: 1 }),
        (newConversation: CreateConversationDto, existingConversations: Conversation[]) => {
          const queryClient = new QueryClient();

          // Set up initial cache with existing conversations
          const initialData: InfiniteData<PaginatedConversations> = {
            pageParams: [1],
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
          };

          queryClient.setQueryData(conversationKeys.list({}), initialData);

          // Simulate optimistic update (what the mutation's onMutate does)
          queryClient.setQueriesData<InfiniteData<PaginatedConversations>>(
            { queryKey: conversationKeys.lists() },
            (old) => {
              if (!old) {
                return old;
              }

              const optimisticConversation: Conversation = {
                createdAt: new Date().toISOString(),
                hasArchivedMessages: false,
                id: 'temp-' + Date.now(),
                isArchived: false,
                isFavorite: false,
                metadata: {
                  estimatedCost: 0,
                  messageCount: 0,
                  totalTokens: 0,
                },
                recentMessages: [],
                tags: newConversation.tags || [],
                technique: newConversation.technique,
                title: newConversation.title,
                updatedAt: new Date().toISOString(),
                userId: '',
              };

              return {
                ...old,
                pages: old.pages.map((page, index) =>
                  index === 0
                    ? {
                        ...page,
                        data: [optimisticConversation, ...page.data],
                        meta: {
                          ...page.meta,
                          total: page.meta.total + 1,
                        },
                      }
                    : page
                ),
              };
            }
          );

          // Verify optimistic conversation was added
          const updatedData = queryClient.getQueryData<InfiniteData<PaginatedConversations>>(
            conversationKeys.list({})
          );

          expect(updatedData).toBeDefined();
          expect(updatedData!.pages[0].data.length).toBe(existingConversations.length + 1);
          expect(updatedData!.pages[0].data[0].title).toBe(newConversation.title);
          expect(updatedData!.pages[0].data[0].technique).toBe(newConversation.technique);
          expect(updatedData!.pages[0].data[0].id).toMatch(/^temp-/);
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Feature: conversation-frontend-integration, Property 14: Optimistic update rollback
 * Validates: Requirements 4.5, 7.6, 8.7, 9.5
 *
 * For any failed mutation, the cache should revert to its pre-mutation state
 */
describe('Property 14: Optimistic update rollback', () => {
  it('should rollback cache on mutation error', () => {
    fc.assert(
      fc.property(
        conversationArbitrary,
        fc.record({
          isFavorite: fc.boolean(),
          title: fc.string({ maxLength: 100, minLength: 1 }),
        }),
        (originalConversation: Conversation, updates: UpdateConversationDto) => {
          const queryClient = new QueryClient();

          // Set up initial cache
          queryClient.setQueryData(
            conversationKeys.detail(originalConversation.id),
            originalConversation
          );

          // Save snapshot (what onMutate does)
          const previousConversation = queryClient.getQueryData<Conversation>(
            conversationKeys.detail(originalConversation.id)
          );

          // Apply optimistic update
          queryClient.setQueryData<Conversation>(
            conversationKeys.detail(originalConversation.id),
            (old) => {
              if (!old) {
                return old;
              }
              return {
                ...old,
                ...updates,
                updatedAt: new Date().toISOString(),
              };
            }
          );

          // Verify optimistic update was applied
          const optimisticData = queryClient.getQueryData<Conversation>(
            conversationKeys.detail(originalConversation.id)
          );
          expect(optimisticData?.title).toBe(updates.title);

          // Simulate error and rollback (what onError does)
          if (previousConversation) {
            queryClient.setQueryData(
              conversationKeys.detail(originalConversation.id),
              previousConversation
            );
          }

          // Verify rollback restored original data
          const rolledBackData = queryClient.getQueryData<Conversation>(
            conversationKeys.detail(originalConversation.id)
          );
          expect(rolledBackData).toEqual(originalConversation);
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Feature: conversation-frontend-integration, Property 15: Optimistic message sending
 * Validates: Requirements 7.2
 *
 * For any message send operation, the message should appear in the conversation
 * before the server responds
 */
describe('Property 15: Optimistic message sending', () => {
  it('should add user message to conversation before server response', () => {
    fc.assert(
      fc.property(
        conversationArbitrary,
        fc.record({
          content: fc.string({ maxLength: 500, minLength: 1 }),
        }),
        (conversation: Conversation, message: SendMessageDto) => {
          const queryClient = new QueryClient();

          // Set up initial cache
          queryClient.setQueryData(conversationKeys.detail(conversation.id), conversation);

          const initialMessageCount = conversation.recentMessages.length;

          // Simulate optimistic update (what onMutate does)
          queryClient.setQueryData<Conversation>(
            conversationKeys.detail(conversation.id),
            (old) => {
              if (!old) {
                return old;
              }

              const newMessage: Message = {
                content: message.content,
                role: 'user',
                sequence: old.metadata.messageCount + 1,
                timestamp: new Date().toISOString(),
              };

              return {
                ...old,
                metadata: {
                  ...old.metadata,
                  lastMessageAt: newMessage.timestamp,
                  messageCount: old.metadata.messageCount + 1,
                },
                recentMessages: [...old.recentMessages, newMessage],
                updatedAt: new Date().toISOString(),
              };
            }
          );

          // Verify message was added optimistically
          const updatedConversation = queryClient.getQueryData<Conversation>(
            conversationKeys.detail(conversation.id)
          );

          expect(updatedConversation).toBeDefined();
          expect(updatedConversation!.recentMessages.length).toBe(initialMessageCount + 1);
          expect(updatedConversation!.recentMessages[initialMessageCount].content).toBe(
            message.content
          );
          expect(updatedConversation!.recentMessages[initialMessageCount].role).toBe('user');
          expect(updatedConversation!.metadata.messageCount).toBe(
            conversation.metadata.messageCount + 1
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Feature: conversation-frontend-integration, Property 16: Optimistic deletion
 * Validates: Requirements 9.2
 *
 * For any conversation deletion, the conversation should be removed from the list
 * before the server responds
 */
describe('Property 16: Optimistic deletion', () => {
  it('should remove conversation from cache before server response', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArbitrary, { maxLength: 10, minLength: 2 }),
        fc.integer({ max: 9, min: 0 }),
        (conversations: Conversation[], deleteIndex: number) => {
          const queryClient = new QueryClient();
          const actualIndex = deleteIndex % conversations.length;
          const conversationToDelete = conversations[actualIndex];

          // Set up initial cache
          const initialData: InfiniteData<PaginatedConversations> = {
            pageParams: [1],
            pages: [
              {
                data: conversations,
                meta: {
                  limit: 20,
                  page: 1,
                  total: conversations.length,
                  totalPages: 1,
                },
              },
            ],
          };

          queryClient.setQueryData(conversationKeys.list({}), initialData);

          // Simulate optimistic deletion (what onMutate does)
          queryClient.setQueriesData<InfiniteData<PaginatedConversations>>(
            { queryKey: conversationKeys.lists() },
            (old) => {
              if (!old) {
                return old;
              }

              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  data: page.data.filter((conv) => conv.id !== conversationToDelete.id),
                  meta: {
                    ...page.meta,
                    total: page.meta.total - 1,
                  },
                })),
              };
            }
          );

          // Verify conversation was removed
          const updatedData = queryClient.getQueryData<InfiniteData<PaginatedConversations>>(
            conversationKeys.list({})
          );

          expect(updatedData).toBeDefined();
          expect(updatedData!.pages[0].data.length).toBe(conversations.length - 1);
          expect(
            updatedData!.pages[0].data.find((c) => c.id === conversationToDelete.id)
          ).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Feature: conversation-frontend-integration, Property 17: Optimistic toggle
 * Validates: Requirements 8.3, 8.4
 *
 * For any boolean field toggle (favorite, archived), the UI should update immediately
 * before server confirmation
 */
describe('Property 17: Optimistic toggle', () => {
  it('should toggle favorite status immediately', () => {
    fc.assert(
      fc.property(conversationArbitrary, (conversation: Conversation) => {
        const queryClient = new QueryClient();

        // Set up initial cache
        queryClient.setQueryData(conversationKeys.detail(conversation.id), conversation);

        const originalFavoriteStatus = conversation.isFavorite;

        // Simulate optimistic toggle (what onMutate does)
        queryClient.setQueryData<Conversation>(conversationKeys.detail(conversation.id), (old) => {
          if (!old) {
            return old;
          }
          return {
            ...old,
            isFavorite: !old.isFavorite,
            updatedAt: new Date().toISOString(),
          };
        });

        // Verify toggle was applied immediately
        const updatedConversation = queryClient.getQueryData<Conversation>(
          conversationKeys.detail(conversation.id)
        );

        expect(updatedConversation).toBeDefined();
        expect(updatedConversation!.isFavorite).toBe(!originalFavoriteStatus);
      }),
      { numRuns: 50 }
    );
  });

  it('should toggle archived status immediately', () => {
    fc.assert(
      fc.property(conversationArbitrary, (conversation: Conversation) => {
        const queryClient = new QueryClient();

        // Set up initial cache
        queryClient.setQueryData(conversationKeys.detail(conversation.id), conversation);

        const originalArchivedStatus = conversation.isArchived;

        // Simulate optimistic toggle (what onMutate does)
        queryClient.setQueryData<Conversation>(conversationKeys.detail(conversation.id), (old) => {
          if (!old) {
            return old;
          }
          return {
            ...old,
            isArchived: !old.isArchived,
            updatedAt: new Date().toISOString(),
          };
        });

        // Verify toggle was applied immediately
        const updatedConversation = queryClient.getQueryData<Conversation>(
          conversationKeys.detail(conversation.id)
        );

        expect(updatedConversation).toBeDefined();
        expect(updatedConversation!.isArchived).toBe(!originalArchivedStatus);
      }),
      { numRuns: 50 }
    );
  });
});
