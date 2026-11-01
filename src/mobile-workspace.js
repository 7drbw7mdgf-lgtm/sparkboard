import { $ } from './core.js';
import { state } from './state.js';
import { setTool } from './tools.js';
import { addFlowStep, startFlowLink } from './flowchart.js';
import { toast } from './notifications.js';
import { isCompactEditor } from './mobile-editor-policy.js';
import { addAt } from './canvas.js';
import { centerPoint } from './viewport.js';

const mobileStyle = `
#mobile-workspace-dock,#mobile-workspace-mode,#mobile-tool-sheet,#mobile-tool-active{display:none}
@media(max-width:650px),(max-height:500px) and (pointer:coarse){
  body:not(.workspace-empty) #mobile-workspace-dock{display:grid}
  body:not(.workspace-empty) #mobile-workspace-mode{display:flex}
  /* The former opaque 116px header obscured the supposedly full-screen board. */
  .workspace-header{height:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;pointer-events:none}
  #tools{display:none!important}
  #mobile-more,#mobile-more-menu{display:none!important}
  #mindmap-toolbar{display:none!important}
  #mobile-workspace-mode{position:fixed;top:calc(124px + env(safe-area-inset-top));left:12px;z-index:19;align-items:center;gap:8px;border:1px solid #d8e1db;background:#fff;box-shadow:0 6px 20px #152d251b;border-radius:13px;min-height:40px;padding:0 11px;font:700 12px/1 Manrope,sans-serif;color:#476354}
  #mobile-workspace-mode select{border:0;outline:0;background:transparent;color:#264c40;font:700 14px/1 Manrope,sans-serif;min-height:40px;padding:0 16px 0 0;font-size:16px}
  #mobile-workspace-dock{position:fixed;bottom:calc(9px + env(safe-area-inset-bottom));left:9px;right:9px;z-index:45;height:68px;padding:7px;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;border:1px solid #d7e0d9;border-radius:20px;background:#fff;box-shadow:0 12px 36px #20382e35;align-items:stretch}
  #mobile-workspace-dock button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;border:0;border-radius:13px;color:#63736b;font:700 10px/1.1 Manrope,sans-serif;padding:4px 1px;touch-action:manipulation}
  #mobile-workspace-dock button .mwd-icon{font:700 21px/1 sans-serif}
  #mobile-workspace-dock button[aria-pressed="true"]{background:#e5f1e9;color:#24694e}
  #mobile-workspace-dock button[data-mw-action="add"]{background:#286a51;color:#fff}
  #mobile-workspace-dock button[data-mw-action="add"][aria-expanded="true"]{background:#184d3a}
  #mobile-tool-sheet:not([hidden]){display:block;position:fixed;left:9px;right:9px;bottom:calc(86px + env(safe-area-inset-bottom));z-index:44;max-height:min(62dvh,470px);overflow:auto;overscroll-behavior:contain;background:#fff;border:1px solid #dce5df;border-radius:19px;padding:16px;box-shadow:0 6px 34px #13281f36;color:#253b31}
  #mobile-tool-sheet h3{font:750 16px/1.25 Manrope,sans-serif;margin:0 0 5px}
  #mobile-tool-sheet p{font-size:12px;color:#78867c;margin:0 0 12px;line-height:1.4}
  #mobile-tool-sheet .mw-tool-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  #mobile-tool-sheet .mw-tool-grid button{display:flex;flex-direction:column;gap:5px;align-items:center;justify-content:center;text-align:center;min-height:77px;padding:12px 4px;border:1px solid #e1e7e1;border-radius:13px;background:#f7faf7;color:#365347;font:700 12px/1.2 Manrope,sans-serif;touch-action:manipulation}
  #mobile-tool-sheet .mw-tool-grid button:active{background:#dcefe3}
  #mobile-tool-sheet .mw-tool-grid button .mw-emoji{font-size:25px;line-height:1}
  #mobile-tool-sheet .mw-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  #mobile-tool-sheet .mw-close{font-size:22px;border-radius:10px;background:#f1f4f1;width:36px;height:36px}
  #mobile-tool-sheet .mw-sheet-section{border-top:1px solid #edf1ed;padding-top:12px;margin-top:14px}
  #mobile-tool-sheet .mw-sheet-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:800;color:#87978b;margin-bottom:8px}
  #mobile-selection-actions:not([hidden]){bottom:calc(91px + env(safe-area-inset-bottom))!important;max-width:calc(100vw - 18px);z-index:43}
  #mobile-selection-actions:not([hidden]) .mobile-actions-inner{box-shadow:0 6px 22px #213a3026}
  /* Fit, zoom and undo/redo remain available via Tools, not floating over nodes. */
  .bottom-left,.zoom{display:none!important}
  /* Float the controls over a truly full-screen canvas. */
  #canvas{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;min-height:0!important}
  #mobile-tool-active:not([hidden]){display:flex;position:fixed;right:12px;bottom:calc(91px + env(safe-area-inset-bottom));z-index:46;align-items:center;gap:10px;padding:7px 8px 7px 13px;border:1px solid #c9dcd0;border-radius:12px;background:#fff;box-shadow:0 5px 22px #1a332a30;font:700 12px Manrope,sans-serif;color:#355a46;max-width:calc(100vw - 24px)}
  #mobile-tool-active button{min-height:36px;padding:6px 12px;border-radius:9px;background:#286a51;color:#fff;font-weight:700;touch-action:manipulation}
  #mindmap-panel:not([hidden]){top:calc(174px + env(safe-area-inset-top));bottom:calc(92px + env(safe-area-inset-bottom));z-index:35}
  #toast{bottom:calc(178px + env(safe-area-inset-bottom))}
  /* Pen width and colour remain usable, without opening a full-screen sheet. */
  #drawing-options:not([hidden]){position:fixed!important;top:calc(174px + env(safe-area-inset-top))!important;bottom:auto!important;left:12px!important;right:auto!important;width:min(244px,calc(100vw - 24px))!important;max-height:160px!important;padding:11px!important;z-index:39;border-radius:13px;box-shadow:0 7px 25px #1634272a}
  #drawing-options .panel-heading{display:none}
  #drawing-options .inspector-section{padding:0}
  #inspector:not([hidden]){position:fixed;left:9px!important;right:9px!important;top:auto!important;bottom:calc(88px + env(safe-area-inset-bottom))!important;width:auto!important;max-width:none!important;max-height:min(57dvh,490px)!important;z-index:52;border-radius:19px;box-shadow:0 10px 36px #152f2536}
  #inspector .format-heading{padding:7px 10px 12px}
  #mobile-selection-actions:not([hidden]){overflow-x:auto;scrollbar-width:none}
  #mobile-workspace-dock button:focus-visible,#mobile-tool-sheet button:focus-visible{outline:2px solid #286a51;outline-offset:2px}
  body.workspace-empty #mobile-tool-sheet{display:none!important}
}
@media(max-height:500px) and (pointer:coarse){
  #mobile-workspace-mode{top:calc(82px + env(safe-area-inset-top));left:10px}
  #mobile-workspace-dock{height:60px}
  #mobile-tool-sheet:not([hidden]){max-height:60dvh;bottom:calc(78px + env(safe-area-inset-bottom))}
  #canvas{inset:0!important;height:100dvh!important}
  #mobile-tool-active:not([hidden]){bottom:calc(80px + env(safe-area-inset-bottom))}
  #mobile-selection-actions:not([hidden]){bottom:calc(78px + env(safe-area-inset-bottom))!important}
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
function makeButton(label, symbol, action, value) {
  return `<button type="button" data-mw-item="${action}" data-mw-value="${value}"><span class="mw-emoji" aria-hidden="true">${symbol}</span>${label}</button>`;
}
function sheetContents(section) {
  const current = mode();
  let choices;
  if (section === 'more') {
    choices = [
      ['Sticky', '▤', 'tool', 'sticky'],
      ['Text', 'T', 'tool', 'text'],
      ['Shapes', '◇', 'picker', 'shapes'],
      ['Draw', '✎', 'tool', 'pen'],
      ['Line', '╱', 'tool', 'line'],
      ['Connector styles', '↝', 'connection', ''],
      ['Erase', '⌫', 'tool', 'eraser'],
      ['Photo / PDF', '▧', 'picker', 'media'],
      ['Embed', '▣', 'picker', 'embed'],
      ['Web link', '↗', 'picker', 'link'],
      ['Find', '⌕', 'header', 'search-board'],
      ['Templates', '▦', 'header', 'templates'],
      ['Export', '⇧', 'header', 'export'],
      ['Scenes', '▤', 'header', 'scenes'],
      ['Fit to board', '⛶', 'header', 'fit'],
      ['Undo', '↶', 'header', 'undo'],
      ['Redo', '↷', 'header', 'redo'],
    ];
  } else if (current === 'flowchart') {
    choices = [
      ['Start', '◉', 'flow', 'start'],
      ['Process', '▭', 'flow', 'process'],
      ['Decision', '◇', 'flow', 'decision'],
      ['Input / output', '▱', 'flow', 'data'],
      ['End', '◎', 'flow', 'end'],
      ['Link nodes', '↗', 'connect', ''],
    ];
  } else if (current === 'mindmap' || current === 'outline') {
    choices = [
      ['Root topic', '◉', 'map', 'root'],
      ['Child branch', '↳', 'map', 'child'],
      ['Sibling topic', '⊕', 'map', 'sibling'],
      ['Arrange', '☷', 'map', 'layout'],
      ['Collapse / expand', '⊟', 'map', 'collapse'],
      ['Branch styles', '🎨', 'map-style', ''],
      ['Connection styles', '↝', 'connection', ''],
      ['Shapes', '◇', 'picker', 'shapes'],
    ];
  } else {
    choices = [
      ['Sticky note', '▤', 'tool', 'sticky'],
      ['Text', 'T', 'tool', 'text'],
      ['Shapes', '◇', 'picker', 'shapes'],
      ['Flowchart', '↗', 'mode', 'flowchart'],
      ['Mind map', '☷', 'mode', 'mindmap'],
      ['Draw', '✎', 'tool', 'pen'],
      ['Line', '╱', 'tool', 'line'],
      ['Photo / PDF', '▧', 'picker', 'media'],
    ];
  }
  const label =
    section === 'more'
      ? 'All tools'
      : current === 'flowchart'
        ? 'Add a flowchart step'
        : current === 'mindmap' || current === 'outline'
          ? 'Build your mind map'
          : 'Add to canvas';
  const sheet = $('#mobile-tool-sheet');
  sheet.dataset.renderedMode = current;
  sheet.innerHTML = `
    <div class="mw-sheet-head"><h3>${label}</h3><button class="mw-close" type="button" data-mw-close aria-label="Close tools">×</button></div>
    <p>${section === 'more' ? 'Everything else stays here — the canvas is for your work.' : current === 'flowchart' ? 'Select a node first to create an automatically linked next step.' : 'One finger selects or moves · two fingers pan and zoom.'}</p>
    <div class="mw-tool-grid">${choices.map(([name, symbol, action, value]) => makeButton(name, symbol, action, value)).join('')}</div>`;
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

function syncDock() {
  const dock = $('#mobile-workspace-dock');
  const select = $('#mobile-workspace-mode select');
  if (!dock || !select || !state.board) return;
  select.value = mode();
  dock
    .querySelectorAll('[data-mw-tool]')
    .forEach((button) =>
      button.setAttribute('aria-pressed', String(state.tool === button.dataset.mwTool)),
    );
  const sheet = $('#mobile-tool-sheet');
  // Preserve drawer focus/scroll during ordinary selection and rendering.
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
}
function choose(action, value) {
  closeSheet();
  if (action === 'flow') addFlowStep(value);
  else if (action === 'connect') startFlowLink();
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
    else toast('Select a topic first');
  } else if (action === 'mode') $('#mindmap-toolbar [data-mm-mode="' + value + '"]')?.click();
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
  dock.innerHTML = `<button type="button" data-mw-action="add" aria-expanded="false" aria-controls="mobile-tool-sheet"><span class="mwd-icon">＋</span>Add</button>
    <button type="button" data-mw-action="connect"><span class="mwd-icon">↗</span>Link</button>
    <button type="button" data-mw-action="more" aria-expanded="false" aria-controls="mobile-tool-sheet"><span class="mwd-icon">☷</span>Tools</button>`;
  const status = document.createElement('div');
  status.id = 'mobile-tool-active';
  status.hidden = true;
  status.setAttribute('role', 'status');
  status.innerHTML =
    '<span data-mw-active-name></span><button type="button" data-mw-finish>Done</button>';
  const sheet = document.createElement('section');
  sheet.id = 'mobile-tool-sheet';
  sheet.hidden = true;
  sheet.setAttribute('aria-label', 'Mobile tools and shapes');
  document.body.append(header, dock, sheet, status);
  status.addEventListener('click', (event) => {
    if (event.target.closest('[data-mw-finish]')) {
      setTool('select');
      syncDock();
    }
  });
  header.querySelector('select').addEventListener('change', (event) => {
    closeSheet();
    $('#mindmap-toolbar [data-mm-mode="' + event.target.value + '"]')?.click();
    syncDock();
  });
  dock.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.mwTool) {
      closeSheet();
      setTool(button.dataset.mwTool);
    } else if (button.dataset.mwAction === 'connect') {
      closeSheet();
      startFlowLink();
    } else if (button.dataset.mwAction) showSheet(button.dataset.mwAction);
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
  });
  syncDock();
}
