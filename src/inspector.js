import { shapeNames, svgIcon } from './icons.js';
import { state } from './state.js';
import { $, M, colors, esc } from './core.js';
import { selectedNodes } from './selection.js';

const arrowOptions = [
  ['none', 'None'],
  ['arrow', 'Open arrow'],
  ['filled', 'Filled arrow'],
  ['circle', 'Circle'],
  ['diamond', 'Diamond'],
];

export function properties() {
  const ns = selectedNodes(),
    first = ns[0],
    hasUnlocked = ns.some((n) => !n.locked),
    canText = ns.length === 1 && !['path', 'image', 'file'].includes(first?.type),
    canReshape =
      ns.length === 1 && hasUnlocked && (M.shapes.includes(first?.type) || first?.type === 'path');
  $('#properties').hidden = !ns.length;
  $('#selection-count').textContent =
    ns.length === 1
      ? first.locked
        ? 'Locked item'
        : state.reshapeId === first.id
          ? 'Reshaping points'
          : first.group
            ? 'Grouped item'
            : shapeNames[first.type] || '1 item'
      : `${ns.length} items`;
  $('#swatches').innerHTML = colors
    .map(
      (c) =>
        `<button class="swatch ${first?.color === c ? 'chosen' : ''}" style="background:${c}" data-color="${c}" aria-label="Set color ${c}" ${!hasUnlocked ? 'disabled' : ''}></button>`,
    )
    .join('');
  $('#edit').disabled = !canText || !hasUnlocked;
  const reshapeBtn = $('#reshape');
  if (reshapeBtn) {
    reshapeBtn.hidden = !canReshape;
    reshapeBtn.innerHTML = svgIcon('reshape');
    const active = state.reshapeId === first?.id;
    reshapeBtn.classList.toggle('active', active);
    reshapeBtn.setAttribute('aria-pressed', String(active));
  }
  $('#duplicate').disabled = !hasUnlocked;
  $('#delete').disabled = !hasUnlocked;
  $('#lock').textContent = ns.length && ns.every((n) => n.locked) ? '▣' : '♙';
  $('#lock').title = ns.every((n) => n.locked) ? 'Unlock selection' : 'Lock selection';
  $('#inspector').hidden = !state.inspectorOpen || !ns.length;
  $('#inspect').setAttribute('aria-expanded', String(state.inspectorOpen && !!ns.length));
  if (state.inspectorOpen && ns.length) renderInspector();
}

