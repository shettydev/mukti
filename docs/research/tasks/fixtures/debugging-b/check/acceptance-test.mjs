import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

// Observer runs: TASK_DIR=<participant folder> node --test check/acceptance-test.mjs
const dir = process.env.TASK_DIR
  ? pathToFileURL(resolve(process.env.TASK_DIR) + '/')
  : new URL('../start/', import.meta.url);
const { orderQueue } = await import(new URL('queue.mjs', dir).href);

const ids = (tasks) => tasks.map((task) => task.id);

test('the reported queue', () => {
  const tasks = [
    { due: '2026-03-02', id: 't1', priority: 1 },
    { due: '2026-03-05', id: 't2', priority: 3 },
    { due: '2026-03-01', id: 't3', priority: 3 },
    { due: '2026-03-04', id: 't4', priority: 2 },
  ];
  assert.deepEqual(ids(orderQueue(tasks)), ['t3', 't2', 't4', 't1']);
});

test('equal priorities are ordered by due date, earliest first', () => {
  const tasks = [
    { due: '2026-05-09', id: 'late', priority: 2 },
    { due: '2026-05-01', id: 'early', priority: 2 },
    { due: '2026-05-04', id: 'middle', priority: 2 },
  ];
  assert.deepEqual(ids(orderQueue(tasks)), ['early', 'middle', 'late']);
});

test('priority outranks the due date', () => {
  const tasks = [
    { due: '2026-01-01', id: 'soon-low', priority: 1 },
    { due: '2026-12-31', id: 'later-high', priority: 5 },
  ];
  assert.deepEqual(ids(orderQueue(tasks)), ['later-high', 'soon-low']);
});

test('priorities of 10 or more are compared as numbers', () => {
  const tasks = [
    { due: '2026-02-01', id: 'p9', priority: 9 },
    { due: '2026-02-01', id: 'p10', priority: 10 },
  ];
  assert.deepEqual(ids(orderQueue(tasks)), ['p10', 'p9']);
});

test('a larger mixed queue is fully ordered', () => {
  const tasks = Array.from({ length: 12 }, (_, i) => ({
    due: `2026-04-${String(12 - i).padStart(2, '0')}`,
    id: `t${i}`,
    priority: i % 3,
  }));
  const ordered = orderQueue(tasks);
  for (let i = 1; i < ordered.length; i++) {
    const [prev, next] = [ordered[i - 1], ordered[i]];
    assert.ok(
      prev.priority > next.priority || (prev.priority === next.priority && prev.due <= next.due),
      `${prev.id} should not come before ${next.id}`
    );
  }
});

test('the input array is not modified', () => {
  const tasks = [
    { due: '2026-03-02', id: 'a', priority: 1 },
    { due: '2026-03-01', id: 'b', priority: 2 },
  ];
  const before = structuredClone(tasks);
  orderQueue(tasks);
  assert.deepEqual(tasks, before);
});

test('an empty queue stays empty', () => {
  assert.deepEqual(orderQueue([]), []);
});
