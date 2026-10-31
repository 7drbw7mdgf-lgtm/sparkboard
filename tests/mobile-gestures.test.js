import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePinchView } from '../src/mobile-gestures.js';

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
