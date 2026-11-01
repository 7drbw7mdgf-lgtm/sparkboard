import { $ } from './core.js';
import { state } from './state.js';
import { setTool } from './tools.js';
import { addFlowStep, startFlowLink } from './flowchart.js';
import { toast } from './notifications.js';
import { isCompactEditor } from './mobile-editor-policy.js';

const mobileStyle = `
#mobile-workspace-dock,#mobile-workspace-mode,#mobile-tool-sheet{display:none}
@media(max-width:650px),(max-height:500px) and (pointer:coarse){
  body:not(.workspace-empty) #mobile-workspace-dock{display:grid}
  body:not(.workspace-empty) #mobile-workspace-mode{display:flex}
  #tools{display:none!important}
  #mobile-more,#mobile-more-menu{display:none!important}
  #mindmap-toolbar{display:none!important}
  #mobile-workspace-mode{position:fixed;top:calc(124px + env(safe-area-inset-top));left:12px;z-index:19;align-items:center;gap:8px;border:1px solid #d8e1db;background:#fff;box-shadow:0 6px 20px #152d251b;border-radius:13px;min-height:40px;padding:0 11px;font:700 12px/1 Manrope,sans-serif;color:#476354}
  #mobile-workspace-mode select{border:0;outline:0;background:transparent;color:#264c40;font:700 14px/1 Manrope,sans-serif;min-height:40px;padding:0 16px 0 0;font-size:16px}
  #mobile-workspace-dock{position:fixed;bottom:calc(9px + env(safe-area-inset-bottom));left:9px;right:9px;z-index:45;height:68px;padding:7px;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;border:1px solid #d7e0d9;border-radius:20px;background:#fff;box-shadow:0 12px 36px #20382e35;align-items:stretch}
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
  #mobile-selection-actions:not([hidden]){bottom:calc(87px + env(safe-area-inset-bottom))!important;max-width:calc(100vw - 18px)}
  #mobile-selection-actions:not([hidden]) .mobile-actions-inner{box-shadow:0 6px 22px #213a3026}
  .bottom-left,.zoom{bottom:calc(175px + env(safe-area-inset-bottom))!important;scale:.86;transform-origin:bottom left}
  .zoom{transform-origin:bottom right}
  #canvas{bottom:calc(145px + env(safe-area-inset-bottom))!important}
  #mindmap-panel:not([hidden]){top:calc(174px + env(safe-area-inset-top));bottom:calc(92px + env(safe-area-inset-bottom));z-index:35}
  #toast{bottom:calc(178px + env(safe-area-inset-bottom))}
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
  #canvas{bottom:calc(78px + env(safe-area-inset-bottom))!important}
  .bottom-left,.zoom{bottom:calc(80px + env(safe-area-inset-bottom))!important}
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
      ['Erase', '⌫', 'tool', 'eraser'],
      ['Photo / PDF', '▧', 'picker', 'media'],
      ['Embed', '▣', 'picker', 'embed'],
      ['Web link', '↗', 'picker', 'link'],
      ['Find', '⌕', 'header', 'search-board'],
      ['Templates', '▦', 'header', 'templates'],
      ['Export', '⇧', 'header', 'export'],
      ['Scenes', '▤', 'header', 'scenes'],
      ['Fit', '⛶', 'header', 'fit'],
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
  $('#mobile-tool-sheet').innerHTML = `
    <div class="mw-sheet-head"><h3>${label}</h3><button class="mw-close" type="button" data-mw-close aria-label="Close tools">×</button></div>
    <p>${section === 'more' ? 'Everything else stays here — the canvas is for your work.' : current === 'flowchart' ? 'Select a node first to create an automatically linked next step.' : 'Choose an item or tool to continue on your board.'}</p>
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
  if (!$('#mobile-tool-sheet').hidden) sheetContents($('#mobile-tool-sheet').dataset.section);
}
function choose(action, value) {
  closeSheet();
  if (action === 'flow') addFlowStep(value);
  else if (action === 'connect') startFlowLink();
  else if (action === 'tool') setTool(value);
  else if (action === 'picker') {
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
  dock.innerHTML = `<button type="button" data-mw-tool="hand" aria-pressed="false"><span class="mwd-icon">✋</span>Pan</button>
    <button type="button" data-mw-tool="select" aria-pressed="false"><span class="mwd-icon">↖</span>Select</button>
    <button type="button" data-mw-action="add" aria-expanded="false" aria-controls="mobile-tool-sheet"><span class="mwd-icon">＋</span>Add</button>
    <button type="button" data-mw-action="connect"><span class="mwd-icon">↗</span>Link</button>
    <button type="button" data-mw-action="more" aria-expanded="false" aria-controls="mobile-tool-sheet"><span class="mwd-icon">☷</span>Tools</button>`;
  const sheet = document.createElement('section');
  sheet.id = 'mobile-tool-sheet';
  sheet.hidden = true;
  sheet.setAttribute('aria-label', 'Mobile tools and shapes');
  document.body.append(header, dock, sheet);
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
  document.addEventListener('sparkboard:mode', syncDock);
  document.addEventListener('sparkboard:selection', syncDock);
  document.addEventListener('sparkboard:tool', syncDock);
  window.addEventListener('resize', () => {
    if (!isCompactEditor()) closeSheet();
  });
  syncDock();
}
