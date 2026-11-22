import assert from 'node:assert/strict';
import { test } from 'node:test';

import { orderQueue } from './queue.mjs';

test('reported case: urgent tasks are not moved to the front', () => {
  const tasks = [
    { due: '2026-03-02', id: 't1', priority: 1 },
    { due: '2026-03-05', id: 't2', priority: 3 },
    { due: '2026-03-01', id: 't3', priority: 3 },
    { due: '2026-03-04', id: 't4', priority: 2 },
  ];
  assert.deepEqual(
    orderQueue(tasks).map((task) => task.id),
    ['t3', 't2', 't4', 't1']
  );
});
