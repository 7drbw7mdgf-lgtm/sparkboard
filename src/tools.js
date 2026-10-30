import { embedDialog } from './embeds.js';
import { state } from './state.js';
import { finishEdit } from './editor.js';
import { linkDialog } from './links.js';
import { labels, shapeNames, svgIcon } from './icons.js';
import { $, $$, M } from './core.js';
export function setupTools() {
  $('#tools').innerHTML = [
    'select',
    'hand',
    'sticky',
    'text',
    'shapes',
    'connector',
    'pen',
    'media',
    'embed',
    'link',
  ]
    .map(
      (k, i) =>
        (i === 2 || i === 7 ? '<div class="tool-sep"></div>' : '') +
        (k === 'shapes'
          ? `<div class="shape-picker"><button id="shape-toggle" data-label="Shapes" aria-label="Shapes" aria-expanded="false" aria-controls="shape-menu">${svgIcon('shape')}<span class="expand-caret" aria-hidden="true">›</span></button><div id="shape-menu" role="group" aria-label="Choose a shape" hidden><div class="shape-menu-head"><span class="shape-menu-title">SHAPE LIBRARY</span><span>9 shapes</span></div><input id="shape-search" type="search" placeholder="Find a shape…" aria-label="Search shapes"><div id="shape-grid">${M.shapes.map((k) => `<button data-tool="${k}" aria-label="${shapeNames[k]}" data-shape-name="${shapeNames[k].toLowerCase()}">${svgIcon(k)}<span>${shapeNames[k]}</span></button>`).join('')}</div><p id="shape-empty" hidden>No matching shapes.</p><p class="shape-tip">Choose a shape, then click the canvas.</p></div></div>`
          : `<button data-tool="${k}" data-label="${labels[k]}" aria-label="${labels[k]}">${svgIcon(k)}</button>`),
    )
    .join('');
  $('#tools').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'shape-toggle') {
      let open = $('#shape-menu').hidden;
      $('#shape-menu').hidden = !open;
      b.setAttribute('aria-expanded', String(open));
      if (open) $('#shape-search').focus();
      return;
    }
    let t = b.dataset.tool;
    if (t === 'embed') {
      embedDialog();
      return;
    }
    if (t === 'media') {
      $('#media-file').accept = 'image/png,image/jpeg,image/webp,image/gif,application/pdf';
      $('#media-file').click();
      return;
    }
    if (t === 'link') {
      linkDialog();
      return;
    }
    if (t) setTool(t);
  };
  $('#shape-search').oninput = (e) => {
    let visible = 0;
    $$('#shape-grid button').forEach((b) => {
      b.hidden = !b.dataset.shapeName.includes(e.target.value.toLowerCase());
      if (!b.hidden) visible++;
    });
    $('#shape-empty').hidden = visible > 0;
  };
}
export function closeShapes() {
  $('#shape-menu').hidden = true;
  $('#shape-toggle').setAttribute('aria-expanded', 'false');
}
export function setTool(t) {
  finishEdit();
  state.tool = t;
  state.connectorStart = null;
  $$('#tools [data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
  $('#shape-toggle').classList.toggle('active', M.shapes.includes(t));
  closeShapes();
  $('#drawing-options').hidden = t !== 'pen';
  $('#canvas').style.cursor = t === 'hand' ? 'grab' : t === 'select' ? 'default' : 'crosshair';
  $('#hint').textContent =
    t === 'connector'
      ? 'Click two objects to connect them'
      : t === 'pen'
        ? 'Draw on the canvas · Choose your pen above'
        : t === 'select'
          ? 'Shift-click to multi-select · Space + drag to pan'
          : t === 'hand'
            ? 'Drag to move around your board'
            : `Click to add ${shapeNames[t] || t}`;
}
