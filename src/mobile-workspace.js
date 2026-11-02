import { $ } from './core.js';
import { state } from './state.js';
import { setTool } from './tools.js';
import { addFlowStep } from './flowchart.js';
import { toast } from './notifications.js';
import { isCompactEditor } from './mobile-editor-policy.js';
import { addAt } from './canvas.js';
import { centerPoint } from './viewport.js';
import { setDiagramView } from './mindmap.js';
import { mobileWorkspaceMenus } from './mobile-menus.js';

const mobileStyle = `
#mobile-workspace-dock,#mobile-workspace-mode,#mobile-tool-sheet,#mobile-tool-active{display:none}
@media(max-width:650px),(max-height:500px) and (pointer:coarse){
  body:not(.workspace-empty) #mobile-workspace-dock{display:flex;flex-direction:column}
  body:not(.workspace-empty) #mobile-workspace-mode{display:none}
  .workspace-header{height:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;pointer-events:none}
  #tools{display:none!important}
  #mobile-more,#mobile-more-menu{display:none!important}
  #mindmap-toolbar{display:none!important}
  #mobile-workspace-mode{position:fixed;top:calc(124px + env(safe-area-inset-top));left:12px;z-index:19;align-items:center;gap:8px;border:1px solid #e6e8ee;background:#fff;box-shadow:0 6px 20px #18274b14;border-radius:10px;min-height:40px;padding:0 11px;font:600 12px/1 'DM Sans',sans-serif;color:#5c6570}
  #mobile-workspace-mode select{border:0;outline:0;background:transparent;color:#1f2430;font:600 14px/1 'DM Sans',sans-serif;min-height:40px;padding:0 16px 0 0;font-size:16px}
  #mobile-workspace-dock{position:fixed;bottom:calc(8px + env(safe-area-inset-bottom));left:8px;right:8px;z-index:45;height:auto;padding:8px;gap:8px;border:1px solid #e6e8ee;border-radius:14px;background:#fff;box-shadow:0 8px 28px #18274b1f}
  #mobile-workspace-dock .mwd-modes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;padding:2px;background:#f3f4f6;border-radius:10px}
  #mobile-workspace-dock .mwd-modes button{min-height:32px;border:0;border-radius:8px;background:transparent;color:#5c6570;font:600 12px/1 'DM Sans',sans-serif;padding:7px 2px;touch-action:manipulation}
  #mobile-workspace-dock .mwd-modes button[aria-pressed="true"]{background:#fff;color:#4262ff;box-shadow:0 1px 2px #18274b14}
  #mobile-workspace-dock .mwd-hint{margin:0;padding:0 4px;color:#6b7280;font:400 12px/1.35 'DM Sans',sans-serif}
  #mobile-workspace-dock .mwd-context{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:0 0 2px;border-bottom:1px solid #eef0f4}
  #mobile-workspace-dock .mwd-context[hidden]{display:none}
  #mobile-workspace-dock .mwd-context button{flex:0 0 auto;min-height:34px;padding:0 12px;border:1px solid #e2e5ee;border-radius:8px;background:#fff;color:#1f2430;font:600 13px/1 'DM Sans',sans-serif;touch-action:manipulation}
  #mobile-workspace-dock .mwd-context button[aria-pressed="true"]{background:#e8edff;border-color:#c9d2ff;color:#4262ff}
  #mobile-workspace-dock .mwd-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}
  #mobile-workspace-dock .mwd-tools{min-height:40px;padding:0 14px;border:1px solid #e2e5ee;border-radius:10px;background:#fff;color:#1f2430;font:600 13px/1 'DM Sans',sans-serif;touch-action:manipulation}
  #mobile-workspace-dock .mwd-tools[aria-expanded="true"]{background:#f3f4f6}
  #mobile-workspace-dock .mwd-add{min-height:40px;padding:0 18px;border:0;border-radius:10px;background:#4262ff;color:#fff;font:600 13px/1 'DM Sans',sans-serif;touch-action:manipulation}
  #mobile-workspace-dock .mwd-add[aria-expanded="true"]{background:#2f4fe0}
  #mobile-tool-sheet:not([hidden]){display:block;position:fixed;left:8px;right:8px;bottom:calc(var(--mwd-offset, 148px) + env(safe-area-inset-bottom));z-index:44;max-height:min(62dvh,470px);overflow:auto;overscroll-behavior:contain;background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:12px 8px 8px;box-shadow:0 8px 28px #18274b24;color:#1f2430}
  #mobile-tool-sheet h3{font:650 15px/1.2 'DM Sans',sans-serif;margin:0}
  #mobile-tool-sheet p{font-size:12px;color:#6b7280;margin:4px 0 8px;line-height:1.4;padding:0 4px}
  #mobile-tool-sheet .mw-list{display:flex;flex-direction:column}
  #mobile-tool-sheet .mw-row{display:flex;align-items:center;width:100%;min-height:44px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:#1f2430;font:550 15px/1.2 'DM Sans',sans-serif;text-align:left;touch-action:manipulation}
  #mobile-tool-sheet .mw-row:active{background:#f3f4f6}
  #mobile-tool-sheet .mw-sheet-head{display:flex;align-items:center;justify-content:space-between;margin:0 4px 4px}
  #mobile-tool-sheet .mw-close{min-height:32px;padding:0 10px;border-radius:8px;background:#f3f4f6;color:#1f2430;font:600 13px/1 'DM Sans',sans-serif}
  #mobile-selection-actions:not([hidden]){bottom:calc(var(--mwd-offset, 148px) + env(safe-area-inset-bottom))!important;max-width:calc(100vw - 16px);z-index:43}
  .bottom-left,.zoom{display:none!important}
  #canvas{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;min-height:0!important}
  #mobile-tool-active:not([hidden]){display:flex;position:fixed;right:12px;bottom:calc(var(--mwd-offset, 148px) + env(safe-area-inset-bottom));z-index:46;align-items:center;gap:10px;padding:6px 6px 6px 12px;border:1px solid #e6e8ee;border-radius:10px;background:#fff;box-shadow:0 6px 20px #18274b1a;font:600 13px 'DM Sans',sans-serif;color:#1f2430;max-width:calc(100vw - 24px)}
  #mobile-tool-active button{min-height:34px;padding:6px 12px;border-radius:8px;background:#4262ff;color:#fff;font-weight:600;touch-action:manipulation}
  #mindmap-panel:not([hidden]){top:calc(62px + env(safe-area-inset-top));left:8px;right:8px;bottom:calc(var(--mwd-offset, 148px) + env(safe-area-inset-bottom));width:auto;border-radius:14px;border-color:#e6e8ee;box-shadow:0 8px 28px #18274b1f;z-index:35}
  #toast{bottom:calc(var(--mwd-offset, 148px) + 72px + env(safe-area-inset-bottom))}
  #drawing-options:not([hidden]){position:fixed!important;top:calc(62px + env(safe-area-inset-top))!important;bottom:auto!important;left:12px!important;right:auto!important;width:min(244px,calc(100vw - 24px))!important;max-height:160px!important;padding:11px!important;z-index:39;border-radius:12px;box-shadow:0 8px 24px #18274b1a}
  #drawing-options .panel-heading{display:none}
  #drawing-options .inspector-section{padding:0}
  #inspector:not([hidden]){position:fixed;left:8px!important;right:8px!important;top:auto!important;bottom:calc(var(--mwd-offset, 148px) + env(safe-area-inset-bottom))!important;width:auto!important;max-width:none!important;max-height:min(52dvh,460px)!important;z-index:52;border-radius:14px;border:1px solid #e6e8ee;box-shadow:0 10px 32px #18274b24}
  #inspector .format-heading{padding:4px 4px 8px}
  #mobile-selection-actions:not([hidden]){overflow-x:auto;scrollbar-width:none}
  #mobile-workspace-dock button:focus-visible,#mobile-tool-sheet button:focus-visible{outline:2px solid #4262ff;outline-offset:2px}
  body.workspace-empty #mobile-tool-sheet{display:none!important}
}
@media(max-height:500px) and (pointer:coarse){
  #mobile-workspace-mode{top:calc(82px + env(safe-area-inset-top));left:10px}
  #mobile-tool-sheet:not([hidden]){max-height:54dvh}
  #canvas{inset:0!important;height:100dvh!important}
}
`;

