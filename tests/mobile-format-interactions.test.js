import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPACT_EDITOR_QUERY,
  isCompactEditor,
  inspectorOpenAfterSelection,
  allowDoubleClickEdit,
} from '../src/mobile-editor-policy.js';
import { formatPanel } from '../src/format-panel.js';

const note = { id: 'test-note', type: 'sticky', text: 'A note', x: 0, y: 0,
  w: 200, h: 140, color: '#f4e4a4' };

test('small screens and coarse landscape screens use the compact inspector', () => {
  let requested;
  const windowLike = {
    matchMedia(query) {
      requested = query;
      return { matches: true };
    },
  };
  assert.equal(isCompactEditor(windowLike), true);
  assert.equal(requested, COMPACT_EDITOR_QUERY);
  assert.equal(isCompactEditor({ matchMedia: () => ({ matches: false }) }), false);
  assert.equal(isCompactEditor({}), false);
});

test('touch selection leaves Format closed, while desktop auto-opens', () => {
  assert.equal(inspectorOpenAfterSelection({
    changed: true, hasSelection: true, compact: true, open: true,
  }), false);
  assert.equal(inspectorOpenAfterSelection({
    changed: true, hasSelection: true, compact: false, open: false,
  }), true);
  assert.equal(inspectorOpenAfterSelection({
    changed: false, hasSelection: true, compact: true, open: true,
  }), true, 'an explicitly opened panel stays open through ordinary re-rendering');
});

test('touch-generated double clicks never invoke text editing or insert sticky notes', () => {
  assert.equal(allowDoubleClickEdit({ pointerType: 'touch', now: 1230 }), false);
  assert.equal(allowDoubleClickEdit({ firesTouchEvents: true, now: 1230 }), false);
  assert.equal(allowDoubleClickEdit({ lastTouchAt: 1000, now: 1250 }), false);
  assert.equal(allowDoubleClickEdit({ lastTouchAt: 1000, now: 2000 }), true);
  assert.equal(allowDoubleClickEdit({ pointerType: 'mouse', now: 2000 }), true);
});

test('compact Format renders only one section open until user explicitly expands more', () => {
  const compact = formatPanel([note], null, { compact: true });
  assert.equal((compact.match(/<details class="format-card"/g) || []).length, 5);
  assert.match(compact, /data-format-section="Appearance" open/);
  assert.match(compact, /data-format-section="Text"><summary>/);
  assert.match(compact, /data-command="edit"/);
  assert.equal((compact.match(/data-command="duplicate"/g) || []).length, 1);

  const reopened = formatPanel([note], null, {
    compact: true, expanded: new Set(['Text', 'Actions']),
  });
  assert.match(reopened, /data-format-section="Text" open/);
  assert.match(reopened, /data-format-section="Actions" open/);
  assert.doesNotMatch(reopened, /data-format-section="Appearance" open/);
});

test('desktop Format keeps all controls visible without mobile accordion', () => {
  const desktop = formatPanel([note]);
  assert.equal((desktop.match(/<section class="format-card"/g) || []).length, 5);
  assert.doesNotMatch(desktop, /<details/);
});
