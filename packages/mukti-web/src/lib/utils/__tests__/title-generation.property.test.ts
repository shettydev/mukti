/**
 * Property-based tests for title generation
 *
 * **Temporary title generation follows rules**
 *
 * Tests that for any message content:
 * - The generated title is truncated to 60 characters maximum
 * - The title does not end mid-word (when truncated and space exists after position 30)
 * - Ellipsis is added when the message is truncated
 */

import * as fc from 'fast-check';

import { generateTemporaryTitle } from '../title-generation';

describe('Title Generation - Property Tests', () => {
  /**
   * Temporary title generation follows rules
   *
   * For any message content, the generated temporary title should be
   * truncated to 60 characters maximum and should not end mid-word.
   *
   */
  describe('Temporary title generation follows rules', () => {
    // Arbitrary for generating message content with various lengths
    const messageArbitrary = fc.string({ maxLength: 500, minLength: 1 });

    // Arbitrary for generating messages with spaces (more realistic)
    const messageWithSpacesArbitrary = fc
      .array(
        fc.oneof(
          fc.string({ maxLength: 20, minLength: 1 }).filter((s) => !s.includes(' ')),
          fc.constant(' ')
        ),
        { maxLength: 50, minLength: 1 }
      )
      .map((parts) => parts.join(''))
      .filter((s) => s.trim().length > 0);

    // Arbitrary for generating long messages that will definitely be truncated
    const longMessageArbitrary = fc
      .array(fc.string({ maxLength: 15, minLength: 1 }), { maxLength: 30, minLength: 5 })
      .map((words) => words.join(' '))
      .filter((s) => s.trim().length > 60);

    it('should always produce a title with length <= 60 characters (excluding ellipsis)', () => {
      fc.assert(
        fc.property(messageArbitrary, (message) => {
          const title = generateTemporaryTitle(message);

          // If it's a fallback title, it will be longer due to timestamp
          if (title.startsWith('Conversation -')) {
            return true;
          }

          // Remove ellipsis for length check
          const titleWithoutEllipsis = title.endsWith('...') ? title.slice(0, -3) : title;

          expect(titleWithoutEllipsis.length).toBeLessThanOrEqual(60);
        }),
        { numRuns: 100 }
      );
    });

    it('should add ellipsis when message is truncated', () => {
      fc.assert(
        fc.property(longMessageArbitrary, (message) => {
          const title = generateTemporaryTitle(message);

          // Long messages should always be truncated with ellipsis
          expect(title.endsWith('...')).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should not add ellipsis when message is 60 characters or less', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 60, minLength: 1 }).filter((s) => s.trim().length > 0),
          (message) => {
            const trimmedMessage = message.trim();
            if (trimmedMessage.length <= 60) {
              const title = generateTemporaryTitle(message);

              // Short messages should not have ellipsis
              expect(title.endsWith('...')).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not end mid-word when truncated (if space exists after position 30)', () => {
      fc.assert(
        fc.property(longMessageArbitrary, (message) => {
          const title = generateTemporaryTitle(message);
          const trimmedMessage = message.trim();

          // Only check if message was truncated
          if (trimmedMessage.length > 60 && title.endsWith('...')) {
            const titleWithoutEllipsis = title.slice(0, -3);

            // Find the last space in the first 60 characters of the original message
            const first60 = trimmedMessage.slice(0, 60);
            const lastSpaceInFirst60 = first60.lastIndexOf(' ');

            // If there's a space after position 30, the title should end at a word boundary
            if (lastSpaceInFirst60 > 30) {
              // The title should end at a space boundary (not mid-word)
              // This means the character after the title content should be a space in the original
              const titleLength = titleWithoutEllipsis.length;
              const nextCharInOriginal = trimmedMessage[titleLength];

              // Either the title ends at a word boundary (next char is space or undefined)
              // or the title is exactly 60 chars (no space found after position 30)
              expect(
                nextCharInOriginal === ' ' || nextCharInOriginal === undefined || titleLength === 60
              ).toBe(true);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve original message when length is 60 or less', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 60, minLength: 1 }).filter((s) => s.trim().length > 0),
          (message) => {
            const trimmedMessage = message.trim();
            if (trimmedMessage.length <= 60) {
              const title = generateTemporaryTitle(message);
              expect(title).toBe(trimmedMessage);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty or whitespace-only messages with fallback', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.array(fc.constant(' '), { maxLength: 20, minLength: 1 }).map((arr) => arr.join(''))
          ),
          (message) => {
            const title = generateTemporaryTitle(message);

            // Empty/whitespace messages should use fallback format
            expect(title).toContain('Conversation -');
            expect(title).toMatch(/Conversation - \d{4}-\d{2}-\d{2}T/);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should always trim leading and trailing whitespace', () => {
      fc.assert(
        fc.property(
          fc
            .tuple(
              fc.array(fc.constant(' '), { maxLength: 5, minLength: 0 }).map((arr) => arr.join('')),
              fc.string({ maxLength: 50, minLength: 1 }).filter((s) => s.trim().length > 0),
              fc.array(fc.constant(' '), { maxLength: 5, minLength: 0 }).map((arr) => arr.join(''))
            )
            .map(([leading, content, trailing]) => leading + content + trailing),
          (message) => {
            const title = generateTemporaryTitle(message);

            // Title should not start or end with whitespace
            expect(title).toBe(title.trim());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent output for the same input', () => {
      fc.assert(
        fc.property(messageWithSpacesArbitrary, (message) => {
          const title1 = generateTemporaryTitle(message);
          const title2 = generateTemporaryTitle(message);

          // Same input should produce same output (except for fallback with timestamp)
          if (!title1.startsWith('Conversation -')) {
            expect(title1).toBe(title2);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle messages with only special characters', () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')'), {
              maxLength: 100,
              minLength: 1,
            })
            .map((arr) => arr.join(''))
            .filter((s) => s.trim().length > 0),
          (message) => {
            const title = generateTemporaryTitle(message);

            // Should still follow length rules
            if (!title.startsWith('Conversation -')) {
              const titleWithoutEllipsis = title.endsWith('...') ? title.slice(0, -3) : title;
              expect(titleWithoutEllipsis.length).toBeLessThanOrEqual(60);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle messages with unicode characters', () => {
      fc.assert(
        fc.property(fc.string({ maxLength: 200, minLength: 1, unit: 'grapheme' }), (message) => {
          const title = generateTemporaryTitle(message);

          // Should not throw and should follow basic rules
          expect(typeof title).toBe('string');
          expect(title.length).toBeGreaterThan(0);
        }),
        { numRuns: 50 }
      );
    });
  });
});
