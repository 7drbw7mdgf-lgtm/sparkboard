import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../board-model.js';
import { BoardSessions } from '../src/board-sessions.js';
import { paintOrder } from '../src/layers.js';
import { isNativeControl } from '../src/keyboard.js';
import { exportSVG } from '../src/exporting.js';
import { state } from '../src/state.js';

const note = (id = 'note') => ({
  id,
  type: 'sticky',
  x: 30,
  y: 70,
  w: 100,
  h: 100,
  text: 'Note',
  color: '#f8df87',
});
const line = () => ({
  id: 'line',
  type: 'line',
  route: 'straight',
  points: [
    { x: 0, y: 100 },
    { x: 300, y: 100 },
  ],
  color: '#111111',
  strokeWidth: 3,
});

test('each board restores its own undo, redo, zoom and pan without stale history', () => {
  const sessions = new BoardSessions();
  const a = {
    board: { id: 'a', revision: 1 },
    history: [{ objects: [note()] }],
    future: [{ objects: [] }],
    view: { x: 80, y: -40, z: 1.7 },
  };
  sessions.remember(a);
  sessions.remember({
    board: { id: 'b', revision: 2 },
    history: [],
    future: [],
    view: { x: 0, y: 0, z: 0.8 },
  });
  assert.deepEqual(sessions.restore(a.board), {
    revision: 1,
    history: a.history,
    future: a.future,
    view: a.view,
  });
  assert.equal(sessions.restore({ id: 'a', revision: 2 }), null);
  assert.notEqual(sessions.restore(a.board).view, a.view);
});

test('frame copies include locked children, nested content and internal connectors', () => {
  const frame = { id: 'frame', type: 'frame', x: 0, y: 0, w: 500, h: 500, text: 'Frame' };
  const a = note('a'),
    b = { ...note('b'), x: 200, locked: true };
  const connector = { id: 'connector', type: 'connector', from: 'a', to: 'b' };
  const outside = { ...note('outside'), x: 600 };
  const copied = M.copySelection([frame, a, b, connector, outside], new Set(['frame']));
  assert.deepEqual(
    copied.map((n) => n.id),
    ['frame', 'a', 'b', 'connector'],
  );
  const unlocked = copied.map((n) => ({ ...n, locked: false }));
  let id = 0;
  const pasted = M.duplicate(unlocked, new Set(unlocked.map((n) => n.id)), () => `copy-${++id}`);
  const connection = pasted.find((n) => n.type === 'connector');
  assert.ok(pasted.some((n) => n.id === connection.from));
  assert.ok(pasted.some((n) => n.id === connection.to));
});

test('native Format controls keep arrow and space keys', () => {
  for (const kind of ['select', 'range', 'color', 'checkbox', 'radio']) {
    const target = { matches: (selector) => selector.includes(kind), closest: () => null };
    assert.equal(isNativeControl(target), true, kind);
  }
  assert.equal(isNativeControl({ matches: () => false, closest: () => null }), false);
  assert.equal(isNativeControl({ matches: (s) => s === 'button', closest: () => ({}) }), true);
});

test('export follows the visible SVG overlay layer and raised HTML objects', () => {
  const stroke = {
    id: 'stroke',
    type: 'path',
    points: [
      { x: 0, y: 100 },
      { x: 200, y: 100 },
    ],
    color: '#111111',
  };
  assert.deepEqual(
    paintOrder([stroke, note()]).map((n) => n.id),
    ['note', 'stroke'],
  );
  assert.deepEqual(
    paintOrder([stroke, { ...note(), z: 3 }]).map((n) => n.id),
    ['stroke', 'note'],
  );
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({ measureText: (s) => ({ width: s.length * 7 }) }),
    }),
  };
  state.board = { title: 'Layers', objects: [stroke, note()] };
  const svg = exportSVG();
  assert.ok(svg.indexOf('fill="#f8df87"') < svg.indexOf('stroke="#111111"'));
});

test('curve handles bend, move, copy, validate and export with the line', () => {
  const n = line();
  n.controls = M.lineControls(n);
  assert.deepEqual(n.controls, [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ]);
  n.controls[0].y = -50;
  n.route = 'curved';
  assert.match(M.lineRoute(n).d, /C100,-50 200,100/);
  assert.equal(M.bounds(n).y, -50);
  M.translate(n, 20, 30);
  assert.deepEqual(n.controls[0], { x: 120, y: -20 });
  M.moveLineEndpoint(n, 0, { x: 40, y: 150 });
  assert.deepEqual(n.controls[0], { x: 140, y: 0 });
  assert.deepEqual(M.validateBoard({ objects: [n] }).objects[0].controls, n.controls);
  const [copy] = M.duplicate([n], new Set([n.id]), () => 'copy');
  assert.equal(copy.controls[0].x, n.controls[0].x + 28);
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({ measureText: (s) => ({ width: s.length * 7 }) }),
    }),
  };
  state.board = { title: 'Curve', objects: [n] };
  assert.ok(exportSVG().includes(M.lineRoute(n).d));
  assert.throws(
    () =>
      M.validateBoard({
        objects: [
          {
            ...n,
            controls: [
              { x: NaN, y: 0 },
              { x: 1, y: 1 },
            ],
          },
        ],
      }),
    /controls/,
  );
});

test('the Curved format action bends a new line without discarding hand-edited curves', () => {
  const n = line();
  n.controls = M.lineControls(n);
  M.setLineRoute(n, 'curved');
  assert.notEqual(n.controls[0].y, n.points[0].y);
  n.controls[0] = { x: 90, y: -80 };
  n.curveEdited = true;
  M.setLineRoute(n, 'straight');
  M.setLineRoute(n, 'curved');
  assert.deepEqual(n.controls[0], { x: 90, y: -80 });
});

test('copying a nested frame never pulls in its enclosing parent', () => {
  const outer = { id: 'outer', type: 'frame', x: 0, y: 0, w: 500, h: 500, text: 'Outer' };
  const inner = { id: 'inner', type: 'frame', x: 200, y: 200, w: 100, h: 100, text: 'Inner' };
  const content = { ...note('content'), x: 220, y: 220, w: 20, h: 20 };
  const outside = { ...note('outside'), x: 20, y: 20 };
  assert.deepEqual(
    M.copySelection([outer, inner, content, outside], new Set(['inner'])).map((n) => n.id),
    ['inner', 'content'],
  );
});
