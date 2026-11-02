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
  vm.runInNewContext(code, { module, exports: module.exports, localStorage: storage, console, Date,
    JSON, Array, Set, Math, Blob, URL, document: {} });
  return { bridge: module.exports, storage };
}

const project = () => ({
  tasks: [], groups: [], people: [], notes: [], assignments: [], meetings: [], jobs: [],
  projectStartDate: new Date('2026-11-01T12:00:00'),
  projectEndDate: new Date('2026-11-30T12:00:00'),
});

test('hosted Sai imports Sparkboard task creations with stable IDs, optional due dates and no duplication', () => {
  const { bridge, storage } = hostedModule();
  storage.setItem(bridge.TASK_BRIDGE_KEY, JSON.stringify([
    { id: 'new-task', name: 'Prepare sequencing', priority: 'High',
      dueDate: '2026-12-05', boardId: 'board-123', notes: 'Check kit stock' },
  ]));
  const merged = bridge.mergeSparkboardTasks(project());
  assert.equal(merged.tasks.length, 1);
  assert.equal(merged.tasks[0].id, 'sparkboard:new-task');
  assert.equal(merged.tasks[0].name, 'Prepare sequencing');
  assert.equal(merged.tasks[0].priority, 'High');
  assert.equal(merged.tasks[0].endDate.getDate(), 5);
  assert.ok(merged.projectEndDate.getTime() >= merged.tasks[0].endDate.getTime());
  assert.match(merged.tasks[0].notes, /board-123/);
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
