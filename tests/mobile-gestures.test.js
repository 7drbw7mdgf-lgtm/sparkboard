import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  calculatePinchView,
  classifyTwoFingerGesture,
  rotationAfterTwist,
  twistDegrees,
  twistTarget,
} from '../src/mobile-gestures.js';

const rect = { left: 10, top: 120 };

test('two fingers zoom around their midpoint instead of the top-left corner', () => {
  const view = calculatePinchView(
    { x: 0, y: 0, z: 1 },
    [
      { x: 110, y: 220 },
      { x: 210, y: 220 },
    ],
    [
      { x: 60, y: 220 },
      { x: 260, y: 220 },
    ],
    rect,
  );
  assert.deepEqual(view, { x: -150, y: -100, z: 2 });
});

test('moving fingers together pans without changing zoom', () => {
  const view = calculatePinchView(
    { x: 25, y: -15, z: 1.5 },
    [
      { x: 110, y: 210 },
      { x: 210, y: 210 },
    ],
    [
      { x: 150, y: 235 },
      { x: 250, y: 235 },
    ],
    rect,
  );
  assert.deepEqual(view, { x: 65, y: 10, z: 1.5 });
});

test('two-finger twist follows the fingers and wraps past a half turn', () => {
  const start = [
    { x: 100, y: 200 },
    { x: 200, y: 200 },
  ];
  const quarter = [
    { x: 150, y: 150 },
    { x: 150, y: 250 },
  ];
  assert.equal(twistDegrees(start, quarter), 90);
  assert.equal(rotationAfterTwist(20, 90), 110);
  assert.equal(rotationAfterTwist(170, 20), -170);
  assert.equal(rotationAfterTwist(-170, -20), 170);
});

test('a twist turns the shape under the fingers and a pinch still navigates', () => {
  const shape = { id: 'shape', type: 'diamond', locked: false };
  const locked = { id: 'locked', type: 'circle', locked: true };
  const wire = { id: 'wire', type: 'connector' };
  const objects = [shape, locked, wire];
  const targetFor = (id) => ({ closest: () => ({ dataset: { id } }) });
  assert.equal(twistTarget([targetFor('locked'), targetFor('wire')], objects, new Set()), null);
  assert.equal(
    twistTarget([targetFor('wire'), targetFor('shape')], objects, new Set()).id,
    'shape',
  );
  assert.equal(
    twistTarget([targetFor('shape'), targetFor('locked')], objects, new Set(['locked'])).id,
    'shape',
  );
  const pinch = {
    targetId: 'shape',
    deltaDegrees: 3,
    startDistance: 100,
    currentDistance: 109,
    panDistance: 2,
  };
  assert.equal(classifyTwoFingerGesture(pinch), 'navigate');
  const twist = {
    targetId: 'shape',
    deltaDegrees: 12,
    startDistance: 100,
    currentDistance: 104,
    panDistance: 6,
  };
  assert.equal(classifyTwoFingerGesture(twist), 'twist');
  assert.equal(classifyTwoFingerGesture({ ...twist, mode: 'navigate' }), 'navigate');
  assert.equal(
    classifyTwoFingerGesture({
      targetId: null,
      deltaDegrees: 1,
      startDistance: 100,
      currentDistance: 100,
      panDistance: 7,
    }),
    'navigate',
  );
});

test('the turn handle is a different shape and sits clear of the connection nodes', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const rendering = readFileSync(new URL('../src/rendering.js', import.meta.url), 'utf8');
  const outset = Number(rendering.match(/PORT_OUTSET = (\d+)/)[1]);
  const handle = css.match(/\.object \.rotate-handle \{([^}]+)\}/)[1];
  const stem = css.match(/\.object \.rotate-handle::after \{([^}]+)\}/)[1];
  const top = Number(handle.match(/top:\s*(-?\d+)px/)[1]);
  const height = Number(handle.match(/height:\s*(\d+)px/)[1]);
  const stemHeight = Number(stem.match(/height:\s*(\d+)px/)[1]);
  const portHit = outset + 6 + 8;
  assert.ok(-(top + height) >= portHit + 16);
  assert.ok(-(top + height + stemHeight) >= portHit);
  assert.match(handle, /border-radius:\s*7px/);
  assert.match(css, /\.object \.port \{[^}]*linear-gradient\(#4262ff/);
  assert.match(css, /\.object \.port-c \{[^}]*border-radius:\s*50%/);
  assert.match(css, /\.object \.rotate-handle \{\s*top:\s*-92px/);
  assert.doesNotMatch(rendering, /Drag to rotate \(Shift/);
});

test('pinch scale is limited to supported zoom range', () => {
  const start = [
    { x: 100, y: 200 },
    { x: 200, y: 200 },
  ];
  const expand = calculatePinchView(
    { x: 0, y: 0, z: 2.5 },
    start,
    [
      { x: -500, y: 200 },
      { x: 800, y: 200 },
    ],
    rect,
  );
  const shrink = calculatePinchView(
    { x: 0, y: 0, z: 0.2 },
    start,
    [
      { x: 148, y: 200 },
      { x: 152, y: 200 },
    ],
    rect,
  );
  assert.equal(expand.z, 3);
  assert.equal(shrink.z, 0.1);
});
