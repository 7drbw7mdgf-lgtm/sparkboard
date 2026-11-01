import { $, esc, uid, node } from './core.js';
import { state } from './state.js';
import { commit } from './history.js';
import { save } from './boards.js';
import { render } from './rendering.js';
import { selectIds } from './selection.js';
import { centerPoint } from './viewport.js';
import { setTool } from './tools.js';
import { toast } from './notifications.js';
import { addFlowStep, startFlowLink } from './flowchart.js';
import {
  appendMindNode,
  addMindChild,
  adoptMindTree,
  descendantCount,
  indexMindmap,
  insertMindSibling,
  layoutMindmap,
  mindSides,
  outlineMindmap,
  isMindNode,
} from './mindmap-model.js';

const modes = [
  ['canvas', 'Canvas'],
  ['mindmap', 'Mind map'],
  ['flowchart', 'Flowchart'],
  ['outline', 'Outline'],
];
const style = `
#mindmap-toolbar{position:fixed;top:94px;left:50%;transform:translateX(-50%);z-index:15;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 30px);padding:6px;background:#fff;border:1px solid #e6e8e5;box-shadow:0 8px 25px #2c3a3019;border-radius:13px;color:#303931;font-size:12px}
#mindmap-toolbar .mmw-modes,#mindmap-toolbar .mmw-actions{display:flex;align-items:center;gap:3px}
#mindmap-toolbar .mmw-modes{background:#f1f3ef;border-radius:9px;padding:3px}
#mindmap-toolbar button{white-space:nowrap;padding:8px 10px;min-height:34px;border-radius:7px;font-weight:600}
#mindmap-toolbar button[aria-pressed="true"]{background:#fff;color:#326956;box-shadow:0 1px 5px #283c301a}
#mindmap-toolbar .mmw-actions button{background:#f5f7f3}
#mindmap-toolbar .mmw-actions button:disabled{opacity:.4;cursor:not-allowed}
#mindmap-toolbar .mmw-actions[hidden]{display:none}
#mindmap-toolbar .mmw-actions button:hover{background:#e7ede6}
#mindmap-panel{position:fixed;right:22px;top:157px;bottom:95px;width:305px;max-width:calc(100vw - 30px);z-index:16;background:#fff;border:1px solid #e1e5de;border-radius:14px;box-shadow:0 14px 45px #2d433329;display:flex;flex-direction:column;overflow:hidden;color:#27362b}
#mindmap-panel[hidden]{display:none}
#mindmap-panel .mmw-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e6ebe5}
#mindmap-panel .mmw-head strong{font-size:15px}
#mindmap-panel .mmw-head button{padding:6px 9px;border-radius:7px}
#mindmap-panel .mmw-description{font-size:12px;color:#728075;margin:12px 16px}
#mindmap-outline{overflow:auto;flex:1;padding:3px 10px 16px}
#mindmap-outline .mmw-row{display:flex;align-items:center;gap:5px;min-height:40px;border-radius:7px;padding-right:6px}
#mindmap-outline .mmw-row:hover{background:#f5f7f3}
#mindmap-outline .mmw-focus,#mindmap-outline .mmw-toggle{border-radius:6px;flex-shrink:0;padding:4px;min-width:25px;min-height:28px}
#mindmap-outline .mmw-focus[aria-current="true"]{background:#e4efe8;color:#326956}
#mindmap-outline .mmw-row input{background:transparent;border:1px solid transparent;border-radius:6px;padding:7px 5px;min-width:0;flex:1;font-size:12px;color:inherit}
#mindmap-outline .mmw-row input:focus{border-color:#77aa93;background:white}
#mindmap-outline .mmw-empty{padding:15px;font-size:13px;color:#7c887f}
body.workspace-empty #mindmap-toolbar,body.workspace-empty #mindmap-panel{display:none}
#objects .mm-fold{position:absolute;z-index:3;display:flex;width:max-content;white-space:nowrap;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border-radius:11px;border:1.5px solid #7a8e81;background:#fff;color:#3d5446;font:700 12px/1 Manrope,sans-serif;cursor:pointer;translate:-50% -50%;box-shadow:0 2px 6px #2c3a3022;opacity:0;transition:opacity .12s,transform .12s;touch-action:manipulation}
#objects .object:hover>.mm-fold,#objects .object.selected>.mm-fold,#objects .mm-fold.is-collapsed,#objects .mm-fold:focus-visible{opacity:1}
#objects .mm-fold:hover{transform:scale(1.12);border-color:#326956}
#objects .mm-fold.is-collapsed{background:#326956;border-color:#326956;color:#fff}
@media(hover:none){#objects .mm-fold{opacity:1;min-width:28px;height:28px;border-radius:14px}}
@media(max-width:900px){
 #mindmap-toolbar{left:12px;right:12px;transform:none;max-width:none;justify-content:flex-start;overflow-x:auto;scrollbar-width:thin}
 #mindmap-toolbar button{padding:7px 9px}
 #mindmap-panel{right:12px;top:155px;bottom:110px}
}
@media(max-width:650px){
 #mindmap-toolbar{top:76px;left:8px;right:8px;padding:5px;gap:6px}
 #mindmap-toolbar button{min-height:37px}
 #mindmap-panel{top:133px;left:8px;right:8px;width:auto;bottom:95px}
}
`;

