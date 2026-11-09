import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

function hostedModule() {
  const source = fs.readFileSync('integration/sai/HostedPersistence.ts', 'utf8');
  const code = transformSync(source, { loader: 'ts', format: 'cjs' }).code;
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    localStorage: storage,
    console,
    Date,
    JSON,
    Array,
    Set,
    Math,
    Blob,
    URL,
    URLSearchParams,
    document: {},
  });
  return { bridge: module.exports, storage };
}

const project = () => ({
  tasks: [],
  groups: [],
  people: [],
  notes: [],
  assignments: [],
  meetings: [],
  jobs: [],
  projectStartDate: new Date('2026-11-01T12:00:00'),
  projectEndDate: new Date('2026-11-30T12:00:00'),
});

test('hosted Sai imports Sparkboard task creations with stable IDs, optional due dates and no duplication', () => {
  const { bridge, storage } = hostedModule();
  storage.setItem(
    bridge.TASK_BRIDGE_KEY,
    JSON.stringify([
      {
        id: 'new-task',
        name: 'Prepare sequencing',
        priority: 'High',
        dueDate: '2026-12-05',
        boardId: 'board-123',
        notes: 'Check kit stock',
      },
    ]),
  );
  const merged = bridge.mergeSparkboardTasks(project());
  assert.equal(merged.tasks.length, 1);
  assert.equal(merged.tasks[0].id, 'sparkboard:new-task');
  assert.equal(merged.tasks[0].name, 'Prepare sequencing');
  assert.equal(merged.tasks[0].priority, 'High');
  assert.equal(merged.tasks[0].endDate.getDate(), 5);
  assert.ok(merged.projectEndDate.getTime() >= merged.tasks[0].endDate.getTime());
  assert.match(merged.tasks[0].notes, /board-123/);
  assert.equal(merged.tasks[0].tags[0], 'Sparkboard');
  assert.equal(bridge.mergeSparkboardTasks(merged), merged);
  bridge.saveHostedProject(merged);
  assert.equal(JSON.parse(storage.getItem(bridge.TASK_BRIDGE_KEY)).length, 0);
  const saved = bridge.loadHostedProject();
  assert.equal(saved.tasks.length, 1);
  assert.ok(saved.tasks[0].startDate instanceof Date);
});

test('hosted Sai preserves an unconsumed task until its project saves successfully', () => {
  const { bridge, storage } = hostedModule();
  storage.setItem(bridge.TASK_BRIDGE_KEY, JSON.stringify([{ id: 'x', name: 'Run validation' }]));
  bridge.saveHostedProject(project());
  assert.equal(JSON.parse(storage.getItem(bridge.TASK_BRIDGE_KEY)).length, 1);
  const saved = bridge.mergeSparkboardTasks(project());
  bridge.saveHostedProject(saved);
  assert.equal(JSON.parse(storage.getItem(bridge.TASK_BRIDGE_KEY)).length, 0);
});

test('planner publishes saved task edits and safe return links to the source board', () => {
  const { bridge, storage } = hostedModule();
  storage.setItem(
    bridge.TASK_BRIDGE_KEY,
    JSON.stringify([
      { id: 't', name: 'Original', notes: 'Details', boardId: 'board & 1', nodeId: 'node#1' },
    ]),
  );
  const merged = bridge.mergeSparkboardTasks(project());
  const task = merged.tasks[0];
  task.name = 'Edited in Benchline';
  task.completion = 100;
  bridge.saveHostedProject(merged);
  const snapshot = JSON.parse(storage.getItem(bridge.TASK_BRIDGE_STATE_KEY)).t;
  assert.equal(snapshot.name, task.name);
  assert.equal(snapshot.completion, 100);
  assert.equal(snapshot.notes, 'Details');
  assert.equal(snapshot.boardId, 'board & 1');
  assert.equal(snapshot.nodeId, 'node#1');
  assert.equal(bridge.sourceBoardHref(task), '/?workspace=1&board=board+%26+1&node=node%231');
  merged.tasks = [];
  bridge.saveHostedProject(merged);
  assert.equal(JSON.parse(storage.getItem(bridge.TASK_BRIDGE_STATE_KEY)).t.missing, true);
  assert.equal(bridge.sourceBoardHref({ id: 'unrelated', notes: 'No source' }), null);
});

test('failed project save cannot publish an unpersisted task update or acknowledge its queue', () => {
  const { bridge, storage } = hostedModule();
  storage.setItem(bridge.TASK_BRIDGE_KEY, JSON.stringify([{ id: 't', name: 'Original' }]));
  const merged = bridge.mergeSparkboardTasks(project());
  const setItem = storage.setItem;
  storage.setItem = (key, value) => {
    if (key === 'sai.hosted.project.v1') throw Error('quota');
    setItem(key, value);
  };
  bridge.saveHostedProject(merged);
  assert.equal(storage.getItem(bridge.TASK_BRIDGE_STATE_KEY), null);
  assert.equal(storage.getItem(bridge.TASK_BRIDGE_RECEIPT_KEY), null);
  assert.equal(JSON.parse(storage.getItem(bridge.TASK_BRIDGE_KEY)).length, 1);
});
