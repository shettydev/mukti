/**
 * Reference solution. Track the current run and the best run in one pass.
 * The best run must be updated inside the loop, not only when a run breaks,
 * or a plateau that reaches the last reading is missed.
 */
export function longestPlateau(levels) {
  if (levels.length === 0) {
    return 0;
  }
  let current = 1;
  let best = 1;
  for (let i = 1; i < levels.length; i++) {
    current = levels[i] === levels[i - 1] ? current + 1 : 1;
    best = Math.max(best, current);
  }
  return best;
}
