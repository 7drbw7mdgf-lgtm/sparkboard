import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sample } from '../src/templates.js';
import { indexMindmap } from '../src/mindmap-model.js';

test('kanban starts with To do, In progress and Done columns', async () => {
  const objects = await sample('kanban');
  const frames = objects.filter((item) => item.type === 'frame').map((item) => item.text);
  assert.deepEqual(frames, ['TO DO', 'IN PROGRESS', 'DONE']);
  const cards = objects.filter((item) => item.type === 'sticky');
  assert.ok(cards.length >= 3);
  assert.ok(cards.every((card) => card.text && card.w > 0));
  assert.equal(
    objects.some((item) => item.type === 'connector'),
    false,
  );
});

test('mind map template is a central topic with branched children', async () => {
  const objects = await sample('mindmap');
  const map = indexMindmap(objects);
  assert.equal(map.roots.length, 1);
  assert.equal(map.roots[0].text, 'Central idea');
  const branches = map.children.get(map.roots[0].id);
  assert.ok(branches.length >= 4);
  const left = branches.filter((item) => item.x < map.roots[0].x);
  const right = branches.filter((item) => item.x > map.roots[0].x);
  assert.ok(left.length >= 1);
  assert.ok(right.length >= 1);
  const connectors = objects.filter((item) => item.type === 'connector');
  assert.equal(connectors.length, map.nodes.length - 1);
  assert.ok(connectors.every((edge) => edge.mindBranch && edge.from && edge.to));
  const listed = readFileSync(new URL('../src/controls.js', import.meta.url), 'utf8');
  assert.match(listed, /data-template="\$\{k\}"/);
  assert.match(listed, /\['kanban', 'Kanban'/);
  assert.match(listed, /\['mindmap', 'Mind map'/);
});
