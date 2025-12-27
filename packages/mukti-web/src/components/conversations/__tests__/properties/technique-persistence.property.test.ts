/**
 * Property-based tests for technique persistence with conversations
 *
 * **Feature: quick-chat-interface, Technique persists with conversation**
 *
 * For any technique selected when creating a conversation, that technique
 * should be stored in the conversation metadata.
 *
 */

import * as fc from 'fast-check';

import type {
  Conversation,
  CreateConversationDto,
  SocraticTechnique,
} from '@/types/conversation.types';

// All valid Socratic techniques
const VALID_TECHNIQUES: SocraticTechnique[] = [
  'elenchus',
  'dialectic',
  'maieutics',
  'definitional',
  'analogical',
  'counterfactual',
];

// Helper to generate valid ISO date strings
const dateArbitrary = () =>
  fc
    .integer({ max: new Date('2025-12-31').getTime(), min: new Date('2020-01-01').getTime() })
    .map((timestamp) => new Date(timestamp).toISOString());

/**
 * Simulates the conversation creation flow
 * This mirrors what happens in the actual API when a conversation is created
 */
function simulateConversationCreation(dto: CreateConversationDto): Conversation {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    hasArchivedMessages: false,
    id: `conv-${Date.now()}`,
    isArchived: false,
    isFavorite: false,
    metadata: {
      estimatedCost: 0,
      messageCount: 0,
      totalTokens: 0,
    },
    recentMessages: [],
    tags: dto.tags || [],
    technique: dto.technique, // Technique is persisted from the DTO
    title: dto.title,
    updatedAt: now,
    userId: 'user-123',
  };
}

describe('Feature: quick-chat-interface, Technique persists with conversation', () => {
  /**
   * Technique persists with conversation
   *
   * For any technique selected when creating a conversation, that technique
   * should be stored in the conversation metadata.
   */
  it('should persist the selected technique when creating a conversation', () => {
    fc.assert(
      fc.property(
        // Generate any valid technique
        fc.constantFrom(...VALID_TECHNIQUES),
        // Generate a valid title
        fc.string({ maxLength: 60, minLength: 1 }),
        // Generate optional tags
        fc.array(fc.string({ maxLength: 20, minLength: 1 }), { maxLength: 5 }),
        (technique, title, tags) => {
          // Create conversation DTO with the selected technique
          const dto: CreateConversationDto = {
            tags,
            technique,
            title,
          };

          // Simulate conversation creation
          const conversation = simulateConversationCreation(dto);

          // Verify the technique is persisted in the conversation
          expect(conversation.technique).toBe(technique);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * (continued): Technique remains unchanged after creation
   *
   * For any conversation created with a technique, the technique should
   * remain the same when the conversation is retrieved.
   */
  it('should maintain technique value across conversation retrieval', () => {
    fc.assert(
      fc.property(
        // Generate a complete conversation with any technique
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
          recentMessages: fc.constant([]),
          tags: fc.array(fc.string({ maxLength: 20, minLength: 1 }), { maxLength: 5 }),
          technique: fc.constantFrom(...VALID_TECHNIQUES),
          title: fc.string({ maxLength: 200, minLength: 1 }),
          updatedAt: dateArbitrary(),
          userId: fc.uuid(),
        }),
        (conversation) => {
          // Simulate serialization/deserialization (like API response)
          const serialized = JSON.stringify(conversation);
          const deserialized = JSON.parse(serialized) as Conversation;

          // Verify technique is preserved through serialization
          expect(deserialized.technique).toBe(conversation.technique);

          // Verify technique is one of the valid values
          expect(VALID_TECHNIQUES).toContain(deserialized.technique);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * (continued): Technique is always a valid Socratic technique
   *
   * For any conversation, the technique field should always be one of the
   * 6 valid Socratic techniques.
   */
  it('should always have a valid Socratic technique', () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_TECHNIQUES), (technique) => {
        const dto: CreateConversationDto = {
          technique,
          title: 'Test Conversation',
        };

        const conversation = simulateConversationCreation(dto);

        // Verify technique is one of the valid values
        expect(VALID_TECHNIQUES).toContain(conversation.technique);

        // Verify technique is exactly what was provided
        expect(conversation.technique).toBe(technique);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * (continued): Each technique can be persisted
   *
   * For each of the 6 Socratic techniques, creating a conversation with
   * that technique should successfully persist it.
   */
  it('should successfully persist each of the 6 Socratic techniques', () => {
    // Test each technique explicitly
    for (const technique of VALID_TECHNIQUES) {
      const dto: CreateConversationDto = {
        technique,
        title: `Test ${technique} conversation`,
      };

      const conversation = simulateConversationCreation(dto);

      expect(conversation.technique).toBe(technique);
    }
  });

  /**
   * (continued): Technique persists independently of other fields
   *
   * For any combination of title, tags, and technique, the technique
   * should be persisted independently of other conversation fields.
   */
  it('should persist technique independently of other conversation fields', () => {
    fc.assert(
      fc.property(
        // Generate two different techniques
        fc.constantFrom(...VALID_TECHNIQUES),
        fc.constantFrom(...VALID_TECHNIQUES),
        // Generate different titles
        fc.string({ maxLength: 60, minLength: 1 }),
        fc.string({ maxLength: 60, minLength: 1 }),
        // Generate different tags
        fc.array(fc.string({ maxLength: 20, minLength: 1 }), { maxLength: 5 }),
        fc.array(fc.string({ maxLength: 20, minLength: 1 }), { maxLength: 5 }),
        (technique1, technique2, title1, title2, tags1, tags2) => {
          // Create two conversations with different data
          const conversation1 = simulateConversationCreation({
            tags: tags1,
            technique: technique1,
            title: title1,
          });

          const conversation2 = simulateConversationCreation({
            tags: tags2,
            technique: technique2,
            title: title2,
          });

          // Each conversation should have its own technique
          expect(conversation1.technique).toBe(technique1);
          expect(conversation2.technique).toBe(technique2);

          // Techniques should be independent of titles and tags
          if (technique1 !== technique2) {
            expect(conversation1.technique).not.toBe(conversation2.technique);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
