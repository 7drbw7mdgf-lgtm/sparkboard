import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlowStep } from '../src/flowchart-model.js';

test('dropping a flowchart connector creates a linked node at the release point', () => {
  const objects = [{
    id: 'start', type: 'pill', x: 10, y: 30, w: 160, h: 70,
    text: 'Start', flowRole: 'start',
  }];
  let count = 0;
  const created = createFlowStep(objects, {
    fromId: 'start',
    role: 'process',
    dropPosition: { x: 440.6, y: 220.3 },
    makeId: () => 'new-' + ++count,
  });
  assert.equal(created.x, 441);
  assert.equal(created.y, 220);
  assert.equal(created.text, 'New step');
  assert.equal(objects.length, 3);
  assert.equal(objects[2].type, 'connector');
  assert.equal(objects[2].from, 'start');
  assert.equal(objects[2].to, created.id);
});

test('normal flowchart quick-add retains automatic placement', () => {
  const objects = [{ id: 'first', type: 'shape', x: 0, y: 0, w: 200, h: 100 }];
  let index = 0;
  const created = createFlowStep(objects, {
    fromId: 'first',
    makeId: () => 'id-' + ++index,
  });
  assert.equal(created.x, 312);
  assert.equal(created.y, 2);
  assert.equal(objects[2].to, created.id);
});
