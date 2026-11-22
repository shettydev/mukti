/**
 * Returns the tasks ordered for a work queue: highest `priority` first, and
 * among equal priorities the earliest `due` date first. `due` is an ISO date
 * string such as "2026-03-04". The input array is not modified.
 */
export function orderQueue(tasks) {
  return [...tasks].sort(byPriorityThenDue);
}

function byPriorityThenDue(a, b) {
  return a.priority < b.priority || a.due > b.due;
}
