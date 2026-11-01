import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../board-model.js';
import { applyMindMaster, inheritedMindMaster, themeNewMindTopic, MIND_PALETTES } from '../src/mindmap-master.js';
import { appendMindNode } from '../src/mindmap-model.js';
import { mobileActionMarkup } from '../src/mobile-actions.js';

function mapTree() {
  const objects = [
    { id: 'root', type: 'shape', mindmap: true, mindParent: null, text: 'Root', x: 0, y: 0, w: 190, h: 74, color: '#fff' },
  ];
  appendMindNode(objects, { id: 'a', connectorId: 'edge-a', parentId: 'root' });
  appendMindNode(objects, { id: 'b', connectorId: 'edge-b', parentId: 'a' });
  objects.push({ id: 'other', type: 'shape', text: 'Independent', color: '#ffffff', x: 900, y: 900, w: 100, h: 100 });
  return objects;
}

test('master palette and elbow routing apply to descendants but never unrelated art', () => {
  const objects = mapTree();
  const unrelated = { ...objects.find((o) => o.id === 'other') };
  const count = applyMindMaster(objects, 'root', {
    palette: 'ocean', route: 'elbow', lineStyle: 'dashed', endArrow: 'filled', strokeWidth: 3,
  });
  assert.equal(count, 3);
  const edge = objects.find((n) => n.id === 'edge-b');
  assert.equal(edge.route, 'elbow');
  assert.equal(edge.lineStyle, 'dashed');
  assert.equal(edge.strokeWidth, 3);
  assert.equal(edge.endArrow, 'filled');
  assert.equal(edge.color, MIND_PALETTES.ocean.edge);
  assert.deepEqual(objects.find((o) => o.id === 'other'), unrelated);
  assert.equal(objects.find((o) => o.id === 'root').mindMaster.palette, 'ocean');
});

test('master connector and colour schemes inherit when new topics are added', () => {
  const objects = mapTree();
  const master = { palette: 'violet', route: 'straight', lineStyle: 'dotted', endArrow: 'none', strokeWidth: 2 };
  applyMindMaster(objects, 'root', master);
  appendMindNode(objects, { id: 'new', connectorId: 'edge-new', parentId: 'b' });
  assert.equal(themeNewMindTopic(objects, 'new'), true);
  assert.deepEqual(inheritedMindMaster(objects, 'b'), master);
  assert.equal(objects.find((o) => o.id === 'edge-new').route, 'straight');
  assert.equal(objects.find((o) => o.id === 'edge-new').lineStyle, 'dotted');
});

test('invalid palettes and connector settings fail without touching board', () => {
  const objects = mapTree();
  const baseline = structuredClone(objects);
  assert.throws(() => applyMindMaster(objects, 'root', {
    palette: '__invalid__', route: 'elbow', lineStyle: 'solid', endArrow: 'none', strokeWidth: 2,
  }), /Invalid/);
  assert.deepEqual(objects, baseline);
});

test('manual connector waypoints are rendered and exported through standard board model', () => {
  const a = { id: 'a', type: 'shape', text: 'A', x: 0, y: 0, w: 120, h: 80 },
    b = { id: 'b', type: 'shape', text: 'B', x: 430, y: 0, w: 120, h: 80 };
  const edge = { id: 'edge', type: 'connector', from: 'a', to: 'b', route: 'elbow', waypoints: [{ x: 235, y: 190 }] };
  const objects = [a, b, edge];
  const route = M.connectorRoute(edge, objects);
  assert.equal(route.manual, true);
  assert.match(route.d, /235,190/);
  assert.equal(route.points[0].x < route.points.at(-1).x, true);
  assert.doesNotThrow(() => M.validateBoard({ objects }));
  assert.throws(() => M.validateBoard({ objects: [a, b, { ...edge, waypoints: [{ x: NaN, y: 3 }] }] }), /Invalid connector waypoints/);
  assert.throws(() => M.validateBoard({ objects: [a, b, { ...edge, waypoints: new Array(13).fill({ x: 1, y: 2 }) }] }), /Invalid connector waypoints/);
});

test('mobile selected connector offers route controls without a select/pan toggle', () => {
  const markup = mobileActionMarkup([{ id: 'edge', type: 'connector', from: 'x', to: 'y' }], null);
  assert.match(markup, /data-mobile-action="connector-style"/);
});
