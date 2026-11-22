/** Reference solution. Same run-tracking shape with a tolerance comparison. */
export function longestSteadyRun(steps, tolerance) {
  if (steps.length === 0) {
    return 0;
  }
  let current = 1;
  let best = 1;
  for (let i = 1; i < steps.length; i++) {
    current = Math.abs(steps[i] - steps[i - 1]) <= tolerance ? current + 1 : 1;
    best = Math.max(best, current);
  }
  return best;
}
