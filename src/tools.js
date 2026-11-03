import { embedDialog } from './embeds.js';
import { state } from './state.js';
import { finishEdit } from './editor.js';
import { linkDialog } from './links.js';
import { modal } from './dialogs.js';
import { properties } from './inspector.js';
import { labels, shapeNames, svgIcon, shapeCategory, shapeCategories } from './icons.js';
import { $, $$, M } from './core.js';
import { isCompactEditor, toolAvailableOnLayout } from './mobile-editor-policy.js';
const categoryButtons = (scope) =>
  ['All', ...Object.keys(shapeCategories)]
    .map(
      (category) =>
        '<button type="button" data-shape-category="' +
        category +
        '"' +
        (category === 'All' ? ' class="active" aria-pressed="true"' : ' aria-pressed="false"') +
        '>' +
        category +
        '</button>',
    )
    .join('');

const shapeButton = (kind, mobile) => {
  const name = shapeNames[kind];
  const identity = mobile ? `type="button" data-mobile-shape="${kind}"` : `data-tool="${kind}"`;
  return `<button ${identity} aria-label="${name}" data-shape-name="${name.toLowerCase()}" data-category="${shapeCategory(kind)}">${svgIcon(kind)}<span>${name}</span></button>`;
};

const shapeLibrary = (mobile) =>
  Object.entries(shapeCategories)
    .map(
      ([category, kinds]) =>
        `<section class="shape-group" data-shape-group="${category}"><h4 class="shape-group-title">${category}</h4><div class="shape-group-grid">${kinds.map((kind) => shapeButton(kind, mobile)).join('')}</div></section>`,
    )
    .join('');

const hideEmptyShapeGroups = (root) => {
  root.querySelectorAll('.shape-group').forEach((group) => {
    group.hidden = ![...group.querySelectorAll('button')].some((button) => !button.hidden);
  });
};