function mode() {
  return state.board?.diagramView || (state.board?.kind === 'mindmap' ? 'mindmap' : 'canvas');
}
function closeSheet() {
  $('#mobile-tool-sheet').hidden = true;
  $('#mobile-workspace-dock [data-mw-action="add"]').setAttribute('aria-expanded', 'false');
  $('#mobile-workspace-dock [data-mw-action="more"]').setAttribute('aria-expanded', 'false');
}
function rowButton(item) {
  return `<button type="button" class="mw-row" data-mw-item="${item.action}" data-mw-value="${item.value}">${item.label}</button>`;
}
function sheetContents(section) {
  const current = mode();
  const menus = mobileWorkspaceMenus(current);
  const choices = section === 'more' ? menus.tools : menus.add;
  const label = section === 'more' ? 'Tools' : 'Add';
  const note = section === 'more' ? menus.toolsNote : menus.addNote;
  const sheet = $('#mobile-tool-sheet');
  sheet.dataset.renderedMode = current;
  sheet.innerHTML = `
    <div class="mw-sheet-head"><h3>${label}</h3><button class="mw-close" type="button" data-mw-close>Close</button></div>
    <p>${note}</p>
    <div class="mw-list">${choices.map(rowButton).join('')}</div>`;
}
function showSheet(section) {
  const sheet = $('#mobile-tool-sheet');
  const current = sheet.dataset.section;
  if (!sheet.hidden && current === section) return closeSheet();
  sheet.dataset.section = section;
  sheetContents(section);
  sheet.hidden = false;
  $('#mobile-workspace-dock [data-mw-action="add"]').setAttribute(
    'aria-expanded',
    String(section === 'add'),
  );
  $('#mobile-workspace-dock [data-mw-action="more"]').setAttribute(
    'aria-expanded',
    String(section === 'more'),
  );
}

