/**
 * Text truncation utilities for canvas node display
 *
 * Provides consistent text truncation across canvas nodes:
 * - Seed nodes truncate at 100 characters
 * - Satellite nodes (Soil/Root) truncate at 50 characters
 */

/**
 * Maximum character length for Seed node text display
 */
export const SEED_TRUNCATE_LENGTH = 100;

/**
 * Maximum character length for satellite node (Soil/Root) text display
 */
export const SATELLITE_TRUNCATE_LENGTH = 50;

/**
 * Checks if text would be truncated at the given threshold
 *
 * @param text - The text to check
 * @param maxLength - Maximum length threshold
 * @returns True if text exceeds maxLength
 *
 * @example
 * ```typescript
 * if (shouldTruncate(label, SEED_TRUNCATE_LENGTH)) {
 *   // Show tooltip with full text
 * }
 * ```
 */
export function shouldTruncate(
  text: string,
  maxLength: number = SATELLITE_TRUNCATE_LENGTH
): boolean {
  if (!text) {
    return false;
  }

  return text.length > maxLength;
}

/**
 * Truncates text to a specified length with ellipsis
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: SATELLITE_TRUNCATE_LENGTH)
 * @returns Truncated text with ellipsis if exceeds maxLength, otherwise original text
 *
 * @example
 * ```typescript
 * // Truncate seed node text
 * truncateText(problemStatement, SEED_TRUNCATE_LENGTH);
 * // "This is a very long problem statement that exceeds..."
 *
 * // Truncate satellite node text
 * truncateText(contextItem, SATELLITE_TRUNCATE_LENGTH);
 * // "This context item is too long to display..."
 *
 * // Text shorter than threshold returns unchanged
 * truncateText("Short text", 50);
 * // "Short text"
 * ```
 */
export function truncateText(text: string, maxLength: number = SATELLITE_TRUNCATE_LENGTH): string {
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}
