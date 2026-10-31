import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../board-model.js';
import { segmentHitsBox } from '../src/connector-model.js';
const note = (id, x = 0, y = 0, extra = {}) => ({
  id,
  type: 'sticky',
  x,
  y,
  w: 100,
  h: 80,
  text: id,
  color: '#f9df80',
  ...extra,
});
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 0.001, `${actual} ≠ ${expected}`);

test('magnetic anchors land on ellipse and polygon outlines, including rotated shapes', () => {
  const ellipse = note('circle', 0, 0, { type: 'circle', w: 160, h: 80 });
  const point = M.bindingPoint(ellipse, { x: 1, y: 1 });
  near(((point.x - 80) / 76.8) ** 2 + ((point.y - 40) / 38.4) ** 2, 1);
  const diamond = note('diamond', 20, 30, { type: 'diamond', w: 100, h: 100, rotation: 90 });
  const top = M.portPoint(diamond, 'n');
  near(top.x, 119);
  near(top.y, 80);
  const triangle = note('triangle', 0, 0, { type: 'triangle' });
  near(M.portPoint(triangle, 'n').y, 2.4);
  near(M.portPoint(note('pill', 0, 0, { type: 'pill' }), 'n').y, 6.4);
  near(M.portPoint(note('cylinder', 0, 0, { type: 'cylinder' }), 'n').y, 7.2);
  assert.equal(M.nearestBinding([diamond], { x: 22, y: 32 }, null, 3), null);
});

test('normalized edge anchors follow movement, resize and rotation without becoming detached', () => {
  const a = note('a'),
    b = note('b', 400, 0);
  const connector = {
    id: 'c',
    type: 'connector',
    from: 'a',
    to: 'b',
    fromAnchor: { x: 1, y: 0.25 },
    toAnchor: { x: 0, y: 0.25 },
    route: 'straight',
    avoidObstacles: false,
  };
  let route = M.connectorRoute(connector, [a, b]);
  near(route.start.x, 106);
  near(route.start.y, 20);
  Object.assign(a, { x: 30, y: 40, w: 200, h: 160 });
  route = M.connectorRoute(connector, [a, b]);
  near(route.start.x, 236);
  near(route.start.y, 80);
  a.rotation = 90;
  route = M.connectorRoute(connector, [a, b]);
  near(route.start.x, 170);
  near(route.start.y, 226);
  assert.deepEqual(connector.fromAnchor, { x: 1, y: 0.25 });
});

test('snapping accepts the whole edge, excludes free lines and prioritizes the frontmost overlapping target', () => {
  const a = note('a'),
    line = {
      id: 'line',
      type: 'line',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ],
    };
  const hit = M.nearestBinding([a, line], { x: 105, y: 19 }, null, 26);
  assert.equal(hit.node.id, 'a');
  assert.equal(hit.port, undefined);
  near(hit.anchor.x, 1);
  assert.ok(hit.anchor.y > 0.1 && hit.anchor.y < 0.4);
  assert.equal(M.nearestBinding([line], { x: 50, y: 50 }, null, 26), null);
  assert.equal(M.nearestBinding([a, note('front')], { x: 50, y: 40 }, null, 26).node.id, 'front');
  assert.equal(M.nearestBinding([a], { x: 105, y: 19 }, 'a', 26), null);
  assert.equal(M.nearestBinding([a], { x: 105, y: 40 }, null, 26).port, 'e');
  assert.equal(
    M.nearestBinding([a], { x: 50, y: 40 }, null, 26, undefined, { x: 400, y: 40 }).anchor,
    undefined,
  );
});

test('automatic bindings slide to the facing side when notes cross over one another', () => {
  const a = note('a'),
    b = note('b', 300, 0),
    connector = { from: 'a', to: 'b', route: 'straight' };
  const right = M.connectorRoute(connector, [a, b]);
  near(right.start.x, 106);
  b.x = -300;
  const left = M.connectorRoute(connector, [a, b]);
  near(left.start.x, -6);
  b.x = 0;
  b.y = 300;
  near(M.connectorRoute(connector, [a, b]).start.y, 86);
});

