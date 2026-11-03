import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  COMPACT_EDITOR_QUERY,
  isCompactEditor,
  inspectorOpenAfterSelection,
  allowDoubleClickEdit,
  doubleTapOpensText,
  initialToolForLayout,
  toolAvailableOnLayout,
} from '../src/mobile-editor-policy.js';
import { formatPanel } from '../src/format-panel.js';

const note = {
  id: 'test-note',
  type: 'sticky',
  text: 'A note',
  x: 0,
  y: 0,
  w: 200,
  h: 140,
  color: '#f4e4a4',
};

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
  assert.equal(
    inspectorOpenAfterSelection({
      changed: true,
      hasSelection: true,
      compact: true,
      open: true,
    }),
    false,
  );
  assert.equal(
    inspectorOpenAfterSelection({
      changed: true,
      hasSelection: true,
      compact: false,
      open: false,
    }),
    true,
  );
  assert.equal(
    inspectorOpenAfterSelection({
      changed: false,
      hasSelection: true,
      compact: true,
      open: true,
    }),
    true,
    'an explicitly opened panel stays open through ordinary re-rendering',
  );
});

test('touch-generated double clicks never invoke text editing or insert sticky notes', () => {
  assert.equal(allowDoubleClickEdit({ pointerType: 'touch', now: 1230 }), false);
  assert.equal(allowDoubleClickEdit({ firesTouchEvents: true, now: 1230 }), false);
  assert.equal(allowDoubleClickEdit({ lastTouchAt: 1000, now: 1250 }), false);
  assert.equal(allowDoubleClickEdit({ lastTouchAt: 1000, now: 2000 }), true);
  assert.equal(allowDoubleClickEdit({ pointerType: 'mouse', now: 2000 }), true);
});

test('a second tap on the same shape opens text, and a single tap does not', () => {
  const first = { id: 'shape', at: 1000, x: 40, y: 50 };
  assert.equal(doubleTapOpensText({ previous: null, id: 'shape', at: 1200, x: 40, y: 50 }), false);
  assert.equal(doubleTapOpensText({ previous: first, id: 'shape', at: 1200, x: 48, y: 54 }), true);
  assert.equal(doubleTapOpensText({ previous: first, id: 'shape', at: 1000, x: 40, y: 50 }), true);
  assert.equal(doubleTapOpensText({ previous: first, id: 'shape', at: 999, x: 40, y: 50 }), false);
  assert.equal(doubleTapOpensText({ previous: first, id: 'other', at: 1200, x: 40, y: 50 }), false);
  assert.equal(doubleTapOpensText({ previous: first, id: 'shape', at: 1600, x: 40, y: 50 }), false);
  assert.equal(doubleTapOpensText({ previous: first, id: 'shape', at: 1200, x: 80, y: 50 }), false);
});

test('compact Format collapses into one open group at a time', () => {
  const compact = formatPanel([note], null, { compact: true });
  assert.equal((compact.match(/<details class="format-card"/g) || []).length, 5);
  assert.match(compact, /data-format-section="Appearance" open/);
  assert.doesNotMatch(compact, /data-format-section="Text" open/);
  assert.doesNotMatch(compact, /role="tablist"/);
  assert.equal((compact.match(/data-command="duplicate"/g) || []).length, 1);
  const textPage = formatPanel([note], null, { compact: true, page: 'Text' });
  assert.match(textPage, /data-format-section="Text" open/);
  assert.doesNotMatch(textPage, /data-format-section="Appearance" open/);
});

test('mobile defaults to Select for one-finger editing; Connector stays available', () => {
  assert.equal(initialToolForLayout(true), 'select');
  assert.equal(initialToolForLayout(false), 'select');
  for (const tool of ['hand', 'select', 'line', 'pen', 'shape']) {
    assert.equal(toolAvailableOnLayout(tool, true), true);
  }
  assert.equal(toolAvailableOnLayout('connector', true), true);
  assert.equal(toolAvailableOnLayout('connector', false), true);
});

test('Format groups are pills and only the chosen group starts open', () => {
  const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(css, /#inspector details\.format-card > summary \{[^}]*border-radius: 999px/);
  assert.match(css, /#inspector \{[^}]*border-radius: 28px/);
});

test('desktop Format groups collapse, with Appearance open first', () => {
  const desktop = formatPanel([note]);
  assert.equal((desktop.match(/<details class="format-card"/g) || []).length, 5);
  assert.match(desktop, /data-format-section="Appearance" open/);
  assert.doesNotMatch(desktop, /data-format-section="Layout" open/);
  const kept = formatPanel([note], null, { openSections: ['Text', 'Actions'] });
  assert.match(kept, /data-format-section="Text" open/);
  assert.match(kept, /data-format-section="Actions" open/);
  assert.doesNotMatch(kept, /data-format-section="Appearance" open/);
});
