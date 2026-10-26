const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('./board-model.js');
const n = (id, x = 0, y = 0, extra = {}) => ({
  id,
  type: 'shape',
  x,
  y,
  w: 100,
  h: 80,
  text: 'Idea',
  color: '#dce7cc',
  ...extra,
});
test('group selection expands only to the same group', () => {
  let objects = [n('a', 0, 0, { group: 'g' }), n('b', 0, 0, { group: 'g' }), n('c')];
  assert.deepEqual([...M.expandGroups(objects, ['a'])], ['a', 'b']);
});
test('dragging respects locked objects and moves drawing coordinates', () => {
  let locked = n('a', 20, 30, { locked: true });
  M.translate(locked, 10, 15);
  assert.equal(locked.x, 20);
  let path = {
    type: 'path',
    points: [
      { x: 1, y: 2 },
      { x: 5, y: 8 },
    ],
  };
  M.translate(path, 10, -1);
  assert.deepEqual(path.points, [
    { x: 11, y: 1 },
    { x: 15, y: 7 },
  ]);
});
test('alignment skips locks and aligns visible rotated bounds', () => {
  let objects = [
    n('a', 20, 20),
    n('b', 200, 90, { rotation: 45 }),
    n('c', 500, 40, { locked: true }),
  ];
  M.align(objects, 'left');
  assert.ok(Math.abs(M.bounds(objects[1]).x - 20) < 1e-8);
  assert.equal(objects[2].x, 500);
});
test('distribution produces equal edge-to-edge gaps', () => {
  let objects = [n('a', 0), n('b', 140, 0, { w: 80 }), n('c', 500, 0, { w: 140 })];
  M.distribute(objects, 'x');
  let gap1 = objects[1].x - objects[0].x - objects[0].w,
    gap2 = objects[2].x - objects[1].x - objects[1].w;
  assert.equal(gap1, gap2);
  assert.equal(objects[2].x, 500);
});
test('duplicate rekeys groups and connector endpoints without changing originals', () => {
  let objects = [
      n('a', 0, 0, { group: 'g' }),
      n('b', 200, 0, { group: 'g' }),
      { id: 'c', type: 'connector', from: 'a', to: 'b' },
    ],
    i = 0,
    copies = M.duplicate(objects, new Set(['a', 'b', 'c']), () => `new-${++i}`);
  assert.equal(copies[2].from, copies[0].id);
  assert.equal(copies[2].to, copies[1].id);
  assert.equal(copies[0].group, copies[1].group);
  assert.notEqual(copies[0].group, 'g');
  assert.equal(objects[0].x, 0);
  assert.equal(copies[0].x, 28);
});
test('board validation roundtrips new shape, scene, image and PDF types', () => {
  let board = {
    objects: [
      n('a', 0, 0, { type: 'star' }),
      n('b', 0, 0, { type: 'image', src: 'data:image/webp;base64,YQ==' }),
      n('c', 0, 0, { type: 'file', src: 'data:application/pdf;base64,YQ==' }),
    ],
    scenes: [{ name: 'Overview', view: { x: 1, y: 2, z: 0.7 } }],
  };
  assert.deepEqual(M.validateBoard(board), board);
  assert.notEqual(M.validateBoard(board), board);
});
test('imports reject unsafe links, images, invalid numbers and connector references', () => {
  for (const obj of [
    n('a', 0, 0, { type: 'link', url: 'javascript:alert(1)' }),
    n('b', 0, 0, { type: 'image', src: 'data:image/svg+xml,<svg onload="bad"/>' }),
    n('c', 0, 0, { rotation: NaN }),
    { id: 'd', type: 'connector', from: 'missing', to: 'another' },
  ])
    assert.throws(() => M.validateBoard({ objects: [obj] }));
});
test('fit bounds include drawings and rotated objects', () => {
  let box = M.enclosing([
    n('a', 0, 0, { w: 100, h: 100, rotation: 45 }),
    {
      type: 'path',
      points: [
        { x: -200, y: -20 },
        { x: 400, y: 200 },
      ],
    },
  ]);
  assert.equal(box.x, -200);
  assert.equal(box.w, 600);
  assert.ok(box.y < 0);
  assert.equal(box.y + box.h, 200);
});
