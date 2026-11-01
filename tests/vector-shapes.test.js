import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../board-model.js';
import { shapeSvg } from '../src/rendering.js';
import { shapeNames, shapeCategory, shapeCategories, svgIcon } from '../src/icons.js';
import { mobileActionMarkup } from '../src/mobile-actions.js';

const shape = (type = 'shape') => ({
  id: 'shape-one', type, x: 10, y: 20, w: 180, h: 140, text: '', color: '#ddeedd',
});

test('expanded shape library has distinct names, polygon outlines and usable icons', () => {
  assert.equal(M.shapes.length, 34);
  assert.equal(new Set(M.shapes).size, M.shapes.length);
  assert.equal(Object.values(shapeCategories).flat().length, M.shapes.length);
  assert.equal(new Set(Object.values(shapeCategories).flat()).size, M.shapes.length);
  for (const type of M.shapes) {
    assert.ok(shapeNames[type], 'Missing label: ' + type);
    assert.ok(['Basic', 'Arrows', 'Flowchart', 'Symbols'].includes(shapeCategory(type)));
    assert.match(svgIcon(type), /<svg/);
    assert.doesNotMatch(svgIcon(type), /undefined/);
    assert.match(shapeSvg(shape(type)), /<(?:svg)/);
    assert.ok(M.shapeVertices(shape(type)).length >= 3);
  }
});

test('curve controls bend edges and update the actual vector outline', () => {
  const node = shape('chevron');
  const count = M.shapeVertices(node).length;
  M.moveCurve(node, 0, { x: 37, y: -10 });
  assert.equal(node.curves.length, count);
  assert.deepEqual(node.curves[0], { x: 37, y: -10 });
  assert.match(M.shapePath(node), /Q37,-10/);
  assert.match(shapeSvg(node), /<path d="M/);
  assert.match(shapeSvg(node), /Q37,-10/);
});

test('adding and deleting nodes keeps the correct curve control aligned to every edge', () => {
  const node = shape('triangle');
  M.moveCurve(node, 0, { x: 30, y: 2 });
  const before = M.shapeVertices(node).length;
  M.insertVertex(node, 0, { x: 40, y: 20 });
  assert.equal(node.curves.length, before + 1);
  assert.equal(node.vertices.length, before + 1);
  assert.equal(node.curves[0], null);
  assert.equal(node.curves[1], null);
  M.moveCurve(node, 1, { x: 48, y: 17 });
  M.removeVertex(node, 1);
  assert.equal(node.vertices.length, before);
  assert.equal(node.curves.length, before);
  assert.doesNotMatch(M.shapePath(node), /NaN|undefined/);
  assert.doesNotThrow(() => M.validateBoard({ objects: [node] }));
});

test('curve coordinates and edge arrays are validated before loading backups', () => {
  const node = shape('shape');
  M.moveCurve(node, 0, { x: 25, y: 20 });
  assert.doesNotThrow(() => M.validateBoard({ objects: [node] }));
  assert.throws(() => M.validateBoard({ objects: [{ ...node, curves: [{ x: 3, y: 2 }] }] }), /Invalid curve/);
  assert.throws(() => M.validateBoard({ objects: [{ ...node, curves: Array(4).fill({ x: Infinity, y: 0 }) }] }), /Invalid curve/);
});

test('reset curves restores the default shape outline', () => {
  const node = shape('shield');
  M.moveCurve(node, 2, { x: 30, y: 40 });
  M.resetCurves(node);
  assert.equal(node.curves, undefined);
  assert.doesNotMatch(shapeSvg(node), /<path d="M/);
});

test('proportional corner scaling preserves ratio, independent stretch remains possible', () => {
  const node = shape('circle');
  const scaled = M.resizeBox(node, 'se', 80, 10, { lockAspect: true });
  assert.equal(Math.round(scaled.w / scaled.h * 100), Math.round(node.w / node.h * 100));
  const stretched = M.resizeBox(node, 'se', 80, 10, { lockAspect: false });
  assert.notEqual(Math.round(stretched.w / stretched.h * 100), Math.round(node.w / node.h * 100));
  const side = M.resizeBox(node, 'e', 80, 0, { lockAspect: false });
  assert.equal(side.h, node.h);
  assert.ok(side.w > node.w);
});

test('mobile contextual bar is concise and supports both Illustrator-like node modes', () => {
  const node = shape('shield');
  const selected = mobileActionMarkup([node], null);
  assert.match(selected, /data-mobile-action="nodes"/);
  assert.match(selected, /data-mobile-action="format"/);
  assert.match(selected, /data-mobile-action="duplicate"/);
  assert.doesNotMatch(selected, /data-mobile-action="bend"/);
  const bending = mobileActionMarkup([node], node.id, 'bend');
  assert.match(bending, /data-mobile-action="points"/);
  assert.match(bending, /data-mobile-action="bend" class="active"/);
  assert.match(bending, /data-mobile-action="done"/);
  assert.doesNotMatch(bending, /data-mobile-action="duplicate"/);
});
