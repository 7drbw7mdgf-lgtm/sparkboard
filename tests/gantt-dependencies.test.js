import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

const module = { exports: {} };
vm.runInNewContext(
  transformSync(fs.readFileSync('integration/sai/HostedGanttGeometry.ts', 'utf8'), {
    loader: 'ts',
    format: 'cjs',
  }).code,
  { module, exports: module.exports, Date },
);
const { taskBarGeometry, dependencyRoute } = module.exports;

for (const [name, start, end] of [
  ['forward below', { x: 100, y: 30 }, { x: 220, y: 90 }],
  ['forward above', { x: 100, y: 150 }, { x: 220, y: 30 }],
  ['touching dates', { x: 100, y: 30 }, { x: 100, y: 90 }],
  ['close dates', { x: 100, y: 30 }, { x: 110, y: 90 }],
  ['backwards', { x: 300, y: 150 }, { x: 80, y: 30 }],
  ['first day', { x: 120, y: 30 }, { x: 0, y: 90 }],
]) {
  test(`dependency routing is orthogonal with a right-facing arrow: ${name}`, () => {
    const route = dependencyRoute(start, end);
    assert.equal(route.points[0], start);
    assert.equal(route.points.at(-1), end);
    assert.doesNotMatch(route.path, /[CQAS]/);
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1],
        b = route.points[i];
      assert.ok(a.x === b.x || a.y === b.y, 'no diagonal segments');
    }
    const previous = route.points.at(-2);
    assert.equal(previous.y, end.y);
    assert.ok(previous.x < end.x, 'arrow enters target from the left');
    assert.ok(
      route.points.slice(1).some((point, i) => {
        const previous = route.points[i];
        const mid = route.midpoint;
        return (
          (previous.x === point.x &&
            mid.x === point.x &&
            mid.y >= Math.min(previous.y, point.y) &&
            mid.y <= Math.max(previous.y, point.y)) ||
          (previous.y === point.y &&
            mid.y === point.y &&
            mid.x >= Math.min(previous.x, point.x) &&
            mid.x <= Math.max(previous.x, point.x))
        );
      }),
      'removal control lies on the actual connector',
    );
  });
}

test('bar geometry preserves minimum visual width at fractional zoom and inclusive finish dates', () => {
  const start = new Date(2026, 9, 24, 12); // includes UK DST change
  const task = { startDate: new Date(2026, 9, 25, 12), endDate: new Date(2026, 9, 26, 12) };
  for (const zoom of [0.25, 4, 12.5, 60]) {
    const bar = taskBarGeometry(start, task, zoom);
    assert.equal(bar.left, zoom);
    assert.equal(bar.width, Math.max(2 * zoom, 6));
  }
});

test('dependency adapter fails closed when pinned source anchors change', async () => {
  const { patchHostedDependencies } = await import('../scripts/patch-sai-dependencies.cjs');
  const directory = fs.mkdtempSync('/tmp/benchline-dependency-patch-');
  try {
    fs.mkdirSync(directory + '/components');
    fs.writeFileSync(directory + '/components/Timeline.tsx', 'changed upstream');
    assert.throws(() => patchHostedDependencies(directory), /expected 1 matches/);
    assert.equal(
      fs.readFileSync(directory + '/components/Timeline.tsx', 'utf8'),
      'changed upstream',
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
