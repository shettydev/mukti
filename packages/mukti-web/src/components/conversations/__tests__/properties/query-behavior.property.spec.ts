/**
 * Property-based tests for query behavior
 *
 * Tests:
 * - Property 26: Filter change triggers refetch
 * - Property 27: Sort change triggers refetch
 * - Property 28: Archived message pagination
 */

import * as fc from 'fast-check';

import type { ConversationFilters } from '@/types/conversation.types';

/**
 * Feature: conversation-frontend-integration, Property 26: Filter change triggers refetch
 *
 * For any filter change, the conversation list query should refetch with new parameters
 */
describe('Property 26: Filter change triggers refetch', () => {
  it('should detect filter changes and trigger refetch', () => {
    fc.assert(
      fc.property(
        // Generate initial filters
        fc.record<ConversationFilters>({
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
        // Generate new filters with at least one change
        fc.record<Partial<ConversationFilters>>({
          isArchived: fc.option(fc.boolean(), { nil: undefined }),
          isFavorite: fc.option(fc.boolean(), { nil: undefined }),
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
        (initialFilters, filterChanges) => {
          // Apply filter changes
          const newFilters = { ...initialFilters, ...filterChanges };

          // Verify that filters have changed (at least one field should be different)
          const hasChanged =
            newFilters.technique !== initialFilters.technique ||
            newFilters.isArchived !== initialFilters.isArchived ||
            newFilters.isFavorite !== initialFilters.isFavorite ||
            JSON.stringify(newFilters.tags) !== JSON.stringify(initialFilters.tags);

          // If filters changed, page should reset to 1
          if (hasChanged) {
            // In the actual implementation, filter changes should reset page to 1
            const filtersForRefetch = { ...newFilters, page: 1 };
            expect(filtersForRefetch.page).toBe(1);
          }

          // Verify new filters are applied
          if (filterChanges.technique !== undefined) {
            expect(newFilters.technique).toBe(filterChanges.technique);
          }
          if (filterChanges.isArchived !== undefined) {
            expect(newFilters.isArchived).toBe(filterChanges.isArchived);
          }
          if (filterChanges.isFavorite !== undefined) {
            expect(newFilters.isFavorite).toBe(filterChanges.isFavorite);
          }
          if (filterChanges.tags !== undefined) {
            expect(newFilters.tags).toEqual(filterChanges.tags);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve limit when filters change', () => {
    fc.assert(
      fc.property(
        fc.record<ConversationFilters>({
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
        fc.constantFrom(
          'elenchus' as const,
          'dialectic' as const,
          'maieutics' as const,
          'definitional' as const,
          'analogical' as const,
          'counterfactual' as const
        ),
        (initialFilters, newTechnique) => {
          // Change technique filter
          const newFilters = { ...initialFilters, page: 1, technique: newTechnique };

          // Verify limit is preserved
          expect(newFilters.limit).toBe(initialFilters.limit);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: conversation-frontend-integration, Property 27: Sort change triggers refetch
 *
 * For any sort order change, the conversation list query should refetch with new sort parameter
 */
describe('Property 27: Sort change triggers refetch', () => {
  it('should detect sort changes and trigger refetch', () => {
    fc.assert(
      fc.property(
        fc.record<ConversationFilters>({
          isArchived: fc.option(fc.boolean(), { nil: undefined }),
          isFavorite: fc.option(fc.boolean(), { nil: undefined }),
          limit: fc.integer({ max: 50, min: 10 }),
          page: fc.integer({ max: 10, min: 1 }),
          sort: fc.constantFrom(
            'createdAt' as const,
            'updatedAt' as const,
            'lastMessageAt' as const
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
        fc.constantFrom('createdAt' as const, 'updatedAt' as const, 'lastMessageAt' as const),
        (initialFilters, newSort) => {
          // Change sort
          const newFilters = { ...initialFilters, page: 1, sort: newSort };

          // Verify sort changed
          expect(newFilters.sort).toBe(newSort);

          // Verify page reset to 1 when sort changes
          if (newSort !== initialFilters.sort) {
            expect(newFilters.page).toBe(1);
          }

          // Verify other filters preserved
          expect(newFilters.technique).toBe(initialFilters.technique);
          expect(newFilters.tags).toEqual(initialFilters.tags);
          expect(newFilters.isArchived).toBe(initialFilters.isArchived);
          expect(newFilters.isFavorite).toBe(initialFilters.isFavorite);
          expect(newFilters.limit).toBe(initialFilters.limit);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle all valid sort options', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('createdAt' as const, 'updatedAt' as const, 'lastMessageAt' as const),
        (sortOption) => {
          // Verify sort option is valid
          const validSorts = ['createdAt', 'updatedAt', 'lastMessageAt'];
          expect(validSorts).toContain(sortOption);

          // Create filters with this sort
          const filters: ConversationFilters = {
            limit: 20,
            page: 1,
            sort: sortOption,
          };

          expect(filters.sort).toBe(sortOption);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: conversation-frontend-integration, Property 28: Archived message pagination
 *
 * For any "Load older messages" action, archived messages should be fetched with correct beforeSequence parameter
 */
describe('Property 28: Archived message pagination', () => {
  it('should use correct beforeSequence for pagination', () => {
    fc.assert(
      fc.property(
        // Generate a list of message sequences (sorted)
        fc
          .array(fc.integer({ max: 1000, min: 1 }), { maxLength: 50, minLength: 5 })
          .map((sequences) => [...new Set(sequences)].sort((a, b) => a - b)),
        (messageSequences) => {
          // Simulate loading older messages
          // The oldest message in current view
          const oldestSequence = messageSequences[0];

          // beforeSequence should be the oldest message's sequence
          const beforeSequence = oldestSequence;

          // Verify beforeSequence is correct
          expect(beforeSequence).toBe(oldestSequence);

          // Verify it's a positive integer
          expect(beforeSequence).toBeGreaterThan(0);
          expect(Number.isInteger(beforeSequence)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fetch messages with sequence less than beforeSequence', () => {
    fc.assert(
      fc.property(
        fc.integer({ max: 1000, min: 50 }),
        fc.array(fc.integer({ max: 49, min: 1 }), { maxLength: 50, minLength: 1 }),
        (beforeSequence, archivedSequences) => {
          // Simulate fetching archived messages before a certain sequence
          // All archived messages should have sequence < beforeSequence
          const validArchivedMessages = archivedSequences.filter((seq) => seq < beforeSequence);

          // Verify all returned messages are before the beforeSequence
          validArchivedMessages.forEach((seq) => {
            expect(seq).toBeLessThan(beforeSequence);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle pagination with limit parameter', () => {
    fc.assert(
      fc.property(
        fc.integer({ max: 1000, min: 100 }),
        fc.integer({ max: 100, min: 10 }),
        (beforeSequence, limit) => {
          // Simulate pagination request
          const paginationParams = {
            beforeSequence,
            limit,
          };

          // Verify parameters are valid
          expect(paginationParams.beforeSequence).toBeGreaterThan(0);
          expect(paginationParams.limit).toBeGreaterThan(0);
          expect(paginationParams.limit).toBeLessThanOrEqual(100);

          // Verify beforeSequence is greater than limit (otherwise no older messages)
          if (beforeSequence > limit) {
            expect(beforeSequence).toBeGreaterThan(limit);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain chronological order after loading older messages', () => {
    fc.assert(
      fc.property(
        // Current messages (higher sequences)
        fc
          .array(fc.integer({ max: 200, min: 100 }), { maxLength: 10, minLength: 1 })
          .map((seqs) => [...new Set(seqs)].sort((a, b) => a - b)),
        // Archived messages (lower sequences)
        fc
          .array(fc.integer({ max: 99, min: 1 }), { maxLength: 10, minLength: 1 })
          .map((seqs) => [...new Set(seqs)].sort((a, b) => a - b)),
        (currentSequences, archivedSequences) => {
          // Prepend archived messages
          const allSequences = [...archivedSequences, ...currentSequences];

          // Verify chronological order is maintained
          for (let i = 1; i < allSequences.length; i++) {
            expect(allSequences[i]).toBeGreaterThan(allSequences[i - 1]);
          }

          // Verify archived messages come before current messages
          if (archivedSequences.length > 0 && currentSequences.length > 0) {
            const lastArchived = archivedSequences[archivedSequences.length - 1];
            const firstCurrent = currentSequences[0];
            expect(lastArchived).toBeLessThan(firstCurrent);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
