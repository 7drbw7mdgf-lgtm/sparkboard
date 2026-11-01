import { shapeNames } from './icons.js';
import { state } from './state.js';
import { $ } from './core.js';
import { selectedNodes } from './selection.js';
import { formatPanel } from './format-panel.js';
import { mobileActionMarkup } from './mobile-actions.js';
import { isCompactEditor, inspectorOpenAfterSelection } from './mobile-editor-policy.js';

let lastSelectionKey = '';

export function properties() {
  const ns = selectedNodes();
  const selectionKey = ns.map((n) => n.id).join(',');
  const selectionChanged = selectionKey !== lastSelectionKey;
  if (selectionChanged) {
    lastSelectionKey = selectionKey;
    if (ns.length) {
      state.inspectorOpen = inspectorOpenAfterSelection({
        changed: true,
        hasSelection: true,
        compact: isCompactEditor(),
        open: state.inspectorOpen,
      });
      state.scenePanelOpen = false;
      const scenesPanel = $('#scenes-panel');
      if (scenesPanel) scenesPanel.hidden = true;
    }
  }
  const mobileActions = $('#mobile-selection-actions');
  if (mobileActions) {
    const show = isCompactEditor() && ns.length > 0 && state.tool === 'select';
    mobileActions.hidden = !show;
    mobileActions.innerHTML = show
      ? mobileActionMarkup(ns, state.reshapeId, state.reshapeMode)
      : '';
  }
  const toolSidePanel = ['pen', 'line', 'connector'].includes(state.tool);
  const open = state.inspectorOpen && ns.length > 0 && !toolSidePanel;
  $('#inspector').hidden = !open;
  $('#inspect').setAttribute('aria-expanded', String(open));
  if (!open) return;
  const first = ns[0];
  $('#inspector-eyebrow').textContent =
    ns.length > 1 ? 'MULTIPLE ITEMS' : (shapeNames[first.type] || first.type).toUpperCase();
  $('#inspector-subtitle').textContent =
    ns.length > 1
      ? ns.length + ' items selected · Only relevant controls shown'
      : first.locked
        ? 'Locked item · Unlock to edit'
        : 'Context-aware controls · One selected item';
  renderInspector();
}

export function renderInspector() {
  const body = $('#inspector-body');
  const nodes = selectedNodes();
  const compact = isCompactEditor();
  const selection = nodes.map((n) => n.id).join(',');
  const previous = body.dataset.selection === selection && body.dataset.compact === String(compact);
  const expanded =
    previous && compact
      ? new Set(
          [...body.querySelectorAll('details.format-card[open]')].map(
            (el) => el.dataset.formatSection,
          ),
        )
      : null;
  body.innerHTML = formatPanel(nodes, state.reshapeId, {
    compact,
    expanded,
    outlineMode: state.reshapeMode,
  });
  body.dataset.selection = selection;
  body.dataset.compact = String(compact);
}
