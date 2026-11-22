/** Reference solution. Same run-tracking shape, but a run can be 0 long. */
export function longestHighStretch(bpm, threshold) {
  let current = 0;
  let best = 0;
  for (const reading of bpm) {
    current = reading >= threshold ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}
