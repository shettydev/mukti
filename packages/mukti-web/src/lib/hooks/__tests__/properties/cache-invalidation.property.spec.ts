/**
 * Property-based tests for cache invalidation
 *
 * Tests universal properties that should hold for cache invalidation operations:
 * - Property 18: Post-creation invalidation
 * - Property 19: Post-update invalidation
 * - Property 20: Post-deletion invalidation
 * - Property 21: Post-message invalidation
 */

import type { InfiniteData } from '@tanstack/react-query';

import { describe, expect, it } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';
import * as fc from 'fast-check';

import type {
  Conversation,
  PaginatedConversations,
  SocraticTechnique,
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
 * Arbitrary for generating valid conversation data
 */
const conversationArbitrary = fc.record({
  createdAt: fc
    .integer({ max: Date.now(), min: Date.now() - 365 * 24 * 60 * 60 * 1000 })
    .map((timestamp) => new Date(timestamp).toISOString()),
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
      timestamp: fc
        .integer({ max: Date.now(), min: Date.now() - 365 * 24 * 60 * 60 * 1000 })
        .map((timestamp) => new Date(timestamp).toISOString()),
    }),
    { maxLength: 10 }
  ),
  tags: fc.array(fc.string({ maxLength: 20, minLength: 1 }), { maxLength: 5 }),
  technique: techniqueArbitrary,
  title: fc.string({ maxLength: 100, minLength: 1 }),
  updatedAt: fc
    .integer({ max: Date.now(), min: Date.now() - 365 * 24 * 60 * 60 * 1000 })
    .map((timestamp) => new Date(timestamp).toISOString()),
  userId: fc.string({ maxLength: 24, minLength: 24 }),
});

/**
 * Feature: conversation-frontend-integration, Property 18: Post-creation invalidation
 *
 * For any successful conversation creation, the conversation list query should be invalidated
 */
describe('Property 18: Post-creation invalidation', () => {
  it('should mark conversation list queries as stale after creation', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArbitrary, { maxLength: 10, minLength: 1 }),
        conversationArbitrary,
        (existingConversations: Conversation[], _newConversation: Conversation) => {
          const queryClient = new QueryClient({
            defaultOptions: {
              queries: {
                staleTime: 60000, // 1 minute
              },
            },
          });

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

          // Verify query is fresh initially
          const queryState = queryClient.getQueryState(conversationKeys.list({}));
          expect(queryState?.isInvalidated).toBe(false);

          // Simulate successful creation (what onSuccess does)
          queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });

          // Verify query was invalidated
          const invalidatedState = queryClient.getQueryState(conversationKeys.list({}));
          expect(invalidatedState?.isInvalidated).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should invalidate all list queries regardless of filters', () => {
    fc.assert(
      fc.property(
        conversationArbitrary,
        techniqueArbitrary,
        fc.boolean(),
        (
          newConversation: Conversation,
          filterTechnique: SocraticTechnique,
          filterArchived: boolean
        ) => {
          const queryClient = new QueryClient();

          // Set up multiple list queries with different filters
          const filters1 = { technique: filterTechnique };
          const filters2 = { isArchived: filterArchived };
          const filters3 = {};

          queryClient.setQueryData(conversationKeys.list(filters1), {
            pageParams: [1],
            pages: [{ data: [], meta: { limit: 20, page: 1, total: 0, totalPages: 0 } }],
          });

          queryClient.setQueryData(conversationKeys.list(filters2), {
            pageParams: [1],
            pages: [{ data: [], meta: { limit: 20, page: 1, total: 0, totalPages: 0 } }],
          });

          queryClient.setQueryData(conversationKeys.list(filters3), {
            pageParams: [1],
            pages: [{ data: [], meta: { limit: 20, page: 1, total: 0, totalPages: 0 } }],
          });

          // Invalidate all list queries
          queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });

          // Verify all list queries were invalidated
          expect(queryClient.getQueryState(conversationKeys.list(filters1))?.isInvalidated).toBe(
            true
          );
          expect(queryClient.getQueryState(conversationKeys.list(filters2))?.isInvalidated).toBe(
            true
          );
          expect(queryClient.getQueryState(conversationKeys.list(filters3))?.isInvalidated).toBe(
            true
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Feature: conversation-frontend-integration, Property 19: Post-update invalidation
 *
 * For any successful conversation update, related queries (detail and list) should be invalidated
 */
describe('Property 19: Post-update invalidation', () => {
  it('should invalidate both detail and list queries after update', () => {
    fc.assert(
      fc.property(conversationArbitrary, (conversation: Conversation) => {
        const queryClient = new QueryClient();

        // Set up detail and list queries
        queryClient.setQueryData(conversationKeys.detail(conversation.id), conversation);

        queryClient.setQueryData(conversationKeys.list({}), {
          pageParams: [1],
          pages: [
            {
              data: [conversation],
              meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
            },
          ],
        });

        // Verify queries are fresh initially
        expect(
          queryClient.getQueryState(conversationKeys.detail(conversation.id))?.isInvalidated
        ).toBe(false);
        expect(queryClient.getQueryState(conversationKeys.list({}))?.isInvalidated).toBe(false);

        // Simulate successful update (what onSuccess does)
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversation.id) });
        queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });

        // Verify both queries were invalidated
        expect(
          queryClient.getQueryState(conversationKeys.detail(conversation.id))?.isInvalidated
        ).toBe(true);
        expect(queryClient.getQueryState(conversationKeys.list({}))?.isInvalidated).toBe(true);
      }),
      { numRuns: 50 }
    );
  });
});

