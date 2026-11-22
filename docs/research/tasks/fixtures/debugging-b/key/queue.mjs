/**
 * Reference solution. A sort comparator must return a negative, zero or
 * positive number. A boolean becomes 0 or 1, never negative, so the sort
 * cannot move items forward.
 */
export function orderQueue(tasks) {
  return [...tasks].sort(byPriorityThenDue);
}

function byPriorityThenDue(a, b) {
  if (a.priority !== b.priority) {
    return b.priority - a.priority;
  }
  return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
}
