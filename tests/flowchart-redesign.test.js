import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOW_STEPS, flowPosition, createFlowStep, connectFlowNodes,
} from '../src/flowchart-model.js';
import { mobileActionMarkup } from '../src/mobile-actions.js';

let counter = 0;
const makeId = () => String(++counter);

test('flowchart roles use recognizable process, decision, data and terminator shapes', () => {
  assert.equal(FLOW_STEPS.process.type, 'shape');
  assert.equal(FLOW_STEPS.decision.type, 'diamond');
  assert.equal(FLOW_STEPS.data.type, 'parallelogram');
  assert.equal(FLOW_STEPS.start.type, 'pill');
  assert.equal(FLOW_STEPS.end.type, 'pill');
});

test('creating a successor preserves existing art and connects with an elbow arrow', () => {
  counter = 0;
  const original = {
    id: 'existing', type: 'shape', x: 100, y: 200, w: 190, h: 90, text: 'Original',
  };
  const old = { ...original };
  const objects = [original];
  const next = createFlowStep(objects, {
    role: 'decision', fromId: 'existing', makeId, center: { x: 900, y: 500 },
  });
  assert.deepEqual(original, old);
  assert.equal(next.type, 'diamond');
  assert.equal(next.flowRole, 'decision');
  assert.ok(next.x > original.x + original.w);
  assert.equal(objects.length, 3);
  const edge = objects.find((o) => o.type === 'connector');
  assert.equal(edge.from, 'existing');
  assert.equal(edge.to, next.id);
  assert.equal(edge.route, 'elbow');
  assert.equal(edge.endArrow, 'filled');
  assert.equal(edge.flowEdge, true);
});

test('auto placement avoids occupied whiteboard areas', () => {
  const objects = [
    { id: 'origin', type: 'shape', x: 100, y: 100, w: 200, h: 100 },
    { id: 'occupied', type: 'sticky', x: 390, y: 50, w: 210, h: 180 },
  ];
  const next = flowPosition(objects, objects[0], { w: 200, h: 100 });
  assert.ok(next.x >= 0);
  const overlapping = (a, b) =>
    a.x < b.x + b.w + 24 && a.x + a.w + 24 > b.x &&
    a.y < b.y + b.h + 24 && a.y + a.h + 24 > b.y;
  assert.equal(overlapping(next, objects[1]), false);
});

test('link creation rejects self links and duplicates', () => {
  counter = 0;
  const objects = [
    { id: 'a', type: 'shape', x: 0, y: 0, w: 100, h: 70 },
    { id: 'b', type: 'shape', x: 300, y: 0, w: 100, h: 70 },
  ];
  assert.throws(() => connectFlowNodes(objects, 'a', 'a', makeId), /different/);
  const first = connectFlowNodes(objects, 'a', 'b', makeId);
  assert.strictEqual(connectFlowNodes(objects, 'a', 'b', makeId), first);
  assert.strictEqual(connectFlowNodes(objects, 'b', 'a', makeId), first);
  assert.equal(objects.length, 3);
});

test('mobile flowchart selection offers explicit linked next-step action', () => {
  const selected = [{ id: 'a', type: 'shape', x: 0, y: 0, w: 100, h: 80 }];
  const standard = mobileActionMarkup(selected, null);
  const flow = mobileActionMarkup(selected, null, 'points', null, 'flowchart');
  assert.doesNotMatch(standard, /flow-next/);
  assert.match(flow, /data-mobile-action="flow-next"/);
  assert.match(flow, /data-mobile-action="connect"/);
});
