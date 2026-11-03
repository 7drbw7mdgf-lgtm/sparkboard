import { $ } from './core.js';
import { state } from './state.js';
import { closeShapes, setTool } from './tools.js';
import { addFlowStep } from './flowchart.js';
import { toast } from './notifications.js';
import { isCompactEditor } from './mobile-editor-policy.js';
import { addAt, addSwimlane } from './canvas.js';
import { centerPoint } from './viewport.js';
import { setDiagramView } from './mindmap.js';
import { mobileWorkspaceMenus } from './mobile-menus.js';
import { svgIcon } from './icons.js';

const mobileStyle = `
#mobile-workspace-dock,#mobile-workspace-mode,#mobile-tool-sheet,#mobile-tool-active,#mobile-benchline{display:none}
@media(max-width:650px),(max-height:500px) and (pointer:coarse){
  body:not(.workspace-empty) #mobile-workspace-dock{display:flex;flex-direction:column}
  body:not(.workspace-empty) #mobile-workspace-mode{display:none}
  .workspace-header{height:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;pointer-events:none}
  #tools{display:none!important}
  #mobile-more,#mobile-more-menu{display:none!important}
  body:not(.workspace-empty) #mobile-benchline{display:inline-flex;position:fixed;top:calc(12px + env(safe-area-inset-top));right:12px;z-index:22;align-items:center;min-height:36px;padding:0 12px;border-radius:999px;background:#e8f4e9;border:1px solid #c7dec9;color:#2d7144;font:750 12px/1 'DM Sans',sans-serif;text-decoration:none;pointer-events:auto;box-shadow:0 4px 14px #18274b14}
  #mindmap-toolbar{display:none!important}
  #mobile-workspace-mode{position:fixed;top:calc(124px + env(safe-area-inset-top));left:12px;z-index:19;align-items:center;gap:8px;border:1px solid #e6e8ee;background:#fff;box-shadow:0 6px 20px #18274b14;border-radius:10px;min-height:40px;padding:0 11px;font:600 12px/1 'DM Sans',sans-serif;color:#5c6570}
  #mobile-workspace-mode select{border:0;outline:0;background:transparent;color:#1f2430;font:600 14px/1 'DM Sans',sans-serif;min-height:40px;padding:0 16px 0 0;font-size:16px}
  #mobile-workspace-dock{position:fixed;left:0;right:0;bottom:calc(8px + env(safe-area-inset-bottom));z-index:45;height:auto;padding:0;gap:8px;border:0;background:transparent;box-shadow:none;pointer-events:none;align-items:center}
  #mobile-workspace-dock .mwd-circles,#mobile-workspace-dock .mwd-fan{pointer-events:auto}
  #mobile-workspace-dock .mwd-circles{display:flex;align-items:flex-end;justify-content:center;gap:10px}
  #mobile-workspace-dock .mwd-circle{width:40px;height:40px;padding:0;border:1px solid #e4e7ee;border-radius:50%;background:#fff;color:#1f2430;box-shadow:0 6px 16px #18274b22;display:grid;place-items:center;touch-action:manipulation;transition:transform .12s ease}
  #mobile-workspace-dock .mwd-circle.mwd-main{width:56px;height:56px}
  #mobile-workspace-dock .mwd-circle:active,#mobile-workspace-dock .mwd-circle[aria-expanded="true"]{transform:scale(1.14)}
  #mobile-workspace-dock .mwd-circle[aria-expanded="true"],#mobile-workspace-dock .mwd-circle[aria-pressed="true"]{background:#4262ff;color:#fff;border-color:#4262ff}
  #mobile-workspace-dock .mwd-circle svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2}
  #mobile-workspace-dock .mwd-circle.mwd-main svg{width:24px;height:24px}
  #mobile-workspace-dock .mwd-circle svg polygon{fill:currentColor;stroke:none}
  #mobile-workspace-dock .mwd-fan{display:flex;flex-wrap:nowrap;justify-content:safe center;gap:6px;max-width:calc(100vw - 16px);overflow-x:auto;scrollbar-width:none;padding:0 4px}
  #mobile-workspace-dock .mwd-fan[hidden]{display:none}
  #mobile-workspace-dock .mwd-fan .mwd-circle{flex:0 0 40px}
  #mobile-tool-sheet:not([hidden]){display:block;position:fixed;left:8px;right:8px;bottom:calc(var(--mwd-offset, 80px) + env(safe-area-inset-bottom));z-index:44;max-height:min(62dvh,470px);overflow:auto;overscroll-behavior:contain;background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:12px 8px 8px;box-shadow:0 8px 28px #18274b24;color:#1f2430}
  #mobile-tool-sheet h3{font:650 15px/1.2 'DM Sans',sans-serif;margin:0}
  #mobile-tool-sheet p{font-size:12px;color:#6b7280;margin:4px 0 8px;line-height:1.4;padding:0 4px}
  #mobile-tool-sheet .mw-list{display:flex;flex-direction:column}
  #mobile-tool-sheet .mw-row,#mobile-tool-sheet a.mw-row{display:flex;align-items:center;width:100%;min-height:44px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:#1f2430;font:550 15px/1.2 'DM Sans',sans-serif;text-align:left;text-decoration:none;touch-action:manipulation}
  #mobile-tool-sheet .mw-row:active{background:#f3f4f6}
  #mobile-tool-sheet .mw-sheet-head{display:flex;align-items:center;justify-content:space-between;margin:0 4px 4px}
  #mobile-tool-sheet .mw-close{min-height:32px;padding:0 10px;border-radius:8px;background:#f3f4f6;color:#1f2430;font:600 13px/1 'DM Sans',sans-serif}
  #mobile-selection-actions:not([hidden]){bottom:calc(var(--mwd-offset, 80px) + env(safe-area-inset-bottom))!important;max-width:calc(100vw - 16px);z-index:43}
  .bottom-left,.zoom{display:none!important}
  #canvas{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;min-height:0!important}
  #mobile-tool-active:not([hidden]){display:flex;position:fixed;right:12px;bottom:calc(var(--mwd-offset, 80px) + env(safe-area-inset-bottom));z-index:46;align-items:center;gap:10px;padding:6px 6px 6px 12px;border:1px solid #e6e8ee;border-radius:10px;background:#fff;box-shadow:0 6px 20px #18274b1a;font:600 13px 'DM Sans',sans-serif;color:#1f2430;max-width:calc(100vw - 24px)}
  #mobile-tool-active button{min-height:34px;padding:6px 12px;border-radius:8px;background:#4262ff;color:#fff;font-weight:600;touch-action:manipulation}
  #mindmap-panel:not([hidden]){top:calc(62px + env(safe-area-inset-top));left:8px;right:8px;bottom:calc(var(--mwd-offset, 80px) + env(safe-area-inset-bottom));width:auto;border-radius:14px;border-color:#e6e8ee;box-shadow:0 8px 28px #18274b1f;z-index:35}
  #toast{bottom:calc(var(--mwd-offset, 80px) + 72px + env(safe-area-inset-bottom))}
  #drawing-options:not([hidden]){position:fixed!important;top:calc(62px + env(safe-area-inset-top))!important;bottom:auto!important;left:12px!important;right:auto!important;width:min(244px,calc(100vw - 24px))!important;max-height:160px!important;padding:11px!important;z-index:39;border-radius:12px;box-shadow:0 8px 24px #18274b1a}
  #drawing-options .panel-heading{display:none}
  #drawing-options .inspector-section{padding:0}
  #inspector:not([hidden]){position:fixed;left:8px!important;right:8px!important;top:auto!important;bottom:calc(var(--mwd-offset, 80px) + env(safe-area-inset-bottom))!important;width:auto!important;max-width:none!important;max-height:min(52dvh,460px)!important;z-index:52;border-radius:28px;border:1px solid #ffffffb8;background:#fafaf8c7;backdrop-filter:blur(28px) saturate(1.4);-webkit-backdrop-filter:blur(28px) saturate(1.4);box-shadow:0 12px 32px #1e331c24,inset 0 1px 0 #ffffffd9}
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
body:not(.workspace-empty) #mobile-workspace-dock{display:flex;flex-direction:column}
#mobile-workspace-dock{position:fixed;left:0;right:0;bottom:calc(8px + env(safe-area-inset-bottom));z-index:45;height:auto;padding:0;gap:8px;border:0;background:transparent;box-shadow:none;pointer-events:none;align-items:center}
#mobile-workspace-dock .mwd-circles,#mobile-workspace-dock .mwd-fan{pointer-events:auto}
#mobile-workspace-dock .mwd-circles{display:flex;align-items:flex-end;justify-content:center;gap:10px}
#mobile-workspace-dock .mwd-circle{width:40px;height:40px;padding:0;border:1px solid #e4e7ee;border-radius:50%;background:#fff;color:#1f2430;box-shadow:0 6px 16px #18274b22;display:grid;place-items:center;touch-action:manipulation;transition:transform .14s ease,background .14s ease,color .14s ease}
#mobile-workspace-dock .mwd-circle.mwd-main{width:56px;height:56px}
#mobile-workspace-dock .mwd-circle:active,#mobile-workspace-dock .mwd-circle[aria-expanded="true"]{transform:scale(1.14)}
#mobile-workspace-dock .mwd-circle[aria-expanded="true"],#mobile-workspace-dock .mwd-circle[aria-pressed="true"]{background:#4262ff;color:#fff;border-color:#4262ff}
#mobile-workspace-dock .mwd-circle svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2}
#mobile-workspace-dock .mwd-circle.mwd-main svg{width:24px;height:24px}
#mobile-workspace-dock .mwd-circle svg polygon{fill:currentColor;stroke:none}
#mobile-workspace-dock .mwd-fan{display:flex;flex-wrap:nowrap;justify-content:safe center;gap:6px;max-width:calc(100vw - 16px);overflow-x:auto;scrollbar-width:none;padding:0 4px}
#mobile-workspace-dock .mwd-fan[hidden]{display:none}
#mobile-workspace-dock .mwd-fan .mwd-circle{flex:0 0 40px}
#mobile-tool-sheet:not([hidden]){display:block;position:fixed;left:50%;right:auto;transform:translateX(-50%);width:min(420px,calc(100vw - 24px));bottom:calc(var(--mwd-offset, 80px) + env(safe-area-inset-bottom));z-index:44;max-height:min(62dvh,470px);overflow:auto;overscroll-behavior:contain;background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:12px 8px 8px;box-shadow:0 8px 28px #18274b24;color:#1f2430}
#mobile-tool-sheet h3{font:650 15px/1.2 'DM Sans',sans-serif;margin:0}
#mobile-tool-sheet p{font-size:12px;color:#6b7280;margin:4px 0 8px;line-height:1.4;padding:0 4px}
#mobile-tool-sheet .mw-list{display:flex;flex-direction:column}
#mobile-tool-sheet .mw-row,#mobile-tool-sheet a.mw-row{display:flex;align-items:center;width:100%;min-height:44px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:#1f2430;font:550 15px/1.2 'DM Sans',sans-serif;text-align:left;text-decoration:none;touch-action:manipulation}
#mobile-tool-sheet .mw-row:active,#mobile-tool-sheet .mw-row:hover{background:#f3f4f6}
#mobile-tool-sheet .mw-sheet-head{display:flex;align-items:center;justify-content:space-between;margin:0 4px 4px}
#mobile-tool-sheet .mw-close{min-height:32px;padding:0 10px;border-radius:8px;background:#f3f4f6;color:#1f2430;font:600 13px/1 'DM Sans',sans-serif}
#mobile-tool-active:not([hidden]){display:flex;position:fixed;left:50%;right:auto;transform:translateX(-50%);bottom:calc(var(--mwd-offset, 80px) + env(safe-area-inset-bottom));z-index:46;align-items:center;gap:10px;padding:6px 6px 6px 12px;border:1px solid #e6e8ee;border-radius:10px;background:#fff;box-shadow:0 6px 20px #18274b1a;font:600 13px 'DM Sans',sans-serif;color:#1f2430}
#mobile-tool-active button{min-height:34px;padding:6px 12px;border-radius:8px;background:#4262ff;color:#fff;font-weight:600;touch-action:manipulation}
#mobile-workspace-dock button:focus-visible,#mobile-tool-sheet button:focus-visible{outline:2px solid #4262ff;outline-offset:2px}
@media(min-width:651px){
  #mobile-selection-actions:not([hidden]){display:flex;position:fixed;left:50%;right:auto;bottom:calc(var(--mwd-offset, 80px) + 8px);transform:translateX(-50%);max-width:min(640px,calc(100vw - 160px));z-index:43;border-radius:10px;background:#fff;border:1px solid #e6e8ee;box-shadow:0 8px 24px #18274b1f;padding:3px;overflow-x:auto;scrollbar-width:none}
  .mobile-actions-inner{display:flex;flex-wrap:nowrap;gap:2px}
  .mobile-actions-inner button{flex:0 0 auto;padding:8px 12px;min-height:36px;background:transparent;border:0;border-radius:8px;color:#1f2430;font:600 13px/1 'DM Sans',sans-serif;white-space:nowrap;cursor:pointer}
  .mobile-actions-inner button.active{color:#4262ff;background:#e8edff}
  .mobile-actions-inner button.danger{color:#c2414a}
  .mobile-actions-inner button.danger:hover{background:#fde8ea}
  body:not(.workspace-empty) .bottom-hint{bottom:calc(var(--mwd-offset, 80px) + 28px);max-width:min(520px,calc(100vw - 300px))}
  body:not(.workspace-empty):has(#mobile-selection-actions:not([hidden])) .bottom-hint{bottom:calc(var(--mwd-offset, 80px) + 64px)}
  body:not(.workspace-empty) #toast{bottom:calc(var(--mwd-offset, 80px) + 36px)}
  #mobile-workspace-dock .mwd-circle:hover{transform:scale(1.08)}
  #mobile-workspace-dock .mwd-circle[aria-expanded="true"]:hover{transform:scale(1.14)}
}
@media(max-width:650px),(max-height:500px) and (pointer:coarse){
  #mobile-tool-sheet:not([hidden]){left:8px;right:8px;width:auto;transform:none}
  #mobile-tool-active:not([hidden]){left:auto;right:12px;transform:none;max-width:calc(100vw - 24px)}
}
`;