test('straight, curved and elbow connectors route around intervening notes with clearance', () => {
  const a = note('a'),
    b = note('b', 440, 0),
    obstacle = note('obstacle', 210, -30, { w: 120, h: 140 });
  for (const style of ['straight', 'curved', 'elbow']) {
    const connector = { from: 'a', to: 'b', fromPort: 'e', toPort: 'w', route: style };
    const route = M.connectorRoute(connector, [a, b, obstacle]);
    assert.equal(route.rerouted, true, style);
    assert.ok(route.points.length >= 4);
    const box = M.obstacleBoxes([obstacle], 8)[0];
    for (let i = 1; i < route.points.length; i++)
      assert.equal(segmentHitsBox(route.points[i - 1], route.points[i], box), false, style);
    assert.ok(Number.isFinite(route.labelX) && Number.isFinite(route.labelY));
    assert.ok(!/NaN|Infinity/.test(route.d));
    assert.equal(
      M.connectorRoute({ ...connector, avoidObstacles: false }, [a, b, obstacle]).rerouted,
      undefined,
    );
  }
});

test('back-facing fixed ports route outside the endpoint shapes instead of crossing their interiors', () => {
  const objects = [note('a'), note('b', 350, 0)];
  const route = M.connectorRoute(
    { from: 'a', to: 'b', fromPort: 'w', toPort: 'e', route: 'straight' },
    objects,
  );
  assert.equal(route.rerouted, true);
  for (const box of M.obstacleBoxes(objects, 0))
    for (let i = 1; i < route.points.length; i++)
      assert.equal(segmentHitsBox(route.points[i - 1], route.points[i], box), false);
});

test('export and fit bounds include detours and labels outside the endpoint boxes', () => {
  const objects = [note('a'), note('b', 350, 0)];
  const connector = {
    id: 'c',
    type: 'connector',
    from: 'a',
    to: 'b',
    fromPort: 'w',
    toPort: 'e',
    route: 'curved',
    text: 'A long label that stays visible',
  };
  const route = M.connectorRoute(connector, objects),
    bounds = M.bounds(connector, objects);
  for (const point of route.points) {
    assert.ok(point.x >= bounds.x - 0.001 && point.x <= bounds.x + bounds.w + 0.001);
    assert.ok(point.y >= bounds.y - 0.001 && point.y <= bounds.y + bounds.h + 0.001);
  }
  assert.ok(bounds.x <= route.labelX - 120);
  assert.ok(bounds.x + bounds.w >= route.labelX + 120);
});

test('multiple and rotated obstacles reroute after an intervening object is moved', () => {
  const objects = [
    note('a'),
    note('b', 600, 120),
    note('block1', 190, -60, { w: 140, h: 190, rotation: 15 }),
    note('block2', 400, 70, { w: 100, h: 180 }),
  ];
  const connector = { from: 'a', to: 'b', route: 'elbow' };
  const route = M.connectorRoute(connector, objects);
  assert.equal(route.rerouted, true);
  for (const box of M.obstacleBoxes(objects.slice(2), 8))
    for (let i = 1; i < route.points.length; i++)
      assert.equal(segmentHitsBox(route.points[i - 1], route.points[i], box), false);
  const before = route.d;
  objects[2].y = 500;
  objects[3].y = 500;
  assert.notEqual(M.connectorRoute(connector, objects).d, before);
});

test('binding metadata survives portable backups and rejects malformed anchors', () => {
  const objects = [
    note('a'),
    note('b', 300, 0),
    {
      id: 'c',
      type: 'connector',
      from: 'a',
      to: 'b',
      route: 'curved',
      fromAnchor: { x: 1, y: 0.2 },
      toAnchor: { x: 0, y: 0.8 },
      avoidObstacles: true,
    },
  ];
  const value = M.validateBoard(JSON.parse(JSON.stringify({ objects })));
  assert.deepEqual(value.objects[2].fromAnchor, { x: 1, y: 0.2 });
  assert.equal(value.objects[2].avoidObstacles, true);
  for (const bad of [null, { x: 2, y: 0.5 }, { x: 0.5, y: 'bad' }, { x: NaN, y: 0.5 }])
    assert.throws(
      () =>
        M.validateBoard({ objects: [...objects.slice(0, 2), { ...objects[2], fromAnchor: bad }] }),
      /anchor/,
    );
  assert.throws(
    () =>
      M.validateBoard({
        objects: [...objects.slice(0, 2), { ...objects[2], avoidObstacles: 'yes' }],
      }),
    /routing/,
  );
});
