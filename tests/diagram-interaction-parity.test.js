import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../board-model.js';
import {
  connectionProperties,
  connectorPreviewPolicy,
  endpointChoice,
  restoreAutoRouting,
  setConnectorRouting,
  setEndpointChoice,
} from '../src/connector-interaction.js';

const node = (id, x = 0, y = 0) => ({
  id, type: 'shape', x, y, w: 100, h: 80, text: id,
});

test('a centre-dot relationship slides, but side-dot relationships pin ports and may cross shapes', () => {
  const options = { route: 'elbow', color: '#334455' };
  const center = connectionProperties(
    { from: 'a', fromPort: 'c' },
    { to: 'b', toPort: 'w' },
    options,
    true,
  );
  assert.equal(center.relationship, true);
  assert.equal(center.route, 'curved');
  assert.equal(center.fromPort, undefined);
  assert.equal(center.toPort, undefined);
  assert.notEqual(center.avoidObstacles, false);
  const side = connectionProperties(
    { from: 'a', fromPort: 'e' },
    { to: 'b', toPort: 'n' },
    options,
    true,
  );
  assert.equal(side.relationship, true);
  assert.equal(side.fromPort, 'e');
  assert.equal(side.toPort, 'n');
  assert.equal(side.avoidObstacles, false);
  assert.equal(side.route, 'curved');
  assert.deepEqual(connectorPreviewPolicy('c'), { fixed: false, avoidObstacles: true });
  assert.deepEqual(connectorPreviewPolicy('w'), { fixed: true, avoidObstacles: false });
  const [a, b] = [node('a'), node('b', 350)];
  const sliding = M.connectorRoute(center, [a, b]).start.x;
  b.x = -350;
  assert.ok(M.connectorRoute(center, [a, b]).start.x < sliding - 30);
  const pinned = M.connectorRoute(side, [a, b]).start.x;
  b.x = 350;
  assert.equal(M.connectorRoute(side, [a, b]).start.x, pinned);
});

test('normal side-dot connections bypass obstacles; centre-dot connections avoid them', () => {
  const objects = [node('a'), node('b', 400), node('block', 190, -25)];
  const side = connectionProperties(
    { from: 'a', fromPort: 'e' },
    { to: 'b', toPort: 'w' },
    { route: 'elbow' },
    false,
  );
  const center = connectionProperties(
    { from: 'a', fromPort: 'c' },
    { to: 'b', toPort: 'w' },
    { route: 'elbow' },
    false,
  );
  assert.equal(side.avoidObstacles, false);
  assert.equal(M.connectorRoute(side, objects).rerouted, undefined);
  assert.notEqual(center.avoidObstacles, false);
  assert.equal(M.connectorRoute(center, objects).rerouted, true);
});

test('connector styling retains a normalized outline-glue location until explicitly changed', () => {
  const edge = {
    from: 'a', to: 'b', route: 'elbow',
    fromAnchor: { x: 1, y: 0.28 },
    toAnchor: { x: 0, y: 0.62 },
  };
  assert.equal(endpointChoice(edge, 'from'), 'glued');
  assert.equal(endpointChoice(edge, 'to'), 'glued');
  assert.equal(setEndpointChoice(edge, 'from', 'glued'), true);
  assert.deepEqual(edge.fromAnchor, { x: 1, y: 0.28 });
  assert.equal(setEndpointChoice(edge, 'to', 'glued'), true);
  assert.deepEqual(edge.toAnchor, { x: 0, y: 0.62 });
  setEndpointChoice(edge, 'from', 'n');
  assert.equal(edge.fromAnchor, undefined);
  assert.equal(edge.fromPort, 'n');
  setEndpointChoice(edge, 'to', '');
  assert.equal(edge.toAnchor, undefined);
  assert.equal(endpointChoice(edge, 'to'), '');
});

test('automatic elbow routing recalculates; dragging or selecting manual mode suspends avoidance', () => {
  const a = node('a');
  const b = node('b', 440);
  const block = { ...node('block', 210, -30), w: 120, h: 140 };
  const objects = [a, b, block];
  const edge = {
    type: 'connector', id: 'c', from: 'a', to: 'b', route: 'elbow',
    fromPort: 'e', toPort: 'w',
  };
  assert.equal(M.connectorRoute(edge, objects).rerouted, true);
  setConnectorRouting(edge, 'manual', objects);
  assert.equal(edge.avoidObstacles, false);
  assert.equal(edge.waypoints.length, 1);
  const before = M.connectorRoute(edge, objects);
  assert.equal(before.manual, true);
  b.x += 90;
  const after = M.connectorRoute(edge, objects);
  assert.equal(after.manual, true);
  assert.notEqual(after.end.x, before.end.x);
  assert.deepEqual(edge.waypoints, [{ x: edge.waypoints[0].x, y: edge.waypoints[0].y }]);
  restoreAutoRouting(edge);
  assert.equal(edge.waypoints, undefined);
  assert.equal(edge.avoidObstacles, true);
  assert.equal(M.connectorRoute(edge, objects).rerouted, true);
  setConnectorRouting(edge, 'direct', objects);
  assert.equal(edge.avoidObstacles, false);
  assert.equal(edge.waypoints, undefined);
  setConnectorRouting(edge, 'auto', objects);
  assert.equal(edge.avoidObstacles, true);
});

test('invalid route and port modes cannot corrupt saved connector bindings', () => {
  const edge = { from: 'a', to: 'b', fromAnchor: { x: 1, y: 0.5 } };
  assert.throws(() => setEndpointChoice(edge, 'from', 'invented'), /Invalid/);
  assert.throws(() => setConnectorRouting(edge, 'invented', []), /Invalid/);
  assert.throws(() => endpointChoice(edge, 'middle'), /Invalid/);
  assert.deepEqual(edge.fromAnchor, { x: 1, y: 0.5 });
});