function mode() {
  return state.board?.diagramView || (state.board?.kind === 'mindmap' ? 'mindmap' : 'canvas');
}
function closeFan() {
  const dock = $('#mobile-workspace-dock');
  const fan = dock?.querySelector('[data-mw-fan]');
  if (fan) fan.hidden = true;
  dock?.querySelector('[data-mw-action="view"]')?.setAttribute('aria-expanded', 'false');
  dock?.querySelector('[data-mw-action="more"]')?.setAttribute('aria-expanded', 'false');
  placeChrome();
}
function closeSheet() {
  $('#mobile-tool-sheet').hidden = true;
  closeFan();
}
function rowButton(item) {
  if (item.action === 'link')
    return `<a class="mw-row" href="${item.value}" aria-label="${item.label}">${item.label}</a>`;
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
}

function placeChrome() {
  const dock = $('#mobile-workspace-dock');
  if (!dock) return;
  const height = Math.ceil(dock.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--mwd-offset', `${height + 16}px`);
}
const fanGlyph = {
  canvas: 'frame',
  mindmap: 'map',
  flowchart: 'diamond',
  outline: 'format',
  pen: 'pen',
  line: 'line',
  eraser: 'eraser',
  'search-board': 'search',
  fit: 'frame',
  undo: 'undo',
  redo: 'redo',
  templates: 'templates',
  export: 'export',
  scenes: 'scenes',
  shapes: 'shape',
  media: 'media',
  embed: 'embed',
  link: 'link',
  sticky: 'sticky',
  text: 'text',
  task: 'check',
  swimlane: 'swimlane',
  root: 'map',
  layout: 'grid',
  adopt: 'reshape',
  start: 'circle',
  process: 'shape',
  decision: 'diamond',
  data: 'parallelogram',
  end: 'pill',
  board: 'grid',
  'map-style': 'format',
};
function fanChoices(section, current) {
  const menus = mobileWorkspaceMenus(current);
  if (section === 'view') {
    return [
      { label: 'Canvas', action: 'mode', value: 'canvas' },
      { label: 'Map', action: 'mode', value: 'mindmap' },
      { label: 'Flow', action: 'mode', value: 'flowchart' },
      { label: 'Outline', action: 'mode', value: 'outline' },
    ];
  }
  const primary = new Set(['sticky', 'text', 'shapes']);
  const extras = menus.add.filter((item) => !primary.has(item.value));
  return [...menus.context, ...extras, { label: 'Tools', action: 'board', value: '' }];
}
function renderFan(section) {
  const fan = $('#mobile-workspace-dock [data-mw-fan]');
  const current = mode();
  const markup = fanChoices(section, current)
    .map((item) => {
      const pressed =
        item.action === 'mode'
          ? item.value === current
          : item.action === 'tool' && state.tool === item.value;
      const attrs =
        item.action === 'board'
          ? 'data-mw-action="board"'
          : `data-mw-item="${item.action}" data-mw-value="${item.value}"`;
      const glyph = fanGlyph[item.value] || fanGlyph[item.action] || 'shape';
      return `<button type="button" class="mwd-circle" ${attrs} aria-label="${item.label}" title="${item.label}" aria-pressed="${pressed}">${svgIcon(glyph)}</button>`;
    })
    .join('');
  fan.dataset.section = section;
  fan.innerHTML = markup;
  fan.hidden = false;
}
function toggleFan(section) {
  const fan = $('#mobile-workspace-dock [data-mw-fan]');
  if (!fan.hidden && fan.dataset.section === section) closeFan();
  else {
    $('#mobile-tool-sheet').hidden = true;
    closeShapes();
    renderFan(section);
  }
}
function syncDock() {
  const dock = $('#mobile-workspace-dock');
  const select = $('#mobile-workspace-mode select');
  if (!dock || !select || !state.board) return;
  const current = mode();
  select.value = current;
  const fan = dock.querySelector('[data-mw-fan]');
  if (fan && !fan.hidden) renderFan(fan.dataset.section);
  dock
    .querySelector('[data-mw-action="view"]')
    ?.setAttribute('aria-expanded', String(fan && !fan.hidden && fan.dataset.section === 'view'));
  dock
    .querySelector('[data-mw-action="more"]')
    ?.setAttribute('aria-expanded', String(fan && !fan.hidden && fan.dataset.section === 'more'));
  const viewButton = dock.querySelector('[data-mw-action="view"]');
  if (viewButton)
    viewButton.textContent =
      { canvas: 'C', mindmap: 'M', flowchart: 'F', outline: 'O' }[current] || 'C';
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
  } else if (action === 'swimlane') addSwimlane();
  else if (action === 'tool') {
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
  else if (action === 'link' && value) location.assign(value);
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
  dock.setAttribute('aria-label', 'Editing tools');
  dock.innerHTML = `<div class="mwd-fan" data-mw-fan hidden></div>
    <div class="mwd-circles">
      <button type="button" class="mwd-circle mwd-main" data-mw-item="tool" data-mw-value="sticky" aria-label="Sticky note">${svgIcon('sticky')}</button>
      <button type="button" class="mwd-circle mwd-main" data-mw-item="tool" data-mw-value="text" aria-label="Text">${svgIcon('text')}</button>
      <button type="button" class="mwd-circle mwd-main" data-mw-item="picker" data-mw-value="shapes" aria-label="Shapes">${svgIcon('shape')}</button>
      <button type="button" class="mwd-circle" data-mw-action="view" aria-label="Board view" aria-expanded="false">C</button>
      <button type="button" class="mwd-circle" data-mw-action="more" aria-label="More tools" aria-expanded="false">${svgIcon('more')}</button>
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
  const benchline = document.createElement('a');
  benchline.id = 'mobile-benchline';
  benchline.href = '/sai/';
  benchline.textContent = 'Benchline';
  benchline.setAttribute('aria-label', 'Open Benchline project planner');
  document.body.append(header, dock, sheet, status, benchline);
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
  const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
  let fanTimer = 0;
  const cancelFanClose = () => clearTimeout(fanTimer);
  const scheduleFanClose = () => {
    cancelFanClose();
    fanTimer = setTimeout(() => {
      if (!$('#mobile-tool-sheet').hidden) return;
      closeFan();
      syncDock();
    }, 180);
  };
  dock.addEventListener('pointerenter', cancelFanClose);
  dock.addEventListener('pointerleave', () => {
    if (finePointer()) scheduleFanClose();
  });
  dock.addEventListener('pointerover', (event) => {
    if (!finePointer()) return;
    const trigger = event.target.closest('[data-mw-action="view"], [data-mw-action="more"]');
    if (!trigger || !dock.contains(trigger)) return;
    cancelFanClose();
    const fan = dock.querySelector('[data-mw-fan]');
    if (fan.hidden || fan.dataset.section !== trigger.dataset.mwAction) {
      $('#mobile-tool-sheet').hidden = true;
      closeShapes();
      renderFan(trigger.dataset.mwAction);
      syncDock();
    }
  });
  dock.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.mwAction === 'view' || button.dataset.mwAction === 'more') {
      const fan = dock.querySelector('[data-mw-fan]');
      const openHere = !fan.hidden && fan.dataset.section === button.dataset.mwAction;
      if (!(finePointer() && event.detail > 0 && openHere)) toggleFan(button.dataset.mwAction);
    } else if (button.dataset.mwAction === 'board') {
      closeFan();
      showSheet('more');
    } else if (button.dataset.mwItem) choose(button.dataset.mwItem, button.dataset.mwValue);
    syncDock();
  });
  sheet.addEventListener('click', (event) => {
    if (event.target.closest('[data-mw-close]')) return closeSheet();
    const item = event.target.closest('[data-mw-item]');
    if (item) choose(item.dataset.mwItem, item.dataset.mwValue);
  });
  document.addEventListener('pointerdown', (event) => {
    const fanOpen = !dock.querySelector('[data-mw-fan]')?.hidden;
    if (
      (!sheet.hidden || fanOpen) &&
      !sheet.contains(event.target) &&
      !dock.contains(event.target)
    ) {
      closeSheet();
      syncDock();
    }
  });
  document.addEventListener('keydown', (event) => {
    const fanOpen = !dock.querySelector('[data-mw-fan]')?.hidden;
    if (event.key === 'Escape' && (!sheet.hidden || fanOpen)) {
      closeSheet();
      syncDock();
    }
  });
  document.addEventListener('sparkboard:render', syncDock);
  document.addEventListener('sparkboard:mode', () => {
    if (state.tool === 'hand') setTool('select');
    syncDock();
  });
  document.addEventListener('sparkboard:selection', syncDock);
  document.addEventListener('sparkboard:tool', syncDock);
  document.addEventListener('sparkboard:add-swimlane', () => addSwimlane());
  document.addEventListener('sparkboard:mobile-shape', (event) => {
    if (!event.detail?.type) return;
    const center = centerPoint();
    addAt(event.detail.type, { x: center.x - 95, y: center.y - 85 });
    syncDock();
  });
  let compactLayout = isCompactEditor();
  window.addEventListener('resize', () => {
    const next = isCompactEditor();
    if (next !== compactLayout) {
      closeSheet();
      compactLayout = next;
    }
    placeChrome();
  });
  syncDock();
}
