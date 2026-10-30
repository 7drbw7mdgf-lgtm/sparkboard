import test from 'node:test';
import assert from 'node:assert/strict';
import { setupCanvas, endPointer } from '../src/canvas.js';
import { setupClipboard } from '../src/clipboard.js';
import { state } from '../src/state.js';

// Exercise the real event handlers without opening or modifying a user's boards.
function surface() {
  const nodes = new Map();
  function element() {
    const classes = new Set();
    const captures = new Set();
    return {
      style: {},
      dataset: {},
      listeners: {},
      tagName: 'DIV',
      classList: {
        add: (v) => classes.add(v),
        remove: (v) => classes.delete(v),
        contains: (v) => classes.has(v),
        toggle: (v, on) => (on ? classes.add(v) : classes.delete(v)),
      },
      matches: () => false,
      closest: () => null,
      addEventListener(type, fn) {
        (this.listeners[type] ??= []).push(fn);
      },
      emit(type, event) {
        for (const fn of this.listeners[type] || []) fn(event);
      },
      setAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      setPointerCapture: (id) => captures.add(id),
      hasPointerCapture: (id) => captures.has(id),
      releasePointerCapture: (id) => captures.delete(id),
    };
  }
  const doc = element();
  doc.body = element();
  doc.activeElement = doc.body;
  doc.querySelector = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, element());
    return nodes.get(selector);
  };
  globalThis.document = doc;
  Object.assign(state, {
    board: { id: 'test', objects: [], scenes: [], grid: true, snap: false },
    drag: null,
    editing: null,
    space: false,
    tool: 'select',
    view: { x: 10, y: 20, z: 1 },
    selected: new Set(),
  });
  setupCanvas();
  return {
    doc,
    canvas: doc.querySelector('#canvas'),
    event(overrides = {}) {
      return {
        pointerId: 1,
        button: 0,
        clientX: 100,
        clientY: 150,
        target: element(),
        preventDefault() {
          this.prevented = true;
        },
        ...overrides,
      };
    },
  };
}

test('hand, Space and middle-button panning can start over media controls', () => {
  for (const gesture of ['hand', 'space', 'middle']) {
    const ui = surface();
    state.tool = gesture === 'hand' ? 'hand' : 'select';
    state.space = gesture === 'space';
    const target = { closest: (selector) => (selector === '[data-open]' ? {} : null) };
    ui.canvas.emit('pointerdown', ui.event({ button: gesture === 'middle' ? 1 : 0, target }));
    assert.equal(state.drag?.type, 'pan', gesture);
    ui.canvas.emit('pointermove', ui.event({ clientX: 140, clientY: 175 }));
    assert.deepEqual(state.view, { x: 50, y: 45, z: 1 });
    ui.canvas.emit('pointerup', ui.event());
    assert.equal(state.drag, null);
    assert.equal(ui.canvas.hasPointerCapture(1), false);
  }
});
test('normal media clicks still activate their controls rather than start dragging', () => {
  const ui = surface();
  const event = ui.event({
    target: { closest: (selector) => (selector === '[data-open]' ? {} : null) },
  });
  ui.canvas.emit('pointerdown', event);
  assert.equal(state.drag, null);
  assert.equal(event.prevented, undefined);
});
test('a second pointer cannot move or end the active pan', () => {
  const ui = surface();
  state.tool = 'hand';
  ui.canvas.emit('pointerdown', ui.event());
  ui.canvas.emit('pointerdown', ui.event({ pointerId: 2, clientX: 800 }));
  ui.canvas.emit('pointermove', ui.event({ pointerId: 2, clientX: 900 }));
  ui.canvas.emit('pointerup', ui.event({ pointerId: 2 }));
  assert.equal(state.drag.pointerId, 1);
  assert.deepEqual(state.view, { x: 10, y: 20, z: 1 });
  ui.canvas.emit('pointermove', ui.event({ clientX: 120 }));
  assert.equal(state.view.x, 30);
});
test('lost capture, cancellation and window/board cleanup always release a pan', () => {
  for (const ending of ['lostpointercapture', 'pointercancel', 'cleanup']) {
    const ui = surface();
    state.tool = 'hand';
    ui.canvas.emit('pointerdown', ui.event());
    if (ending === 'cleanup') endPointer();
    else ui.canvas.emit(ending, ui.event());
    assert.equal(state.drag, null);
    assert.equal(ui.doc.body.classList.contains('is-panning'), false);
    assert.equal(ui.canvas.hasPointerCapture(1), false);
  }
});
test('pasting with no open tab never edits the last closed board', () => {
  const ui = surface();
  setupClipboard();
  ui.doc.body.classList.add('workspace-empty');
  const e = ui.event();
  Object.defineProperty(e, 'clipboardData', {
    get() {
      throw Error('Closed workspace must not read clipboard');
    },
  });
  ui.doc.emit('paste', e);
  assert.deepEqual(state.board.objects, []);
  assert.equal(e.prevented, undefined);
});

test('double-clicking while navigating or drawing does not open a text editor', () => {
  for (const gesture of ['hand', 'pen', 'space']) {
    const ui = surface();
    state.tool = gesture === 'space' ? 'select' : gesture;
    state.space = gesture === 'space';
    const event = ui.event({
      target: {
        closest() {
          throw Error('Navigation must not enter editing');
        },
      },
    });
    ui.canvas.emit('dblclick', event);
    assert.equal(state.editing, null);
    assert.deepEqual(state.board.objects, []);
  }
});
