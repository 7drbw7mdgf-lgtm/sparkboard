import test from 'node:test';
import assert from 'node:assert/strict';
import {
  publishTask,
  readTaskQueue,
  TASK_BRIDGE_CHANNEL,
  TASK_BRIDGE_KEY,
  TASK_BRIDGE_RECEIPT_KEY,
  readTaskReceipts,
  taskHandoffStatus,
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

test('Sparkboard shows queued versus saved status and never resends acknowledged tasks', () => {
  const store = storage();
  const task = { id: 'sent-1', name: 'Analyse results', priority: 'Medium' };
  assert.equal(taskHandoffStatus(task.id, store), 'missing');
  assert.equal(publishTask(task, store), true);
  assert.equal(taskHandoffStatus(task.id, store), 'queued');
  store.setItem(TASK_BRIDGE_RECEIPT_KEY, JSON.stringify([task.id]));
  assert.ok(readTaskReceipts(store).has(task.id));
  assert.equal(taskHandoffStatus(task.id, store), 'saved');
  store.setItem(TASK_BRIDGE_KEY, '[]');
  assert.equal(publishTask(task, store), true);
  assert.deepEqual(readTaskQueue(store), []);
});

test('linked task snapshots update board fields without changing customised labels or other boards', async () => {
  const { syncLinkedTasks, TASK_BRIDGE_STATE_KEY, plannerTaskHref } =
    await import('../src/task-bridge.js');
  const store = storage();
  const node = { id: 'node-1', text: 'Original', sparkTask: { id: 'task-1', name: 'Original' } };
  const board = { id: 'board-1', objects: [node] };
  const task = {
    boardId: 'board-1',
    nodeId: 'node-1',
    name: 'Updated',
    notes: 'New notes',
    priority: 'High',
    dueDate: '2026-12-01',
    startDate: '2026-11-01',
    completion: 100,
  };
  store.setItem(TASK_BRIDGE_STATE_KEY, JSON.stringify({ 'task-1': task }));
  assert.equal(syncLinkedTasks(board, store), true);
  assert.equal(node.text, 'Updated');
  assert.equal(node.sparkTask.completion, 100);
  assert.equal(node.sparkTask.dueDate, '2026-12-01');
  assert.equal(syncLinkedTasks(board, store), false, 'no repeated board saves');
  node.text = 'My canvas label';
  store.setItem(
    TASK_BRIDGE_STATE_KEY,
    JSON.stringify({ 'task-1': { ...task, name: 'Another update', missing: true } }),
  );
  assert.equal(syncLinkedTasks(board, store), true);
  assert.equal(node.text, 'My canvas label');
  assert.equal(node.sparkTask.plannerMissing, true);
  assert.equal(board.objects.length, 1, 'planner removal never erases a canvas node');
  assert.equal(syncLinkedTasks({ id: 'different-board', objects: [node] }, store), false);
  assert.equal(plannerTaskHref('task / ?'), '/sai/?task=sparkboard%3Atask%20%2F%20%3F');
});

test('malformed linked snapshots and storage errors cannot damage a board', async () => {
  const { syncLinkedTasks, TASK_BRIDGE_STATE_KEY } = await import('../src/task-bridge.js');
  const store = storage();
  const board = {
    id: 'b',
    objects: [{ id: 'n', text: 'Original', sparkTask: { id: 't', name: 'Original' } }],
  };
  for (const value of ['[1]', 'null', 'bad json', '{"t":{"boardId":"b"}}']) {
    store.setItem(TASK_BRIDGE_STATE_KEY, value);
    assert.equal(syncLinkedTasks(board, store), false);
    assert.equal(board.objects[0].text, 'Original');
  }
  assert.equal(
    syncLinkedTasks(board, {
      getItem() {
        throw Error('blocked');
      },
    }),
    false,
  );
});
