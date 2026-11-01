import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPACT_EDITOR_QUERY,
  isCompactEditor,
  inspectorOpenAfterSelection,
  allowDoubleClickEdit,
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

test('compact Format presents one accessible page, tabs and Back/Next', () => {
  const compact = formatPanel([note], null, { compact: true });
  assert.equal((compact.match(/<section class="format-card format-page"/g) || []).length, 5);
  assert.equal((compact.match(/data-format-page="/g) || []).length, 5);
  assert.match(compact, /role="tablist"/);
  assert.match(compact, /data-format-section="Appearance"/);
  assert.match(compact, /data-format-section="Text"/);
  assert.match(compact, /data-format-step="-1" aria-label="Previous format page" disabled/);
  assert.match(compact, /data-format-step="1"/);
  assert.doesNotMatch(compact, /<details/);
  assert.equal((compact.match(/data-command="duplicate"/g) || []).length, 1);
  const textPage = formatPanel([note], null, { compact: true, page: 'Text' });
  assert.match(textPage, /data-format-page="Text"/);
  assert.match(textPage, /data-format-section="Text"/);
  assert.match(textPage, /format-page" hidden/);
  assert.match(textPage, /data-format-counter aria-live="polite">2 \/ 5/);
});

test('mobile defaults to Pan; Connector remains available without a toolbar icon', () => {
  assert.equal(initialToolForLayout(true), 'hand');
  assert.equal(initialToolForLayout(false), 'select');
  for (const tool of ['hand', 'select', 'line', 'pen', 'shape']) {
    assert.equal(toolAvailableOnLayout(tool, true), true);
  }
  assert.equal(toolAvailableOnLayout('connector', true), true);
  assert.equal(toolAvailableOnLayout('connector', false), true);
});

test('desktop Format keeps all controls visible without mobile accordion', () => {
  const desktop = formatPanel([note]);
  assert.equal((desktop.match(/<section class="format-card"/g) || []).length, 5);
  assert.doesNotMatch(desktop, /<details/);
});
