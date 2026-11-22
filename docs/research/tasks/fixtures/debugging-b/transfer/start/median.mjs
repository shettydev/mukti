/**
 * Returns the median of `numbers`: the middle value once they are sorted from
 * smallest to largest, or the mean of the two middle values when there is an
 * even count. Returns undefined for an empty list. The input is not modified.
 */
export function median(numbers) {
  if (numbers.length === 0) {
    return undefined;
  }
  const sorted = [...numbers].sort();
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
