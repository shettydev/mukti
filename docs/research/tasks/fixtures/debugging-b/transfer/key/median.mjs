/**
 * Reference solution. Without a comparator, sort compares values as strings,
 * so 100 sorts before 40. A numeric comparator returns a - b.
 */
export function median(numbers) {
  if (numbers.length === 0) {
    return undefined;
  }
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