function showMobileShapePicker() {
  modal(
    'Choose a shape',
    `<div class="mobile-shapes">
      <label class="shape-search-label" for="mobile-shape-search">Find a shape</label>
      <input id="mobile-shape-search" type="search" placeholder="Search shapes" aria-label="Search shapes" />
      <div id="mobile-shape-categories" class="shape-categories" role="group" aria-label="Shape categories">${categoryButtons('mobile')}</div>
      <div id="mobile-shape-grid" class="mobile-shape-grid" aria-label="Shape library">
        ${shapeLibrary(true)}
      </div>
      <p id="mobile-shape-empty" class="shape-empty" hidden>No shapes match.</p>
    </div>`,
    'VECTOR SHAPES',
  );
  const picker = $('#mobile-shape-categories');
  const filter = () => {
    const search = $('#mobile-shape-search').value.trim().toLowerCase();
    const selected = picker.querySelector('[aria-pressed="true"]')?.dataset.shapeCategory || 'All';
    let count = 0;
    $('#mobile-shape-grid')
      .querySelectorAll('[data-mobile-shape]')
      .forEach((button) => {
        button.hidden =
          !button.dataset.shapeName.includes(search) ||
          (selected !== 'All' && button.dataset.category !== selected);
        if (!button.hidden) count++;
      });
    hideEmptyShapeGroups($('#mobile-shape-grid'));
    $('#mobile-shape-empty').hidden = count > 0;
  };
  picker.onclick = (event) => {
    const button = event.target.closest('[data-shape-category]');
    if (!button) return;
    picker.querySelectorAll('[data-shape-category]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    filter();
  };
  $('#mobile-shape-search').oninput = filter;
  $('#mobile-shape-grid').onclick = (event) => {
    const button = event.target.closest('[data-mobile-shape]');
    if (!button) return;
    $('#dialog').close();
    // Mobile shape selection creates an object immediately. No invisible second tap.
    document.dispatchEvent(
      new CustomEvent('sparkboard:mobile-shape', {
        detail: { type: button.dataset.mobileShape },
      }),
    );
  };
}

export function setupTools() {
  $('#tools').innerHTML = [
    'select',
    'hand',
    'sticky',
    'text',
    'shapes',
    'line',
    'pen',
    'eraser',
    'media',
    'embed',
    'link',
  ]
    .map(
      (k, i) =>
        (k === 'sticky' || k === 'media' ? '<div class="tool-sep"></div>' : '') +
        (k === 'shapes'
          ? `<div class="shape-picker"><button id="shape-toggle" data-label="Shapes" aria-label="Shapes" aria-expanded="false" aria-controls="shape-menu">${svgIcon('shape')}<span class="expand-caret" aria-hidden="true">›</span></button><div id="shape-menu" role="group" aria-label="Choose a shape" hidden><div class="shape-menu-head"><span class="shape-menu-title">SHAPE LIBRARY</span></div><input id="shape-search" type="search" placeholder="Search shapes" aria-label="Search shapes"><div id="shape-categories" class="shape-categories" role="group" aria-label="Shape categories">${categoryButtons('desktop')}</div><div id="shape-grid">${shapeLibrary(false)}</div><p id="shape-empty" hidden>No matching shapes.</p><p class="shape-tip">Choose a shape, then click the canvas.</p></div></div>`
          : `<button data-tool="${k}" data-label="${labels[k]}" aria-label="${labels[k]}">${svgIcon(k)}</button>`),
    )
    .join('');
  const toolbar = $('#tools');
  toolbar.insertAdjacentHTML(
    'beforeend',
    '<div class="tool-sep" aria-hidden="true"></div><button type="button" id="swimlane-tool" data-label="Swimlane" aria-label="Add a swimlane" title="Add a swimlane">' +
      svgIcon('swimlane') +
      '</button><div class="tool-sep" aria-hidden="true"></div><button type="button" id="tool-dock-toggle" data-label="Move toolbar to bottom" aria-label="Move toolbar to bottom" title="Move toolbar to bottom">⇆</button>',
  );
  const dockButton = $('#tool-dock-toggle');
  $('#swimlane-tool').onclick = () => document.dispatchEvent(new Event('sparkboard:add-swimlane'));
  const setDock = (dock) => {
    const bottom = dock === 'bottom';
    toolbar.dataset.dock = bottom ? 'bottom' : 'left';
    const label = bottom ? 'Move toolbar to left' : 'Move toolbar to bottom';
    dockButton.setAttribute('aria-label', label);
    dockButton.dataset.label = label;
    dockButton.title = label;
    dockButton.setAttribute('aria-pressed', String(bottom));
    try {
      window.localStorage.setItem('sparkboard:toolbar-dock', toolbar.dataset.dock);
    } catch {}
  };
  let previousDock = 'left';
  try {
    previousDock = window.localStorage.getItem('sparkboard:toolbar-dock') || 'left';
  } catch {}
  setDock(previousDock);
  $('#tools').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'tool-dock-toggle') {
      setDock(toolbar.dataset.dock === 'bottom' ? 'left' : 'bottom');
      return;
    }
    if (b.id === 'shape-toggle') {
      if (matchMedia('(max-width: 650px), (max-height: 500px) and (pointer: coarse)').matches) {
        showMobileShapePicker();
        return;
      }
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
    if (t) {
      setTool(t);
      b.blur();
    }
  };
  const filterDesktopShapes = () => {
    const term = $('#shape-search').value.toLowerCase().trim();
    const active = $('#shape-categories [aria-pressed="true"]')?.dataset.shapeCategory || 'All';
    let visible = 0;
    $$('#shape-grid button').forEach((button) => {
      button.hidden =
        !button.dataset.shapeName.includes(term) ||
        (active !== 'All' && button.dataset.category !== active);
      if (!button.hidden) visible++;
    });
    hideEmptyShapeGroups($('#shape-grid'));
    $('#shape-empty').hidden = visible > 0;
  };
  $('#shape-search').oninput = filterDesktopShapes;
  $('#shape-categories').onclick = (event) => {
    const button = event.target.closest('[data-shape-category]');
    if (!button) return;
    $('#shape-categories')
      .querySelectorAll('button')
      .forEach((item) => {
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
    filterDesktopShapes();
  };
}
export function closeShapes() {
  $('#shape-menu').hidden = true;
  $('#shape-toggle').setAttribute('aria-expanded', 'false');
}
export function setTool(t) {
  const compact = isCompactEditor();
  if (!toolAvailableOnLayout(t, compact)) return;
  finishEdit();
  if (compact && t !== 'select') state.inspectorOpen = false;
  state.tool = t;
  state.connectorStart = null;
  state.connectorDraft = null;
  if (t !== 'select') state.reshapeId = null;
  $('#canvas').dataset.tool = t;
  $$('#tools [data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
  $('#shape-toggle').classList.toggle('active', M.shapes.includes(t));
  closeShapes();
  $('#drawing-options').hidden = t !== 'pen';
  const lineOpts = $('#line-options');
  if (lineOpts) {
    // On a phone, Line draws immediately. Formatting is available after selection.
    lineOpts.hidden = compact || (t !== 'line' && t !== 'connector');
    const label = $('#line-options-label');
    if (label) label.textContent = t === 'connector' ? 'CONNECTOR TOOL' : 'LINE TOOL';
  }
  if (['pen', 'line', 'connector'].includes(t)) {
    state.scenePanelOpen = false;
    const scenesPanel = $('#scenes-panel');
    if (scenesPanel) scenesPanel.hidden = true;
  }
  properties();
  $('#canvas').style.cursor =
    state.space || t === 'hand' ? 'grab' : t === 'select' ? 'default' : 'crosshair';
  document.dispatchEvent(new Event('sparkboard:tool'));
  $('#hint').textContent =
    t === 'line'
      ? compact
        ? 'Drag anywhere to draw a line; select it to format later'
        : 'Drag on the canvas to draw a line · Format options on the right'
      : t === 'connector'
        ? 'Connect two objects, or drag into empty space to drop a linked node'
        : t === 'pen'
          ? 'Draw smooth strokes on the canvas · Pen format on the right'
          : t === 'eraser'
            ? 'Drag across drawn strokes to erase them'
            : t === 'select'
              ? 'Shift-click to multi-select · Drag ports ● to connect · Space + drag to pan'
              : t === 'hand'
                ? 'Drag to move around your board'
                : `Click or drag to add ${shapeNames[t] || t}`;
}
