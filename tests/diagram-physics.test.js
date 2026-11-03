import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../board-model.js';
import {
  appendMindNode,
  floatMindTopic,
  layoutMindmap,
  reparentMindTopic,
} from '../src/mindmap-model.js';

const note = (id, x = 0, y = 0, extra = {}) => ({
  id,
  type: 'sticky',
  x,
  y,
  w: 100,
  h: 80,
  text: id,
  ...extra,
});

const topic = (id, extra = {}) => ({
  id,
  type: 'shape',
  x: 0,
  y: 0,
  w: 190,
  h: 74,
  text: id,
  mindmap: true,
  mindParent: null,
  ...extra,
});

test('a point beside an anchor cross snaps, and a distant outline point is glued', () => {
  const shape = note('a');
  const snapped = M.nearestBinding([shape], { x: 105, y: 19 }, null, 26);
  assert.equal(snapped.port, 'e');
  assert.equal(snapped.anchor, undefined);
  const glued = M.nearestBinding([shape], { x: 8, y: -6 }, null, 26);
  assert.equal(glued.port, undefined);
  assert.ok(glued.anchor.x < 0.35 && glued.anchor.y < 0.2);
});

test('a relationship slides along a topic until a port is pinned', () => {
  const a = note('a');
  const b = note('b', 300, 0);
  const slide = { from: 'a', to: 'b', route: 'straight', relationship: true };
  const facingRight = M.connectorRoute(slide, [a, b]).start.x;
  b.x = -300;
  const facingLeft = M.connectorRoute(slide, [a, b]).start.x;
  assert.ok(facingLeft < facingRight - 40, 'an unpinned end follows the other topic');
  b.x = 300;
  const pinned = {
    from: 'a',
    to: 'b',
    fromPort: 'e',
    toPort: 'w',
    route: 'straight',
    avoidObstacles: false,
  };
  const east = M.connectorRoute(pinned, [a, b]).start.x;
  b.x = -300;
  assert.equal(M.connectorRoute(pinned, [a, b]).start.x, east);
});

test('folding a container stores its children before the frame shrinks', () => {
  const frame = { id: 'f', type: 'frame', x: 0, y: 0, w: 400, h: 300, text: 'GROUP' };
  const objects = [frame, note('in', 40, 80), note('out', 800, 800)];
  assert.equal(M.toggleFrameFold(frame, objects), true);
  assert.equal(frame.collapsed, true);
  assert.equal(frame.openH, 300);
  assert.equal(frame.h, 52);
  assert.deepEqual(frame.foldedIds, ['in']);
  assert.deepEqual(M.frameChildren(objects, 'f'), ['in']);
  assert.equal(M.foldedObjectIds(objects).has('in'), true);
  assert.equal(M.toggleFrameFold(frame, objects), true);
  assert.equal(frame.h, 300);
  assert.equal(frame.collapsed, false);
  assert.deepEqual(frame.foldedIds, []);
  assert.equal(M.foldedObjectIds(objects).size, 0);
});

test('a swimlane folds down to its header', () => {
  const lane = { id: 'lane', type: 'frame', x: 0, y: 0, w: 480, h: 360, swimlane: true };
  M.toggleFrameFold(lane, [lane, note('card', 40, 80)]);
  assert.equal(lane.h, 64);
  assert.deepEqual(lane.foldedIds, ['card']);
});

test('dropping a topic on another branch reparents it and a cycle is refused', () => {
  const objects = [topic('root')];
  appendMindNode(objects, { id: 'a', connectorId: 'ea', parentId: 'root', text: 'A' });
  appendMindNode(objects, { id: 'b', connectorId: 'eb', parentId: 'root', text: 'B' });
  appendMindNode(objects, { id: 'a1', connectorId: 'ea1', parentId: 'a', text: 'A1' });
  assert.equal(reparentMindTopic(objects, 'a1', 'b'), true);
  assert.equal(objects.find((item) => item.id === 'a1').mindParent, 'b');
  assert.equal(objects.find((item) => item.id === 'ea1').from, 'b');
  assert.equal(reparentMindTopic(objects, 'b', 'a1'), false);
  assert.equal(objects.find((item) => item.id === 'b').mindParent, 'root');
});

test('a topic released in empty space floats and layout leaves it where it was dropped', () => {
  const objects = [topic('root', { x: 100, y: 100 })];
  appendMindNode(objects, { id: 'child', connectorId: 'edge', parentId: 'root' });
  const child = objects.find((item) => item.id === 'child');
  child.x = 640;
  child.y = 420;
  assert.equal(floatMindTopic(objects, child.id), true);
  assert.equal(child.mindParent, null);
  assert.equal(child.mindFloating, true);
  assert.equal(
    objects.some((item) => item.mindBranch && item.to === 'child'),
    false,
  );
  layoutMindmap(objects);
  assert.equal(child.x, 640);
  assert.equal(child.y, 420);
});
