import test from 'node:test';
import assert from 'node:assert/strict';
import {
  publishTask,
  readTaskQueue,
  TASK_BRIDGE_CHANNEL,
  TASK_BRIDGE_KEY,
} from '../src/task-bridge.js';

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
    id: 'task-1',
    name: 'Run qPCR',
    notes: '',
    priority: 'High',
    dueDate: '',
    boardId: 'board-1',
    nodeId: '',
    createdAt: '',
  });
  assert.match(store.getItem(TASK_BRIDGE_KEY), /task-1/);
});

test('publishing a task notifies an open Benchline tab', () => {
  const messages = [];
  const previous = globalThis.BroadcastChannel;
  globalThis.BroadcastChannel = class {
    constructor(name) {
      this.name = name;
    }
    postMessage(data) {
      messages.push({ name: this.name, data });
    }
    close() {}
  };
  try {
    assert.equal(publishTask({ id: 'task-2', name: 'Label gels' }, storage()), true);
    assert.deepEqual(messages, [{ name: TASK_BRIDGE_CHANNEL, data: { type: 'tasks' } }]);
  } finally {
    globalThis.BroadcastChannel = previous;
  }
});

test('invalid tasks do not enter queue and failed storage is reported', () => {
  const store = storage();
  assert.throws(() => publishTask({ id: '', name: 'Missing ID' }, store));
  assert.equal(
    publishTask(
      { id: 'x', name: 'Valid' },
      {
        getItem: () => null,
        setItem: () => {
          throw Error('quota');
        },
      },
    ),
    false,
  );
});
