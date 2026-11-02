import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialToolForLayout } from '../src/mobile-editor-policy.js';
import { mobileActionMarkup } from '../src/mobile-actions.js';
import { mobileWorkspaceMenus } from '../src/mobile-menus.js';

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
  const tools = mobileWorkspaceMenus('canvas').tools.map((item) => item.value);
  assert.ok(tools.includes('undo'));
  assert.ok(tools.includes('redo'));
  assert.ok(
    mobileWorkspaceMenus('canvas').tools.some(
      (item) => item.action === 'link' && item.value === '/sai/' && item.label === 'Benchline',
    ),
  );
  assert.match(mobile, /benchline\.id = 'mobile-benchline'/);
  assert.match(mobile, /#mobile-benchline\{display:inline-flex/);
  assert.match(mobile, /href = '\/sai\/'/);
});

test('each mobile view changes the dock, and Add does not repeat Tools', () => {
  const keys = (items) => new Set(items.map((item) => item.action + ':' + item.value));
  const canvas = mobileWorkspaceMenus('canvas');
  const map = mobileWorkspaceMenus('mindmap');
  const flow = mobileWorkspaceMenus('flowchart');
  const outline = mobileWorkspaceMenus('outline');
  for (const menu of [canvas, map, flow, outline]) {
    const shared = [...keys(menu.add)].filter((key) => keys(menu.tools).has(key));
    assert.deepEqual(shared, []);
  }
  assert.notDeepEqual(
    canvas.context.map((item) => item.value),
    map.context.map((item) => item.value),
  );
  assert.notDeepEqual(
    map.context.map((item) => item.value),
    flow.context.map((item) => item.value),
  );
  assert.deepEqual(outline.context, []);
  assert.match(outline.hint, /Outline/);
  assert.ok(flow.context.some((item) => item.value === 'process'));
  assert.ok(map.context.some((item) => item.value === 'root'));
  assert.ok(canvas.add.some((item) => item.value === 'sticky'));
  const mobile = source('src/mobile-workspace.js');
  assert.match(mobile, /class="mwd-circle mwd-main"[^>]*data-mw-value="sticky"/);
  assert.match(mobile, /data-mw-value="text"/);
  assert.match(mobile, /data-mw-value="shapes"/);
  assert.match(mobile, /border-radius:50%/);
  assert.doesNotMatch(mobile, /class="mwd-hint"/);
  assert.doesNotMatch(mobile, /class="mwd-modes"/);
  assert.match(mobile, /data-mw-fan/);
  assert.doesNotMatch(mobile, /data-mw-action="add"/);
  assert.match(mobile, /@media\(min-width:651px\)/);
  assert.doesNotMatch(mobile, /#tools > button/);
  assert.doesNotMatch(mobile, /#tools\{width:0/);
  assert.match(mobile, /pointerover/);
  assert.match(
    source('src/mobile-actions.js'),
    /data-mobile-action="delete"|button\('Delete', 'delete'/,
  );
  assert.match(source('src/inspector.js'), /ns\.length > 0 && state\.tool === 'select'/);
  assert.equal(
    canvas.tools.some((item) => item.value === 'sticky'),
    false,
  );
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
  assert.doesNotMatch(actions, /data-mobile-action="mind-child"/);
  assert.match(actions, /data-mobile-action="mind-style"/);
  const mindmap = source('src/mindmap.js');
  assert.match(mindmap, /mm-daughter/);
  assert.match(mindmap, /mm-sibling/);
  assert.match(mindmap, /data-mm-add-sibling/);
});

test('mind-map canvas controls do not accumulate duplicate style buttons', () => {
  const mindmap = source('src/mindmap.js');
  assert.match(mindmap, /querySelectorAll\('\.mm-fold, \.mm-master/);
  assert.match(mindmap, /mindmapMode && state\.selected\.has\(topic\.id\)/);
  assert.match(mindmap, /data-mm-add-child|mmAddChild/);
  assert.match(mindmap, /sparkboard:selection', drawFoldToggles/);
});
