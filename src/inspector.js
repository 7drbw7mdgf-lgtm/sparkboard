import { shapeNames } from './icons.js';
import { state } from './state.js';
import { $ } from './core.js';
import { selectedNodes } from './selection.js';
import { formatPanel } from './format-panel.js';

let lastSelectionKey = '';

export function properties() {
  const ns = selectedNodes();
  const selectionKey = ns.map((n) => n.id).join(',');
  if (selectionKey !== lastSelectionKey) {
    lastSelectionKey = selectionKey;
    if (ns.length) {
      state.inspectorOpen = true;
      state.scenePanelOpen = false;
      const scenesPanel = $('#scenes-panel');
      if (scenesPanel) scenesPanel.hidden = true;
    }
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
  $('#inspector-body').innerHTML = formatPanel(selectedNodes(), state.reshapeId);
}
