import { $, esc, uid, node } from './core.js';
import { state } from './state.js';
import { commit } from './history.js';
import { save } from './boards.js';
import { render } from './rendering.js';
import { selectIds } from './selection.js';
import { centerPoint } from './viewport.js';
import { setTool } from './tools.js';
import { toast } from './notifications.js';
import {
  appendMindNode,
  adoptMindTree,
  indexMindmap,
  layoutMindmap,
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
function placeTopic(parentId = null) {
  if (!state.board) return;
  let topic;
  const p = centerPoint();
  commit(() => {
    topic = appendMindNode(state.board.objects, {
      id: uid(),
      connectorId: uid(),
      parentId,
      x: p.x - 95,
      y: p.y - 37,
    });
    const parent = state.board.objects.find((item) => item.id === parentId);
    if (parent) parent.mindCollapsed = false;
    layoutMindmap(state.board.objects);
    state.selected = new Set([topic.id]);
  });
  if (window.matchMedia('(min-width:651px)').matches) setTool('select');
  toast(parentId ? 'Topic added · Tab adds another child' : 'Mind-map root added');
}
function addFlowchart(shape) {
  if (!state.board) return;
  const selectedId = state.selected.size === 1 ? [...state.selected][0] : null;
  const source = state.board.objects.find(
    (item) => item.id === selectedId && !['connector', 'line', 'path'].includes(item.type),
  );
  const p = centerPoint();
  commit(() => {
    const created = node(
      shape,
      source ? source.x + source.w + 130 : p.x - 100,
      source ? source.y : p.y - 50,
      195,
      100,
      shape === 'diamond' ? 'Decision?' : 'Process',
      shape === 'diamond' ? '#f8df87' : '#dce7cc',
    );
    state.board.objects.push(created);
    if (source)
      state.board.objects.push({
        id: uid(),
        type: 'connector',
        from: source.id,
        to: created.id,
        route: 'elbow',
        endArrow: 'arrow',
      });
    state.selected = new Set([created.id]);
  });
  if (window.matchMedia('(min-width:651px)').matches) setTool('select');
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
  bar
    .querySelectorAll('[data-mm-mode]')
    .forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.mmMode === mode)),
    );
  bar.querySelector('[data-mm-actions="mindmap"]').hidden = !['mindmap', 'outline'].includes(mode);
  bar.querySelector('[data-mm-actions="flowchart"]').hidden = mode !== 'flowchart';
  $('#mindmap-panel').hidden = mode !== 'outline';
  const selected = chosenTopic();
  bar.querySelector('[data-mm-action="sibling"]').disabled = !selected;
  bar.querySelector('[data-mm-action="collapse"]').disabled = !selected;
  bar.querySelector('[data-mm-action="adopt"]').disabled =
    state.selected.size !== 1 || Boolean(selected);
  drawOutline();
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
    placeTopic(topic.id);
    return true;
  }
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    placeTopic(topic.mindParent || null);
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
      <button data-mm-action="collapse" title="Collapse or expand selected topic">Fold</button>
      <button data-mm-action="adopt" title="Convert selected object and connected descendants">Convert</button>
    </div>
    <div class="mmw-actions" data-mm-actions="flowchart" hidden>
      <button data-mm-action="process">＋ Process</button>
      <button data-mm-action="decision">＋ Decision</button>
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
    const selected = chosenTopic();
    if (action === 'root') placeTopic();
    if (action === 'child') placeTopic(selected?.id || null);
    if (action === 'sibling' && selected) placeTopic(selected.mindParent || null);
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
    if (action === 'process') addFlowchart('shape');
    if (action === 'decision') addFlowchart('diamond');
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
    if (state.diagramMode === 'mindmap' || state.diagramMode === 'outline') {
      const selected = chosenTopic();
      toolbar.querySelector('[data-mm-action="sibling"]').disabled = !selected;
      toolbar.querySelector('[data-mm-action="collapse"]').disabled = !selected;
      toolbar.querySelector('[data-mm-action="adopt"]').disabled =
        state.selected.size !== 1 || Boolean(selected);
    }
  });
  refreshWorkspace();
}
