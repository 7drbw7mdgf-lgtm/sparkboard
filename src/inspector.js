import { shapeNames, svgIcon } from './icons.js';
import { state } from './state.js';
import { $, M, colors, esc } from './core.js';
import { selectedNodes } from './selection.js';
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
            : '1 item'
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
  if (!multi && n.type === 'connector') {
    const route = n.route || 'straight';
    $('#inspector-body').innerHTML =
      `<div class="inspector-section"><label class="field-label">CONNECTOR <span>Line & label</span></label><label class="wide-field">Label<input type="text" maxlength="160" placeholder="Add a connector label…" value="${esc(n.text || '')}" data-prop="text" aria-label="Connector label" ${disabled}></label><div class="segmented">${[
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
        )}</div><div class="form-row"><label>Line color<input type="color" aria-label="Line color" data-prop="stroke" value="${n.color || '#86917b'}" ${disabled}></label></div><label class="wide-field">Stroke width<input type="range" min="1" max="10" step="1" data-prop="strokeWidth" aria-label="Stroke width" value="${n.strokeWidth ?? 2}" ${disabled}></label></div>`;
    return;
  }
  const reshapeSection =
    !multi && (M.shapes.includes(n.type) || n.type === 'path')
      ? `<div class="inspector-section"><label class="field-label">VECTOR POINTS <span>Illustrator reshape</span></label><div class="form-row"><button class="action-button ${state.reshapeId === n.id ? 'active' : ''}" data-command="reshape" ${disabled}>${state.reshapeId === n.id ? '✓ Done reshaping' : '◇ Reshape points'}</button>${M.shapes.includes(n.type) ? `<button class="action-button" data-command="reset-vertices" ${Array.isArray(n.vertices) && !locked ? '' : 'disabled'}>Reset shape</button>` : ''}</div><p class="panel-footnote">Drag anchor points to reshape. Click midpoints to add points, or Option-click a point to remove it.</p></div>`
      : '';
  $('#inspector-body').innerHTML =
    `<div class="inspector-section"><label class="field-label">${multi ? 'SELECTION' : 'TEXT & STYLE'} <span>${multi ? ns.length + ' items' : shapeNames[n.type] || n.type}</span></label><div class="form-row"><label>Font size<input type="number" min="8" max="144" value="${n.fontSize || 17}" data-prop="fontSize" aria-label="Font size" ${disabled}></label><label>Rotation<input type="number" min="-360" max="360" value="${n.rotation || 0}" data-prop="rotation" aria-label="Rotation" ${disabled}></label></div><div class="segmented"><button data-command="bold" class="${n.fontWeight === 700 ? 'active' : ''}" title="Bold" ${disabled}><b>B</b></button>${['left', 'center', 'right'].map((a) => `<button data-align-text="${a}" title="Text align ${a}" class="${(n.align || 'center') === a ? 'active' : ''}" ${disabled}>${a === 'left' ? '☰' : a === 'center' ? '≡' : '☷'}</button>`).join('')}</div><div class="form-row"><label>Text<input type="color" aria-label="Text color" data-prop="textColor" value="${n.textColor || '#3c4234'}" ${disabled}></label><label>Border / ink<input type="color" aria-label="Border color" data-prop="stroke" value="${n.stroke || '#a8b39c'}" ${disabled}></label></div><label class="wide-field">Stroke width<input type="range" min="0" max="12" step="1" data-prop="strokeWidth" aria-label="Stroke width" value="${n.strokeWidth ?? 2}" ${disabled}></label></div>${reshapeSection}<div class="inspector-section"><label class="field-label">ARRANGE</label><div class="form-row"><button class="action-button" data-command="front" ${disabled}>↑ To front</button><button class="action-button" data-command="back" ${disabled}>↓ To back</button></div><div class="form-row"><button class="action-button" data-command="group" ${multi && !locked ? '' : 'disabled'}>⧉ Group</button><button class="action-button" data-command="ungroup" ${ns.some((n) => n.group) && !locked ? '' : 'disabled'}>Ungroup</button></div><button class="action-button full" data-command="lock">${locked ? 'Unlock selection' : 'Lock selection'}</button></div><div class="inspector-section"><label class="field-label">ALIGN & DISTRIBUTE</label><div class="align-grid">${['left', 'center', 'right', 'top', 'middle', 'bottom'].map((a) => `<button data-align="${a}" title="Align ${a}" ${multi && !locked ? '' : 'disabled'}>${a}</button>`).join('')}</div><div class="form-row"><button class="action-button" data-distribute="x" ${ns.length >= 3 && !locked ? '' : 'disabled'}>↔ Space</button><button class="action-button" data-distribute="y" ${ns.length >= 3 && !locked ? '' : 'disabled'}>↕ Space</button></div></div><p class="panel-footnote">Shift-click to select more. Drag empty canvas to select an area.</p>`;
}
