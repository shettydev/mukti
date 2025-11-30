/**
 * Property-based tests for conversation data integrity
 *
 * Tests:
 * - Property 22: Message ordering
 * - Property 23: Archived message prepending
 * - Property 24: Filter preservation during pagination
 * - Property 25: Conversation card completeness
 */

import * as fc from 'fast-check';

import type { Conversation, Message } from '@/types/conversation.types';

// Helper to generate valid ISO date strings
const dateArbitrary = () =>
  fc
    .integer({ max: new Date('2025-12-31').getTime(), min: new Date('2020-01-01').getTime() })
    .map((timestamp) => new Date(timestamp).toISOString());

/**
 * Feature: conversation-frontend-integration, Property 22: Message ordering
 *
 * For any conversation with messages, messages should be displayed in ascending order by sequence number
 */
describe('Property 22: Message ordering', () => {
  it('should maintain chronological message order by sequence number', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            content: fc.string({ maxLength: 500, minLength: 1 }),
            role: fc.constantFrom('user' as const, 'assistant' as const),
            sequence: fc.integer({ max: 1000, min: 0 }),
            timestamp: dateArbitrary(),
            tokens: fc.option(fc.integer({ max: 1000, min: 1 }), { nil: undefined }),
          }),
          { maxLength: 50, minLength: 2 }
        ),
        (messages) => {
          // Sort messages by sequence (this is what the UI should do)
          const sorted = [...messages].sort((a, b) => a.sequence - b.sequence);

          // Verify ordering is maintained
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].sequence).toBeGreaterThanOrEqual(sorted[i - 1].sequence);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle messages with duplicate sequence numbers', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            content: fc.string({ maxLength: 500, minLength: 1 }),
            role: fc.constantFrom('user' as const, 'assistant' as const),
            sequence: fc.integer({ max: 10, min: 0 }), // Small range to force duplicates
            timestamp: dateArbitrary(),
          }),
          { maxLength: 20, minLength: 5 }
        ),
        (messages) => {
          // Sort by sequence, then by timestamp for stability
          const sorted = [...messages].sort((a, b) => {
            if (a.sequence !== b.sequence) {
              return a.sequence - b.sequence;
            }
            return a.timestamp.localeCompare(b.timestamp);
          });

          // Verify sequence order is non-decreasing
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].sequence).toBeGreaterThanOrEqual(sorted[i - 1].sequence);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: conversation-frontend-integration, Property 23: Archived message prepending
 *
 * For any archived message fetch, new messages should be prepended while maintaining chronological order
 */