function placeChrome() {
  const dock = $('#mobile-workspace-dock');
  if (!dock) return;
  const height = Math.ceil(dock.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--mwd-offset', `${height + 16}px`);
}
function renderContext(current) {
  const dock = $('#mobile-workspace-dock');
  const menus = mobileWorkspaceMenus(current);
  const hint = dock.querySelector('[data-mw-hint]');
  if (hint && hint.textContent !== menus.hint) hint.textContent = menus.hint;
  const host = dock.querySelector('[data-mw-context]');
  const markup = menus.context
    .map(
      (item) =>
        `<button type="button" data-mw-item="${item.action}" data-mw-value="${item.value}">${item.label}</button>`,
    )
    .join('');
  if (host.dataset.markup !== markup) {
    host.innerHTML = markup;
    host.dataset.markup = markup;
  }
  host.hidden = menus.context.length === 0;
  host.querySelectorAll('[data-mw-item="tool"]').forEach((button) => {
    button.setAttribute('aria-pressed', String(state.tool === button.dataset.mwValue));
  });
}
function syncDock() {
  const dock = $('#mobile-workspace-dock');
  const select = $('#mobile-workspace-mode select');
  if (!dock || !select || !state.board) return;
  const current = mode();
  select.value = current;
  dock.querySelectorAll('[data-mw-mode]').forEach((button) => {
    const on = button.dataset.mwMode === current;
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-selected', String(on));
  });
  renderContext(current);
  const sheet = $('#mobile-tool-sheet');
  if (!sheet.hidden && sheet.dataset.renderedMode !== mode()) sheetContents(sheet.dataset.section);
  const status = $('#mobile-tool-active');
  if (status) {
    const busy = state.tool && state.tool !== 'select';
    status.hidden = !busy;
    if (busy)
      status.querySelector('[data-mw-active-name]').textContent =
        {
          connector: 'Linking nodes',
          pen: 'Drawing',
          line: 'Drawing a line',
          eraser: 'Erasing',
          hand: 'Navigation',
        }[state.tool] || 'Placing ' + state.tool;
  }
  placeChrome();
}
function choose(action, value) {
  closeSheet();
  if (action === 'task') document.dispatchEvent(new Event('sparkboard:new-task'));
  else if (action === 'flow') addFlowStep(value);
  else if (action === 'connection') {
    const edge = state.board?.objects.find(
      (item) => state.selected.has(item.id) && item.type === 'connector',
    );
    if (edge)
      document.dispatchEvent(
        new CustomEvent('sparkboard:connector-edit', { detail: { id: edge.id } }),
      );
    else toast('Select a connector first');
  } else if (action === 'map-style') {
    const topic = state.board?.objects.find((item) => state.selected.has(item.id) && item.mindmap);
    if (topic)
      document.dispatchEvent(
        new CustomEvent('sparkboard:mind-style', { detail: { id: topic.id } }),
      );
    else toast('Select a mind-map topic first');
  } else if (action === 'tool') {
    if (value === 'sticky' || value === 'text') {
      const center = centerPoint();
      addAt(value, {
        x: center.x - (value === 'text' ? 140 : 95),
        y: center.y - (value === 'text' ? 40 : 85),
      });
    } else setTool(value);
  } else if (action === 'picker') {
    const trigger =
      value === 'shapes' ? $('#shape-toggle') : $('#tools [data-tool="' + value + '"]');
    if (trigger) trigger.click();
  } else if (action === 'header') $('#' + value)?.click();
  else if (action === 'map') {
    const control = $('#mindmap-toolbar [data-mm-action="' + value + '"]');
    if (control && !control.disabled) control.click();
    else if (value === 'adopt') toast('Select one object that is not already a topic');
    else if (value === 'layout') toast('Create or convert a topic first');
    else toast('Could not add a topic');
  } else if (action === 'mode') setDiagramView(value);
  syncDock();
}

export function setupMobileWorkspace() {
  const style = document.createElement('style');
  style.textContent = mobileStyle;
  document.head.append(style);
  const header = document.createElement('label');
  header.id = 'mobile-workspace-mode';
  header.innerHTML = `<span>VIEW</span><select aria-label="Board view"><option value="canvas">Canvas</option><option value="mindmap">Mind map</option><option value="flowchart">Flowchart</option><option value="outline">Outline</option></select>`;
  const dock = document.createElement('nav');
  dock.id = 'mobile-workspace-dock';
  dock.setAttribute('aria-label', 'Mobile editing tools');
  dock.innerHTML = `<div class="mwd-modes" role="tablist" aria-label="Board view">
      <button type="button" role="tab" data-mw-mode="canvas">Canvas</button>
      <button type="button" role="tab" data-mw-mode="mindmap">Map</button>
      <button type="button" role="tab" data-mw-mode="flowchart">Flow</button>
      <button type="button" role="tab" data-mw-mode="outline">Outline</button>
    </div>
    <p class="mwd-hint" data-mw-hint></p>
    <div class="mwd-context" data-mw-context role="toolbar" aria-label="Actions for this view"></div>
    <div class="mwd-actions">
      <button type="button" class="mwd-tools" data-mw-action="more" aria-expanded="false" aria-controls="mobile-tool-sheet">Tools</button>
      <button type="button" class="mwd-add" data-mw-action="add" aria-expanded="false" aria-controls="mobile-tool-sheet">Add</button>
    </div>`;
  const status = document.createElement('div');
  status.id = 'mobile-tool-active';
  status.hidden = true;
  status.setAttribute('role', 'status');
  status.innerHTML =
    '<span data-mw-active-name></span><button type="button" data-mw-finish>Done</button>';
  const sheet = document.createElement('section');
  sheet.id = 'mobile-tool-sheet';
  sheet.hidden = true;
  sheet.setAttribute('aria-label', 'Mobile tools and objects');
  document.body.append(header, dock, sheet, status);
  status.addEventListener('click', (event) => {
    if (event.target.closest('[data-mw-finish]')) {
      setTool('select');
      syncDock();
    }
  });
  header.querySelector('select').addEventListener('change', (event) => {
    closeSheet();
    setDiagramView(event.target.value);
    syncDock();
  });
  dock.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.mwMode) {
      closeSheet();
      setDiagramView(button.dataset.mwMode);
    } else if (button.dataset.mwItem) choose(button.dataset.mwItem, button.dataset.mwValue);
    else if (button.dataset.mwAction) showSheet(button.dataset.mwAction);
    syncDock();
  });
  sheet.addEventListener('click', (event) => {
    if (event.target.closest('[data-mw-close]')) return closeSheet();
    const item = event.target.closest('[data-mw-item]');
    if (item) choose(item.dataset.mwItem, item.dataset.mwValue);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!sheet.hidden && !sheet.contains(event.target) && !dock.contains(event.target))
      closeSheet();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !sheet.hidden) closeSheet();
  });
  document.addEventListener('sparkboard:render', syncDock);
  document.addEventListener('sparkboard:mode', () => {
    if (state.tool === 'hand') setTool('select');
    syncDock();
  });
  document.addEventListener('sparkboard:selection', syncDock);
  document.addEventListener('sparkboard:tool', syncDock);
  document.addEventListener('sparkboard:mobile-shape', (event) => {
    if (!event.detail?.type) return;
    const center = centerPoint();
    addAt(event.detail.type, { x: center.x - 95, y: center.y - 85 });
    syncDock();
  });
  window.addEventListener('resize', () => {
    if (!isCompactEditor()) closeSheet();
    placeChrome();
  });
  syncDock();
}
