import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialToolForLayout } from '../src/mobile-editor-policy.js';
import { mobileActionMarkup } from '../src/mobile-actions.js';

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('the compact viewport uses a full-bleed canvas rather than clipping space for a toolbar', () => {
  const mobile = source('src/mobile-workspace.js');
  assert.match(mobile, /#canvas\{position:fixed!important;inset:0!important;/);
  assert.match(mobile, /height:100dvh!important/);
  assert.doesNotMatch(mobile, /#canvas\{bottom:calc/);
  assert.match(mobile, /#mobile-tool-sheet:not\(\[hidden\]\)/);
  assert.equal(initialToolForLayout(true), 'select');
  assert.doesNotMatch(mobile, /data-mw-tool="hand"/);
  assert.doesNotMatch(mobile, /data-mw-tool="select"/);
});

test('compact tools expose explicit exit from drawing/linking and keep drawer focus', () => {
  const mobile = source('src/mobile-workspace.js');
  assert.match(mobile, /data-mw-finish/);
  assert.match(mobile, /setTool\('select'\)/);
  assert.match(mobile, /sheet\.dataset\.renderedMode !== mode\(\)/);
  assert.match(mobile, /\['Undo', '↶', 'header', 'undo'\]/);
  assert.match(mobile, /\['Redo', '↷', 'header', 'redo'\]/);
});

test('mobile shape choice creates an object without a follow-up canvas tap', () => {
  const tools = source('src/tools.js');
  const mobile = source('src/mobile-workspace.js');
  assert.match(tools, /sparkboard:mobile-shape/);
  assert.match(mobile, /document\.addEventListener\('sparkboard:mobile-shape'/);
  assert.match(mobile, /addAt\(event\.detail\.type,/);
  assert.match(mobile, /addAt\(value,/);
});

test('mobile node labels and mind-map branches have direct actions', () => {
  const editor = source('src/editor.js');
  assert.match(editor, /id="mobile-node-text-form"/);
  assert.match(editor, /id="mobile-node-text"/);
  const actions = mobileActionMarkup(
    [{ id: 'topic', type: 'shape', mindmap: true, text: 'Research', x: 10, y: 10, w: 190, h: 74 }],
    null,
    'points',
    null,
    'mindmap',
  );
  assert.match(actions, /data-mobile-action="edit"/);
  assert.match(actions, /data-mobile-action="mind-child"/);
  assert.match(actions, /data-mobile-action="mind-style"/);
});

test('mind-map canvas controls do not accumulate duplicate style buttons', () => {
  const mindmap = source('src/mindmap.js');
  assert.match(mindmap, /querySelectorAll\('\.mm-fold, \.mm-master'\)/);
  assert.match(mindmap, /mindmapMode && state\.selected\.has\(topic\.id\)/);
  assert.match(mindmap, /data-mm-add-child|mmAddChild/);
  assert.match(mindmap, /sparkboard:selection', drawFoldToggles/);
});
