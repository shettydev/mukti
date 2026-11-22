/**
 * Reference solution. Track the current run and the best run in one pass.
 * The best run must be updated inside the loop, not only when a run breaks,
 * or a streak that reaches the last day is missed.
 */
export function longestWarmingStreak(temps) {
  if (temps.length === 0) {
    return 0;
  }
  let current = 1;
  let best = 1;
  for (let i = 1; i < temps.length; i++) {
    current = temps[i] > temps[i - 1] ? current + 1 : 1;
    best = Math.max(best, current);
  }
  return best;
}
