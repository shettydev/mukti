/**
 * Generates a temporary conversation title from the first message content.
 *
 * The title is created by:
 * 1. Truncating the message to a maximum of 60 characters
 * 2. Removing incomplete words at the end (if truncated)
 * 3. Adding an ellipsis if the message was truncated
 *
 * @param message - The first message content to generate a title from
 * @returns A formatted title string (max 60 characters)
 *
 * @example
 * ```typescript
 * generateTemporaryTitle('How do I optimize React performance?')
 * // Returns: 'How do I optimize React performance?'
 *
 * generateTemporaryTitle('This is a very long message that will definitely exceed the sixty character limit')
 * // Returns: 'This is a very long message that will definitely exceed the...'
 * ```
 */
export function generateTemporaryTitle(message: string): string {
  // Handle empty or whitespace-only messages
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return `Conversation - ${new Date().toISOString()}`;
  }

  // If message is 60 characters or less, return as-is
  if (trimmedMessage.length <= 60) {
    return trimmedMessage;
  }

  // Truncate to 60 characters
  let truncated = trimmedMessage.slice(0, 60);

  // Find the last space to avoid cutting words
  const lastSpace = truncated.lastIndexOf(' ');

  // Only remove incomplete word if there's a space after position 30
  // This prevents returning very short titles for messages without spaces
  if (lastSpace > 30) {
    truncated = truncated.slice(0, lastSpace);
  }

  // Add ellipsis
  return `${truncated}...`;
}
