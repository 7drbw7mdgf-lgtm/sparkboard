import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendMindNode,
  adoptMindTree,
  hiddenMindmapIds,
  indexMindmap,
  layoutMindmap,
  outlineMindmap,
} from '../src/mindmap-model.js';

const root = (overrides = {}) => ({
  id: 'root',
  type: 'shape',
  x: 100,
  y: 100,
  w: 190,
  h: 74,
  text: 'Root',
  mindmap: true,
  mindParent: null,
  ...overrides,
});

test('new topics reuse standard shape and connector objects', () => {
  const objects = [root()];
  const child = appendMindNode(objects, {
    id: 'child',
    connectorId: 'edge',
    parentId: 'root',
    text: 'Child',
  });
  assert.equal(child.mindParent, 'root');
  assert.equal(child.type, 'shape');
  assert.deepEqual(
    objects.filter((item) => item.type === 'connector').map((item) => [item.from, item.to]),
    [['root', 'child']],
  );
  assert.equal(indexMindmap(objects).nodes.length, 2);
});

test('layout preserves unrelated whiteboard art and arranges siblings apart', () => {
  const art = { id: 'art', type: 'sticky', x: 870, y: 25, w: 120, h: 120 };
  const objects = [root(), art];
  appendMindNode(objects, { id: 'a', connectorId: 'ea', parentId: 'root' });
  appendMindNode(objects, { id: 'b', connectorId: 'eb', parentId: 'root' });
  const originalArt = { ...art };
  assert.equal(layoutMindmap(objects), 3);
  assert.deepEqual(art, originalArt);
  const a = objects.find((item) => item.id === 'a');
  const b = objects.find((item) => item.id === 'b');
  assert.equal(a.x, b.x);
  assert.ok(b.y >= a.y + a.h, 'siblings should not overlap');
  assert.equal(objects[0].y, 100, 'root anchor should be preserved');
});

test('collapsed branches hide descendants without deleting their board data', () => {
  const objects = [root({ mindCollapsed: true })];
  appendMindNode(objects, { id: 'child', connectorId: 'ec', parentId: 'root' });
  appendMindNode(objects, { id: 'grandchild', connectorId: 'eg', parentId: 'child' });
  assert.deepEqual([...hiddenMindmapIds(objects)].sort(), ['child', 'grandchild']);
  assert.equal(objects.length, 5);
  assert.equal(outlineMindmap(objects).find((row) => row.id === 'grandchild').concealed, true);
  objects[0].mindCollapsed = false;
  assert.equal(hiddenMindmapIds(objects).size, 0);
});

test('connected legacy mind map can be adopted without creating duplicate nodes', () => {
  const objects = [
    { id: 'r', type: 'shape', x: 0, y: 0, w: 120, h: 60 },
    { id: 'c', type: 'sticky', x: 300, y: 80, w: 120, h: 60 },
    { id: 'edge', type: 'connector', from: 'r', to: 'c' },
    { id: 'unrelated', type: 'shape', x: 900, y: 900, w: 120, h: 60 },
  ];
  assert.equal(adoptMindTree(objects, 'r'), 2);
  assert.equal(objects.length, 4);
  assert.equal(objects[1].mindParent, 'r');
  assert.equal(objects[3].mindmap, undefined);
});

test('cycles in imported hierarchy do not cause infinite traversal', () => {
  const objects = [
    root({ mindParent: 'child', mindCollapsed: true }),
    root({ id: 'child', mindParent: 'root', x: 200 }),
  ];
  assert.equal(indexMindmap(objects).roots.length, 0);
  assert.equal(outlineMindmap(objects).length, 2);
  assert.ok(layoutMindmap(objects) > 0);
});