export function renderInspector() {
  const ns = selectedNodes(),
    n = ns[0],
    locked = ns.every((n) => n.locked),
    disabled = locked ? 'disabled' : '',
    multi = ns.length > 1;
  const eyebrow = $('#inspector-eyebrow');
  if (eyebrow) {
    eyebrow.textContent = multi
      ? `${ns.length} ITEMS SELECTED`
      : (shapeNames[n.type] || n.type).toUpperCase();
  }
  if (ns.every((item) => ['connector', 'line'].includes(item.type))) {
    const route = n.route || 'straight',
      lineStyle = n.lineStyle || 'solid',
      startArrow = n.startArrow || 'none',
      endArrow = n.endArrow || (n.type === 'connector' ? 'arrow' : 'none');
    $('#inspector-body').innerHTML =
      `<div class="inspector-section"><label class="field-label">LINE TYPE <span>Routing</span></label><div class="segmented">${[
        ['straight', 'Straight'],
        ['curved', 'Curved'],
        ['elbow', 'Elbow'],
      ]
        .map(
          ([k, label]) =>
            `<button data-route="${k}" class="${route === k ? 'active' : ''}" ${disabled}>${label}</button>`,
        )
        .join(
          '',
        )}</div><label class="field-label">STROKE STYLE <span>Pattern</span></label><div class="segmented">${[
        ['solid', 'Solid'],
        ['dashed', 'Dashed'],
        ['dotted', 'Dotted'],
      ]
        .map(
          ([k, label]) =>
            `<button data-line-style="${k}" class="${lineStyle === k ? 'active' : ''}" ${disabled}>${label}</button>`,
        )
        .join(
          '',
        )}</div><div class="form-row"><label>Start cap<select data-prop="startArrow" aria-label="Start arrowhead" ${disabled}>${arrowOptions
        .map(
          ([k, label]) =>
            `<option value="${k}" ${startArrow === k ? 'selected' : ''}>${label}</option>`,
        )
        .join(
          '',
        )}</select></label><label>End cap<select data-prop="endArrow" aria-label="End arrowhead" ${disabled}>${arrowOptions
        .map(
          ([k, label]) =>
            `<option value="${k}" ${endArrow === k ? 'selected' : ''}>${label}</option>`,
        )
        .join(
          '',
        )}</select></label></div><div class="form-row"><label>Color<input type="color" aria-label="Line color" data-prop="stroke" value="${n.color || '#86917b'}" ${disabled}></label><label>Thickness (${n.strokeWidth ?? 2}px)<input type="range" min="1" max="12" step="1" data-prop="strokeWidth" aria-label="Stroke width" value="${n.strokeWidth ?? 2}" ${disabled}></label></div>${!multi ? `<label class="stack-field">Label<input type="text" maxlength="160" placeholder="Add a line label…" value="${esc(n.text || '')}" data-prop="text" aria-label="Connector label" ${disabled}></label>` : ''}</div><div class="inspector-section"><label class="field-label">ORDER</label><div class="form-row"><button class="action-button" data-command="front" ${disabled}>↑ To front</button><button class="action-button" data-command="back" ${disabled}>↓ To back</button><button class="action-button" data-command="lock">${locked ? 'Unlock' : 'Lock'}</button></div></div>`;
    return;
  }
  const shapePicker =
    !multi && M.shapes.includes(n.type)
      ? `<label class="stack-field">Shape<select data-prop="type" aria-label="Shape type" ${disabled}>${M.shapes
          .map(
            (k) =>
              `<option value="${k}" ${n.type === k ? 'selected' : ''}>${shapeNames[k]}</option>`,
          )
          .join('')}</select></label>`
      : '';
  const lineStyle = n.lineStyle || 'solid';
  const reshapeControls =
    !multi && (M.shapes.includes(n.type) || n.type === 'path')
      ? `<div class="form-row"><button class="action-button ${state.reshapeId === n.id ? 'active' : ''}" data-command="reshape" ${disabled}>${state.reshapeId === n.id ? '✓ Done reshaping' : '◇ Reshape points'}</button>${M.shapes.includes(n.type) ? `<button class="action-button" data-command="reset-vertices" ${Array.isArray(n.vertices) && !locked ? '' : 'disabled'}>Reset shape</button>` : ''}</div>`
      : '';
  $('#inspector-body').innerHTML =
    `<div class="inspector-section"><label class="field-label">APPEARANCE <span>${multi ? ns.length + ' items' : shapeNames[n.type] || n.type}</span></label>${shapePicker}<div class="form-row"><label>Font size<input type="number" min="8" max="144" value="${n.fontSize || 17}" data-prop="fontSize" aria-label="Font size" ${disabled}></label><label>Rotation<input type="number" min="-360" max="360" value="${n.rotation || 0}" data-prop="rotation" aria-label="Rotation" ${disabled}></label></div><div class="segmented"><button data-command="bold" class="${n.fontWeight === 700 ? 'active' : ''}" title="Bold" ${disabled}><b>B</b></button>${['left', 'center', 'right'].map((a) => `<button data-align-text="${a}" title="Text align ${a}" class="${(n.align || 'center') === a ? 'active' : ''}" ${disabled}>${a === 'left' ? '☰' : a === 'center' ? '≡' : '☷'}</button>`).join('')}</div><div class="form-row"><label>Text<input type="color" aria-label="Text color" data-prop="textColor" value="${n.textColor || '#3c4234'}" ${disabled}></label><label>Border / ink<input type="color" aria-label="Border color" data-prop="stroke" value="${n.stroke || n.color || '#a8b39c'}" ${disabled}></label></div><div class="segmented">${[
      ['solid', 'Solid'],
      ['dashed', 'Dashed'],
      ['dotted', 'Dotted'],
    ]
      .map(
        ([k, label]) =>
          `<button data-line-style="${k}" class="${lineStyle === k ? 'active' : ''}" ${disabled}>${label}</button>`,
      )
      .join(
        '',
      )}</div><label class="wide-field">Stroke width<input type="range" min="0" max="12" step="1" data-prop="strokeWidth" aria-label="Stroke width" value="${n.strokeWidth ?? 2}" ${disabled}></label>${reshapeControls}</div><div class="inspector-section"><label class="field-label">ORDER & ALIGN</label><div class="form-row"><button class="action-button" data-command="front" ${disabled}>↑ To front</button><button class="action-button" data-command="back" ${disabled}>↓ To back</button></div><div class="form-row"><button class="action-button" data-command="group" ${multi && !locked ? '' : 'disabled'}>⧉ Group</button><button class="action-button" data-command="ungroup" ${ns.some((n) => n.group) && !locked ? '' : 'disabled'}>Ungroup</button><button class="action-button" data-command="lock">${locked ? 'Unlock' : 'Lock'}</button></div><div class="align-grid">${['left', 'center', 'right', 'top', 'middle', 'bottom'].map((a) => `<button data-align="${a}" title="Align ${a}" ${multi && !locked ? '' : 'disabled'}>${a}</button>`).join('')}</div><div class="form-row"><button class="action-button" data-distribute="x" ${ns.length >= 3 && !locked ? '' : 'disabled'}>↔ Space</button><button class="action-button" data-distribute="y" ${ns.length >= 3 && !locked ? '' : 'disabled'}>↕ Space</button></div></div>`;
}