function chosenTopic() {
  const id = [...state.selected][0];
  return state.selected.size === 1
    ? state.board?.objects.find((item) => item.id === id && isMindNode(item))
    : null;
}
function finishPlacement(message) {
  if (window.matchMedia('(min-width:651px)').matches) setTool('select');
  toast(message);
}
function placeRoot() {
  if (!state.board) return;
  const p = centerPoint();
  commit(() => {
    const topic = appendMindNode(state.board.objects, {
      id: uid(),
      connectorId: uid(),
      x: p.x - 95,
      y: p.y - 37,
    });
    layoutMindmap(state.board.objects);
    state.selected = new Set([topic.id]);
  });
  finishPlacement('Mind-map root added · Tab adds a branch');
}
function placeChild(parentId) {
  if (!state.board) return;
  const parent = state.board.objects.find((item) => item.id === parentId && isMindNode(item));
  if (!parent) return placeRoot();
  commit(() => {
    parent.mindCollapsed = false;
    const topic = addMindChild(state.board.objects, { id: uid(), connectorId: uid(), parentId });
    layoutMindmap(state.board.objects);
    state.selected = new Set([topic.id]);
  });
  finishPlacement('Branch added · Tab adds a child · Enter adds a sibling');
}
function placeSibling(siblingId) {
  if (!state.board) return;
  let asChild = false;
  commit(() => {
    const result = insertMindSibling(state.board.objects, {
      id: uid(),
      connectorId: uid(),
      siblingId,
    });
    asChild = result.asChild;
    if (asChild) {
      const root = state.board.objects.find((item) => item.id === siblingId);
      if (root) root.mindCollapsed = false;
    }
    layoutMindmap(state.board.objects);
    state.selected = new Set([result.topic.id]);
  });
  finishPlacement(
    asChild
      ? 'The central topic has no siblings, so a branch was added'
      : 'Sibling added next to it · Enter adds another',
  );
}
function changeMode(mode) {
  if (!state.board || !modes.some(([id]) => id === mode)) return;
  state.board.diagramView = mode;
  state.diagramMode = mode;
  if (mode === 'mindmap' || mode === 'outline') {
    if (state.board.kind === 'mindmap' && !indexMindmap(state.board.objects).nodes.length) {
      const root = state.board.objects.find((item) => item.type === 'shape');
      if (root) commit(() => adoptMindTree(state.board.objects, root.id));
    }
  }
  if (mode === 'outline') {
    state.inspectorOpen = false;
    $('#inspector').hidden = true;
  }
  refreshWorkspace();
  save();
}
function refreshWorkspace() {
  const board = state.board;
  const bar = $('#mindmap-toolbar');
  if (!bar || !board) return;
  const mode = board.diagramView || (board.kind === 'mindmap' ? 'mindmap' : 'canvas');
  state.diagramMode = mode;
  bar.dataset.view = mode;
  bar
    .querySelectorAll('[data-mm-mode]')
    .forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.mmMode === mode)),
    );
  bar.querySelector('[data-mm-actions="mindmap"]').hidden = !['mindmap', 'outline'].includes(mode);
  bar.querySelector('[data-mm-actions="flowchart"]').hidden = mode !== 'flowchart';
  $('#mindmap-panel').hidden = mode !== 'outline';
  syncActionButtons();
  drawOutline();
  drawFoldToggles();
}
function syncActionButtons() {
  const bar = $('#mindmap-toolbar');
  if (!bar || !state.board) return;
  const selected = chosenTopic();
  const index = indexMindmap(state.board.objects);
  const hasChildren = Boolean(selected && index.children.get(selected.id)?.length);
  bar.querySelector('[data-mm-action="sibling"]').disabled = !selected;
  const fold = bar.querySelector('[data-mm-action="collapse"]');
  fold.disabled = !hasChildren;
  fold.textContent = selected?.mindCollapsed ? 'Expand' : 'Collapse';
  fold.title = hasChildren
    ? `${selected.mindCollapsed ? 'Expand' : 'Collapse'} this topic`
    : 'Select a topic that has branches to collapse it';
  bar.querySelector('[data-mm-action="adopt"]').disabled =
    state.selected.size !== 1 || Boolean(selected);
}
/** A small −/+N button beside every topic that has branches, on the side they grow from. */
function drawFoldToggles() {
  const host = $('#objects');
  if (!host || !state.board) return;
  host.querySelectorAll('.mm-fold').forEach((button) => button.remove());
  const index = indexMindmap(state.board.objects);
  if (!index.nodes.length) return;
  const mindmapMode = ['mindmap', 'outline'].includes(state.diagramMode);
  const sides = mindSides(state.board.objects, index);
  for (const topic of index.nodes) {
    const kids = index.children.get(topic.id) || [];
    // Outside mind-map mode only collapsed topics show a toggle, so hidden content stays findable.
    if (!kids.length || (!mindmapMode && !topic.mindCollapsed)) continue;
    const el = host.querySelector(`.object[data-id="${CSS.escape(topic.id)}"]`);
    if (!el) continue;
    const isRoot = !topic.mindParent || !index.byId.has(topic.mindParent);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `mm-fold${topic.mindCollapsed ? ' is-collapsed' : ''}`;
    button.dataset.mmFold = topic.id;
    const hiddenCount = descendantCount(state.board.objects, topic.id, index);
    button.textContent = topic.mindCollapsed ? `+${hiddenCount}` : '−';
    const label = topic.mindCollapsed
      ? `Expand: show ${hiddenCount} hidden topic${hiddenCount === 1 ? '' : 's'}`
      : 'Collapse this branch';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-expanded', String(!topic.mindCollapsed));
    if (isRoot) {
      // Roots can have branches on both sides, so their toggle sits underneath.
      button.style.left = '50%';
      button.style.top = 'calc(100% + 34px)'; // clear of the connection port
    } else {
      const left = sides.get(topic.id) === 'left';
      button.style.left = left ? '-34px' : 'calc(100% + 34px)';
      button.style.top = '50%';
    }
    el.append(button);
  }
}
function drawOutline() {
  const host = $('#mindmap-outline');
  if (!host || !state.board) return;
  const rows = outlineMindmap(state.board.objects).filter((item) => !item.concealed);
  host.innerHTML = rows.length
    ? rows
        .map(
          ({ id, depth, node: topic, childCount }) =>
            `<div class="mmw-row" style="padding-left:${Math.min(depth, 12) * 13}px" data-mm-row="${esc(id)}">
        <button type="button" class="mmw-toggle" data-mm-toggle="${esc(id)}" aria-label="${topic.mindCollapsed ? 'Expand' : 'Collapse'} topic" ${childCount ? '' : 'disabled'}>${childCount ? (topic.mindCollapsed ? '▸' : '▾') : '·'}</button>
        <button type="button" class="mmw-focus" data-mm-focus="${esc(id)}" aria-current="${state.selected.has(id)}" title="Select on canvas">◎</button>
        <input data-mm-text="${esc(id)}" aria-label="Topic text" value="${esc(topic.text || '')}" maxlength="240">
      </div>`,
        )
        .join('')
    : '<p class="mmw-empty">No mind-map topics yet. Choose “Root” to create one, or select a shape and choose “Convert”.</p>';
}
function toggleCollapse(id) {
  if (!state.board) return;
  const index = indexMindmap(state.board.objects);
  const item = index.byId.get(id);
  if (!item || !index.children.get(id)?.length) return;
  commit(() => {
    item.mindCollapsed = !item.mindCollapsed;
    if (item.mindCollapsed) {
      const hidden = new Set();
      function hide(parent) {
        for (const child of index.children.get(parent) || []) {
          if (hidden.has(child.id)) continue;
          hidden.add(child.id);
          hide(child.id);
        }
      }
      hide(item.id);
      for (const descendant of hidden) state.selected.delete(descendant);
    }
    // Close the gap a collapsed branch leaves (or make room for an expanded one).
    layoutMindmap(state.board.objects);
  });
}
export function mindmapShortcut(event) {
  if (
    !state.board ||
    state.diagramMode !== 'mindmap' ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey
  )
    return false;
  if (event.target?.closest?.('#mindmap-toolbar,#mindmap-panel')) return false;
  const topic = chosenTopic();
  if (!topic) return false;
  if (event.key === 'Tab') {
    event.preventDefault();
    placeChild(topic.id);
    return true;
  }
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    placeSibling(topic.id);
    return true;
  }
  return false;
}

