import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shapeCategories } from '../src/icons.js';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('mobile shape categories cannot collapse below readable touch-target height', () => {
  assert.match(css, /#mobile-shape-categories\s*\{[^}]*flex:\s*0\s+0\s+48px;/);
  assert.match(css, /#mobile-shape-categories\s+button\s*\{[^}]*white-space:\s*nowrap;/);
  assert.match(css, /#mobile-shape-categories\s*\{[^}]*overflow-x:\s*auto;/);
});

test('shape gallery scrolls inside available vertical space without clipping category labels', () => {
  assert.match(css, /#mobile-shape-grid\s*\{[^}]*flex:\s*1\s+1\s+auto;/);
  assert.match(css, /#mobile-shape-grid\s*\{[^}]*overflow-y:\s*auto;/);
  assert.match(css, /#mobile-shape-grid button span\s*\{[^}]*white-space:\s*normal;/);
});

test('every named category remains available in the shape picker', () => {
  assert.deepEqual(Object.keys(shapeCategories), ['Basic', 'Arrows', 'Flowchart', 'Symbols']);
  assert.ok(Object.values(shapeCategories).every((items) => items.length > 0));
});
