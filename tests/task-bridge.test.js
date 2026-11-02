import test from 'node:test';
import assert from 'node:assert/strict';
import { publishTask, readTaskQueue, TASK_BRIDGE_KEY } from '../src/task-bridge.js';

const storage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};

test('tasks transfer once and survive repeat publishes', () => {
  const store = storage();
  const task = { id: 'task-1', name: ' Run qPCR ', priority: 'High', boardId: 'board-1' };
  assert.equal(publishTask(task, store), true);
  assert.equal(publishTask(task, store), true);
  assert.equal(readTaskQueue(store).length, 1);
  assert.deepEqual(readTaskQueue(store)[0], {
    id: 'task-1', name: 'Run qPCR', notes: '', priority: 'High',
    dueDate: '', boardId: 'board-1', nodeId: '', createdAt: '',
  });
  assert.match(store.getItem(TASK_BRIDGE_KEY), /task-1/);
});

test('invalid tasks do not enter queue and failed storage is reported', () => {
  const store = storage();
  assert.throws(() => publishTask({ id: '', name: 'Missing ID' }, store));
  assert.equal(publishTask({ id: 'x', name: 'Valid' }, { getItem: () => null, setItem: () => { throw Error('quota'); } }), false);
});