export function setupMindmapWorkspace() {
  const css = document.createElement('style');
  css.textContent = style;
  document.head.append(css);
  const toolbar = document.createElement('nav');
  toolbar.id = 'mindmap-toolbar';
  toolbar.setAttribute('aria-label', 'Canvas workspace modes and creation actions');
  toolbar.innerHTML = `<div class="mmw-modes">${modes
    .map(
      ([id, label]) =>
        `<button type="button" data-mm-mode="${id}" aria-pressed="false">${label}</button>`,
    )
    .join('')}</div>
    <div class="mmw-actions" data-mm-actions="mindmap" hidden>
      <button data-mm-action="root" title="Create a root topic">＋ Root</button>
      <button data-mm-action="child" title="Add child · Tab">＋ Branch</button>
      <button data-mm-action="sibling" title="Add sibling · Enter">＋ Sibling</button>
      <button data-mm-action="layout" title="Arrange topics automatically">Arrange</button>
      <button data-mm-action="collapse" title="Collapse or expand selected topic">Collapse</button>
      <button data-mm-action="adopt" title="Convert selected object and connected descendants">Convert</button>
    </div>
    <div class="mmw-actions" data-mm-actions="flowchart" hidden>
      <button data-mm-action="start">◉ Start</button>
      <button data-mm-action="process">▭ Process</button>
      <button data-mm-action="decision">◇ Decision</button>
      <button data-mm-action="data">▱ Data</button>
      <button data-mm-action="end">◎ End</button>
      <button data-mm-action="flow-link" title="Connect selected nodes, or choose a destination">↗ Link nodes</button>
    </div>`;
  const panel = document.createElement('aside');
  panel.id = 'mindmap-panel';
  panel.setAttribute('aria-label', 'Mind-map outline editor');
  panel.hidden = true;
  panel.innerHTML = `<div class="mmw-head"><strong>Outline</strong><button type="button" data-mm-close aria-label="Close outline">×</button></div>
    <p class="mmw-description">Edit topics directly · Fold branches to focus</p>
    <div id="mindmap-outline"></div>`;
  document.body.append(toolbar, panel);
  toolbar.addEventListener('click', (event) => {
    const mode = event.target.closest('[data-mm-mode]')?.dataset.mmMode;
    if (mode) return changeMode(mode);
    const action = event.target.closest('[data-mm-action]')?.dataset.mmAction;
    if (!action || !state.board) return;
    // Hand focus back to the canvas so Enter / Tab / undo work on the map straight away
    // (otherwise Enter would just click this button again).
    event.target.closest('button')?.blur();
    const selected = chosenTopic();
    if (action === 'root') placeRoot();
    if (action === 'child') placeChild(selected?.id || null);
    if (action === 'sibling' && selected) placeSibling(selected.id);
    if (action === 'layout') {
      if (!indexMindmap(state.board.objects).nodes.length)
        return toast('Create or convert a topic first');
      commit(() => layoutMindmap(state.board.objects));
      toast('Mind map arranged · other canvas objects unchanged');
    }
    if (action === 'collapse' && selected) toggleCollapse(selected.id);
    if (action === 'adopt') {
      const id = [...state.selected][0];
      if (!id || state.selected.size !== 1) return;
      commit(() => adoptMindTree(state.board.objects, id));
      toast('Existing objects converted without duplicating them');
    }
    if (['start', 'process', 'decision', 'data', 'end'].includes(action)) addFlowStep(action);
    if (action === 'flow-link') startFlowLink();
  });
  panel.addEventListener('click', (event) => {
    if (event.target.closest('[data-mm-close]')) return changeMode('mindmap');
    const toggle = event.target.closest('[data-mm-toggle]')?.dataset.mmToggle;
    if (toggle) return toggleCollapse(toggle);
    const focus = event.target.closest('[data-mm-focus]')?.dataset.mmFocus;
    if (focus) {
      selectIds([focus]);
      refreshWorkspace();
    }
  });
  panel.addEventListener('change', (event) => {
    const id = event.target.dataset.mmText;
    if (!id || !state.board) return;
    const topic = state.board.objects.find((item) => item.id === id && isMindNode(item));
    if (topic && topic.text !== event.target.value)
      commit(() => {
        topic.text = event.target.value;
      });
  });
  document.addEventListener('sparkboard:render', refreshWorkspace);
  document.addEventListener('pointerup', () => {
    if (state.diagramMode === 'mindmap' || state.diagramMode === 'outline') syncActionButtons();
  });
  // On-canvas collapse toggles: keep the canvas from treating the press as a drag or edit.
  const objectsHost = $('#objects');
  const foldTarget = (event) => event.target.closest?.('[data-mm-fold]');
  for (const type of ['pointerdown', 'mousedown', 'dblclick'])
    objectsHost?.addEventListener(type, (event) => {
      if (!foldTarget(event)) return;
      event.stopPropagation();
      if (type !== 'pointerdown') event.preventDefault();
    });
  objectsHost?.addEventListener('click', (event) => {
    const button = foldTarget(event);
    if (!button) return;
    event.stopPropagation();
    toggleCollapse(button.dataset.mmFold);
  });
  refreshWorkspace();
}