/**
 * Feature: conversation-frontend-integration, Property 20: Post-deletion invalidation
 *
 * For any successful conversation deletion, the conversation list query should be invalidated
 */
describe('Property 20: Post-deletion invalidation', () => {
  it('should invalidate list queries and remove detail query after deletion', () => {
    fc.assert(
      fc.property(
        fc.array(conversationArbitrary, { maxLength: 10, minLength: 2 }),
        fc.integer({ max: 9, min: 0 }),
        (conversations: Conversation[], deleteIndex: number) => {
          const queryClient = new QueryClient();
          const actualIndex = deleteIndex % conversations.length;
          const conversationToDelete = conversations[actualIndex];

          // Set up list and detail queries
          queryClient.setQueryData(conversationKeys.list({}), {
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
          });

          queryClient.setQueryData(
            conversationKeys.detail(conversationToDelete.id),
            conversationToDelete
          );

          // Verify queries exist
          expect(queryClient.getQueryData(conversationKeys.list({}))).toBeDefined();
          expect(
            queryClient.getQueryData(conversationKeys.detail(conversationToDelete.id))
          ).toBeDefined();

          // Simulate successful deletion (what onSuccess does)
          queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
          queryClient.removeQueries({ queryKey: conversationKeys.detail(conversationToDelete.id) });

          // Verify list was invalidated
          expect(queryClient.getQueryState(conversationKeys.list({}))?.isInvalidated).toBe(true);

          // Verify detail query was removed
          expect(
            queryClient.getQueryData(conversationKeys.detail(conversationToDelete.id))
          ).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Feature: conversation-frontend-integration, Property 21: Post-message invalidation
 *
 * For any completed message processing, the conversation detail query should be refetched
 */
describe('Property 21: Post-message invalidation', () => {
  it('should invalidate conversation detail query after message is sent', () => {
    fc.assert(
      fc.property(conversationArbitrary, (conversation: Conversation) => {
        const queryClient = new QueryClient();

        // Set up detail query
        queryClient.setQueryData(conversationKeys.detail(conversation.id), conversation);

        // Verify query is fresh initially
        expect(
          queryClient.getQueryState(conversationKeys.detail(conversation.id))?.isInvalidated
        ).toBe(false);

        // Simulate successful message send (what onSuccess does)
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversation.id) });

        // Verify query was invalidated
        expect(
          queryClient.getQueryState(conversationKeys.detail(conversation.id))?.isInvalidated
        ).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  it('should not invalidate list queries after message send', () => {
    fc.assert(
      fc.property(conversationArbitrary, (conversation: Conversation) => {
        const queryClient = new QueryClient();

        // Set up detail and list queries
        queryClient.setQueryData(conversationKeys.detail(conversation.id), conversation);

        queryClient.setQueryData(conversationKeys.list({}), {
          pageParams: [1],
          pages: [
            {
              data: [conversation],
              meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
            },
          ],
        });

        // Simulate successful message send (only invalidates detail, not list)
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversation.id) });

        // Verify detail was invalidated but list was not
        expect(
          queryClient.getQueryState(conversationKeys.detail(conversation.id))?.isInvalidated
        ).toBe(true);
        expect(queryClient.getQueryState(conversationKeys.list({}))?.isInvalidated).toBe(false);
      }),
      { numRuns: 50 }
    );
  });
});
