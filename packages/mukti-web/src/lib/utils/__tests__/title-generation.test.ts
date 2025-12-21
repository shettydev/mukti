import { generateTemporaryTitle } from '../title-generation';

describe('generateTemporaryTitle', () => {
  it('should return message as-is when length is 60 or less', () => {
    const shortMessage = 'How do I optimize React performance?';
    expect(generateTemporaryTitle(shortMessage)).toBe(shortMessage);
  });

  it('should return message as-is when exactly 60 characters', () => {
    const exactMessage = 'This message is exactly sixty characters long for testing!!!';
    expect(exactMessage.length).toBe(60);
    expect(generateTemporaryTitle(exactMessage)).toBe(exactMessage);
  });

  it('should truncate long messages to 60 characters with ellipsis', () => {
    const longMessage =
      'This is a very long message that will definitely exceed the sixty character limit and needs truncation';
    const result = generateTemporaryTitle(longMessage);

    expect(result.length).toBeLessThanOrEqual(63); // 60 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('should remove incomplete words at the end when truncating', () => {
    const message = 'This is a message with multiple words that will be truncated at some point';
    const result = generateTemporaryTitle(message);

    // Should not end with partial word before ellipsis
    const withoutEllipsis = result.replace('...', '');
    expect(withoutEllipsis.endsWith(' ')).toBe(false);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should handle messages with no spaces gracefully', () => {
    const noSpaceMessage =
      'Thisisaverylongmessagewithnospacesthatwillbetruncat edbutcannotremoveincompletewords';
    const result = generateTemporaryTitle(noSpaceMessage);

    expect(result.length).toBeLessThanOrEqual(63);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should handle empty messages with fallback', () => {
    const result = generateTemporaryTitle('');
    expect(result).toContain('Conversation -');
    expect(result).toMatch(/Conversation - \d{4}-\d{2}-\d{2}T/);
  });

  it('should handle whitespace-only messages with fallback', () => {
    const result = generateTemporaryTitle('   ');
    expect(result).toContain('Conversation -');
  });

  it('should trim leading and trailing whitespace', () => {
    const message = '  How do I optimize React?  ';
    const result = generateTemporaryTitle(message);
    expect(result).toBe('How do I optimize React?');
  });

  it('should not remove words when last space is before position 30', () => {
    // Create a message with space at position 20, then no spaces until after 60
    const message = 'Short message then verylongwordwithoutanyspacesthatgoespastsixtychars';
    const result = generateTemporaryTitle(message);

    // Should truncate at 60 and add ellipsis, not go back to position 20
    expect(result.length).toBeGreaterThan(33); // More than 30 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('should handle messages with punctuation correctly', () => {
    const message = "What's the best way to handle state management in React applications?";
    const result = generateTemporaryTitle(message);

    expect(result.endsWith('...')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(63);
  });
});
