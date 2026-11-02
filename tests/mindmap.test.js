import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendMindNode,
  addMindChild,
  adoptMindTree,
  descendantCount,
  hiddenMindmapIds,
  indexMindmap,
  insertMindSibling,
  layoutMindmap,
  mindSides,
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

test('collapsed branches hide leaves but preserve every parent topic in view', () => {
  const objects = [root({ mindCollapsed: true })];
  appendMindNode(objects, { id: 'child', connectorId: 'ec', parentId: 'root' });
  appendMindNode(objects, { id: 'grandchild', connectorId: 'eg', parentId: 'child' });
  assert.deepEqual([...hiddenMindmapIds(objects)].sort(), ['grandchild']);
  assert.equal(objects.length, 5);
  const child = objects.find((item) => item.id === 'child');
  layoutMindmap(objects);
  assert.equal(child.x, objects[0].x + objects[0].w + 105, 'visible parent stays attached to its collapsed root');
  assert.equal(outlineMindmap(objects).find((row) => row.id === 'child').concealed, false);
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

const byId = (objects, id) => objects.find((item) => item.id === id);
const childIds = (objects, id) =>
  indexMindmap(objects)
    .children.get(id)
    .map((item) => item.id);

// Root in the middle with two branches on each side, like the built-in mind map template.
function radialMap() {
  const objects = [root({ x: 470, y: 300, w: 230, h: 120 })];
  const spots = [
    ['tl', 180, 130],
    ['tr', 800, 130],
    ['bl', 180, 490],
    ['br', 800, 490],
  ];
  spots.forEach(([id, x, y], i) =>
    objects.push(
      { id, type: 'sticky', x, y, w: 190, h: 155, color: '#f8df87' },
      { id: `e-${id}`, type: 'connector', from: 'root', to: id },
    ),
  );
  for (const [id] of spots) Object.assign(byId(objects, id), { mindmap: true, mindParent: 'root' });
  spots.forEach(([id], i) => (byId(objects, id).mindOrder = i));
  return objects;
}

test('a sibling is inserted directly after the selected topic, not at the end', () => {
  const objects = [root()];
  for (const id of ['a', 'b', 'c'])
    appendMindNode(objects, { id, connectorId: `e${id}`, parentId: 'root' });
  const { topic, asChild } = insertMindSibling(objects, {
    id: 'new',
    connectorId: 'enew',
    siblingId: 'a',
  });
  assert.equal(asChild, false);
  assert.equal(topic.mindParent, 'root');
  assert.deepEqual(childIds(objects, 'root'), ['a', 'new', 'b', 'c']);
  layoutMindmap(objects);
  const [a, created, b] = ['a', 'new', 'b'].map((id) => byId(objects, id));
  assert.equal(created.x, a.x, 'same column as its sibling');
  assert.ok(created.y > a.y && created.y < b.y, 'placed between the sibling and the next one');
});

test('a sibling on the left side of a two-sided map stays on the left, next to it', () => {
  const objects = radialMap();
  insertMindSibling(objects, { id: 'new', connectorId: 'enew', siblingId: 'tl' });
  layoutMindmap(objects);
  const sides = mindSides(objects);
  for (const id of ['tl', 'new', 'bl']) assert.equal(sides.get(id), 'left', `${id} stays left`);
  for (const id of ['tr', 'br']) assert.equal(sides.get(id), 'right', `${id} stays right`);
  const rootItem = byId(objects, 'root');
  const [tl, created, bl] = ['tl', 'new', 'bl'].map((id) => byId(objects, id));
  assert.ok(created.x + created.w <= rootItem.x, 'left branch is left of the root');
  assert.ok(tl.y < created.y && created.y < bl.y, 'inserted between its neighbours');
  assert.ok(created.y >= tl.y + tl.h, 'does not overlap the topic above');
  assert.ok(bl.y >= created.y + created.h, 'does not overlap the topic below');
});

test('a sibling copies the look of the topic it sits next to', () => {
  const objects = radialMap();
  byId(objects, 'e-tl').route = 'curved';
  const { topic } = insertMindSibling(objects, { id: 'new', connectorId: 'enew', siblingId: 'tl' });
  assert.equal(topic.type, 'sticky');
  assert.deepEqual([topic.w, topic.h, topic.color], [190, 155, '#f8df87']);
  const edge = byId(objects, 'enew');
  assert.equal(edge.route, 'curved');
  assert.equal(edge.endArrow, undefined, 'arrow style matches the sibling connector');
});

test('the central topic has no siblings, so "sibling" adds a branch instead', () => {
  const objects = [root()];
  const { topic, asChild } = insertMindSibling(objects, {
    id: 'new',
    connectorId: 'enew',
    siblingId: 'root',
  });
  assert.equal(asChild, true);
  assert.equal(topic.mindParent, 'root');
  assert.equal(indexMindmap(objects).roots.length, 1, 'no stray second root');
});

test('new branches of a root alternate sides; deeper children follow their branch', () => {
  const objects = [root({ x: 500 })];
  addMindChild(objects, { id: 'r1', connectorId: 'e1', parentId: 'root' });
  addMindChild(objects, { id: 'l1', connectorId: 'e2', parentId: 'root' });
  addMindChild(objects, { id: 'deep', connectorId: 'e3', parentId: 'l1' });
  layoutMindmap(objects);
  const sides = mindSides(objects);
  assert.deepEqual(
    ['r1', 'l1', 'deep'].map((id) => sides.get(id)),
    ['right', 'left', 'left'],
  );
  assert.ok(byId(objects, 'deep').x + byId(objects, 'deep').w <= byId(objects, 'l1').x);
});

test('collapsing a branch closes the gap it leaves and counts hidden topics', () => {
  const objects = [root()];
  for (const id of ['a', 'b'])
    appendMindNode(objects, { id, connectorId: `e${id}`, parentId: 'root' });
  for (const id of ['a1', 'a2', 'a3'])
    appendMindNode(objects, { id, connectorId: `e${id}`, parentId: 'a' });
  appendMindNode(objects, { id: 'a1x', connectorId: 'ea1x', parentId: 'a1' });
  layoutMindmap(objects);
  const gapOpen = byId(objects, 'b').y - byId(objects, 'a').y;
  assert.equal(descendantCount(objects, 'a'), 4);
  byId(objects, 'a').mindCollapsed = true;
  layoutMindmap(objects);
  const gapClosed = byId(objects, 'b').y - byId(objects, 'a').y;
  assert.ok(gapClosed < gapOpen, 'siblings move together once the branch is folded');
  assert.deepEqual([...hiddenMindmapIds(objects)].sort(), ['a1', 'a1x', 'a2', 'a3']);
});
