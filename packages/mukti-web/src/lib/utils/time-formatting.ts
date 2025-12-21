/**
 * Time formatting utilities for displaying relative timestamps
 */

/**
 * Formats a timestamp into a human-readable relative time string
 *
 * @param timestamp - ISO 8601 timestamp string
 * @returns Formatted relative time (e.g., "2 hours ago", "just now")
 *
 * @example
 * ```typescript
 * formatRelativeTime('2024-01-01T12:00:00Z') // "2 hours ago"
 * formatRelativeTime('2024-01-01T23:59:00Z') // "just now"
 * ```
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Just now (< 1 minute)
  if (diffInSeconds < 60) {
    return 'just now';
  }

  // Minutes ago (< 1 hour)
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  // Hours ago (< 1 day)
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  // Days ago (< 1 week)
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // Weeks ago (< 1 month)
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }

  // Months ago (< 1 year)
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }

  // Years ago
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}