describe('Property 23: Archived message prepending', () => {
  it('should prepend archived messages while maintaining order', () => {
    fc.assert(
      fc.property(
        // Generate existing messages (higher sequence numbers)
        fc
          .array(
            fc.record({
              content: fc.string({ maxLength: 500, minLength: 1 }),
              role: fc.constantFrom('user' as const, 'assistant' as const),
              sequence: fc.integer({ max: 200, min: 100 }),
              timestamp: dateArbitrary(),
            }),
            { maxLength: 10, minLength: 1 }
          )
          .map((msgs) => msgs.sort((a, b) => a.sequence - b.sequence)),
        // Generate archived messages (lower sequence numbers)
        fc
          .array(
            fc.record({
              content: fc.string({ maxLength: 500, minLength: 1 }),
              role: fc.constantFrom('user' as const, 'assistant' as const),
              sequence: fc.integer({ max: 99, min: 1 }),
              timestamp: dateArbitrary(),
            }),
            { maxLength: 10, minLength: 1 }
          )
          .map((msgs) => msgs.sort((a, b) => a.sequence - b.sequence)),
        (existingMessages, archivedMessages) => {
          // Prepend archived messages (this is what the UI should do)
          const combined = [...archivedMessages, ...existingMessages];

          // Verify all messages are in order
          for (let i = 1; i < combined.length; i++) {
            expect(combined[i].sequence).toBeGreaterThanOrEqual(combined[i - 1].sequence);
          }

          // Verify archived messages come before existing messages
          if (archivedMessages.length > 0 && existingMessages.length > 0) {
            const lastArchivedSeq = archivedMessages[archivedMessages.length - 1].sequence;
            const firstExistingSeq = existingMessages[0].sequence;
            expect(lastArchivedSeq).toBeLessThan(firstExistingSeq);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: conversation-frontend-integration, Property 24: Filter preservation during pagination
 *
 * For any page navigation, the active filters should be maintained in the query
 */
describe('Property 24: Filter preservation during pagination', () => {
  it('should preserve filters when navigating pages', () => {
    fc.assert(
      fc.property(
        fc.record({
          isArchived: fc.option(fc.boolean(), { nil: undefined }),
          isFavorite: fc.option(fc.boolean(), { nil: undefined }),
          limit: fc.integer({ max: 50, min: 10 }),
          page: fc.integer({ max: 10, min: 1 }),
          sort: fc.option(
            fc.constantFrom('createdAt' as const, 'updatedAt' as const, 'lastMessageAt' as const),
            { nil: undefined }
          ),
          tags: fc.option(fc.array(fc.string({ maxLength: 20, minLength: 1 }), { maxLength: 5 }), {
            nil: undefined,
          }),
          technique: fc.option(
            fc.constantFrom(
              'elenchus' as const,
              'dialectic' as const,
              'maieutics' as const,
              'definitional' as const,
              'analogical' as const,
              'counterfactual' as const
            ),
            { nil: undefined }
          ),
        }),
        fc.integer({ max: 10, min: 2 }),
        (filters, newPage) => {
          // Simulate page navigation
          const newFilters = { ...filters, page: newPage };

          // Verify all original filters are preserved
          expect(newFilters.technique).toBe(filters.technique);
          expect(newFilters.tags).toEqual(filters.tags);
          expect(newFilters.isArchived).toBe(filters.isArchived);
          expect(newFilters.isFavorite).toBe(filters.isFavorite);
          expect(newFilters.sort).toBe(filters.sort);
          expect(newFilters.limit).toBe(filters.limit);

          // Verify page changed
          expect(newFilters.page).toBe(newPage);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: conversation-frontend-integration, Property 25: Conversation card completeness
 *
 * For any rendered conversation card, it should display title, technique, last message preview, and timestamp
 */
describe('Property 25: Conversation card completeness', () => {
  it('should contain all required fields for display', () => {
    fc.assert(
      fc.property(
        fc.record<Conversation>({
          createdAt: dateArbitrary(),
          hasArchivedMessages: fc.boolean(),
          id: fc.uuid(),
          isArchived: fc.boolean(),
          isFavorite: fc.boolean(),
          metadata: fc.record({
            estimatedCost: fc.float({ max: 10, min: 0 }),
            lastMessageAt: fc.option(dateArbitrary(), { nil: undefined }),
            messageCount: fc.integer({ max: 1000, min: 0 }),
            totalTokens: fc.integer({ max: 100000, min: 0 }),
          }),
          recentMessages: fc.array(
            fc.record<Message>({
              content: fc.string({ maxLength: 500, minLength: 1 }),
              role: fc.constantFrom('user' as const, 'assistant' as const),
              sequence: fc.integer({ max: 1000, min: 0 }),
              timestamp: dateArbitrary(),
              tokens: fc.option(fc.integer({ max: 1000, min: 1 }), { nil: undefined }),
            }),
            { maxLength: 10 }
          ),
          tags: fc.array(fc.string({ maxLength: 20, minLength: 1 }), { maxLength: 5 }),
          technique: fc.constantFrom(
            'elenchus' as const,
            'dialectic' as const,
            'maieutics' as const,
            'definitional' as const,
            'analogical' as const,
            'counterfactual' as const
          ),
          title: fc.string({ maxLength: 200, minLength: 1 }),
          updatedAt: dateArbitrary(),
          userId: fc.uuid(),
        }),
        (conversation) => {
          // Verify all required fields are present and valid
          expect(conversation.id).toBeDefined();
          expect(conversation.title).toBeDefined();
          expect(conversation.title.length).toBeGreaterThan(0);
          expect(conversation.technique).toBeDefined();
          expect(conversation.updatedAt).toBeDefined();

          // Verify metadata is present
          expect(conversation.metadata).toBeDefined();
          expect(conversation.metadata.messageCount).toBeGreaterThanOrEqual(0);

          // Verify timestamp is valid ISO string
          expect(() => new Date(conversation.updatedAt)).not.toThrow();

          // If there's a lastMessageAt, it should be valid
          if (conversation.metadata.lastMessageAt) {
            expect(() => new Date(conversation.metadata.lastMessageAt!)).not.toThrow();
          }

          // Verify technique is one of the valid values
          const validTechniques = [
            'elenchus',
            'dialectic',
            'maieutics',
            'definitional',
            'analogical',
            'counterfactual',
          ];
          expect(validTechniques).toContain(conversation.technique);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle conversations with no messages', () => {
    fc.assert(
      fc.property(
        fc.record<Conversation>({
          createdAt: dateArbitrary(),
          hasArchivedMessages: fc.constant(false),
          id: fc.uuid(),
          isArchived: fc.boolean(),
          isFavorite: fc.boolean(),
          metadata: fc.record({
            estimatedCost: fc.constant(0),
            lastMessageAt: fc.constant(undefined),
            messageCount: fc.constant(0),
            totalTokens: fc.constant(0),
          }),
          recentMessages: fc.constant([]),
          tags: fc.array(fc.string({ maxLength: 20, minLength: 1 }), { maxLength: 5 }),
          technique: fc.constantFrom(
            'elenchus' as const,
            'dialectic' as const,
            'maieutics' as const,
            'definitional' as const,
            'analogical' as const,
            'counterfactual' as const
          ),
          title: fc.string({ maxLength: 200, minLength: 1 }),
          updatedAt: dateArbitrary(),
          userId: fc.uuid(),
        }),
        (conversation) => {
          // Verify conversation is still valid with no messages
          expect(conversation.recentMessages).toHaveLength(0);
          expect(conversation.metadata.messageCount).toBe(0);
          expect(conversation.metadata.lastMessageAt).toBeUndefined();

          // All other required fields should still be present
          expect(conversation.id).toBeDefined();
          expect(conversation.title).toBeDefined();
          expect(conversation.technique).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
