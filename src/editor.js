import { embedDialog } from './embeds.js';
import { modal } from './dialogs.js';
import { save, scheduleSave } from './boards.js';
import { $, esc, M } from './core.js';
import { render, selectVisual } from './rendering.js';
import { commit, snapshot } from './history.js';
import { linkDialog } from './links.js';
import { state } from './state.js';
export function startEdit(id) {
  if (state.editing?.id === id) return;
  finishEdit();
  const n = state.board.objects.find((n) => n.id === id);
  if (!n || n.locked || ['path', 'image', 'file'].includes(n.type)) return;
  if (n.type === 'connector' || n.type === 'line') {
    const route = n.route || 'straight',
      lineStyle = n.lineStyle || 'solid',
      startArrow = n.startArrow || 'none',
      endArrow = n.endArrow || (n.type === 'connector' ? 'arrow' : 'none');
    modal(
      `Format this ${n.type}.`,
      `<form id="connector-form" class="modal-form"><label>Label <span class="optional">(optional)</span><input id="connector-label-input" maxlength="160" placeholder="e.g. leads to, depends on, next step" value="${esc(n.text || '')}" autofocus></label><div class="form-row"><label>Line type<select id="connector-route-select"><option value="straight" ${route === 'straight' ? 'selected' : ''}>Straight</option><option value="curved" ${route === 'curved' ? 'selected' : ''}>Curved</option><option value="elbow" ${route === 'elbow' ? 'selected' : ''}>Elbow</option></select></label><label>Stroke style<select id="connector-style-select"><option value="solid" ${lineStyle === 'solid' ? 'selected' : ''}>Solid</option><option value="dashed" ${lineStyle === 'dashed' ? 'selected' : ''}>Dashed</option><option value="dotted" ${lineStyle === 'dotted' ? 'selected' : ''}>Dotted</option></select></label></div><div class="form-row"><label>Start cap<select id="connector-start-arrow"><option value="none" ${startArrow === 'none' ? 'selected' : ''}>None</option><option value="arrow" ${startArrow === 'arrow' ? 'selected' : ''}>Open arrow</option><option value="filled" ${startArrow === 'filled' ? 'selected' : ''}>Filled arrow</option><option value="circle" ${startArrow === 'circle' ? 'selected' : ''}>Circle</option><option value="diamond" ${startArrow === 'diamond' ? 'selected' : ''}>Diamond</option></select></label><label>End cap<select id="connector-end-arrow"><option value="none" ${endArrow === 'none' ? 'selected' : ''}>None</option><option value="arrow" ${endArrow === 'arrow' ? 'selected' : ''}>Open arrow</option><option value="filled" ${endArrow === 'filled' ? 'selected' : ''}>Filled arrow</option><option value="circle" ${endArrow === 'circle' ? 'selected' : ''}>Circle</option><option value="diamond" ${endArrow === 'diamond' ? 'selected' : ''}>Diamond</option></select></label></div><button class="primary" type="submit">Save format</button></form>`,
      'FORMAT',
    );
    $('#connector-form').onsubmit = (e) => {
      e.preventDefault();
      commit(() => {
        const text = $('#connector-label-input').value.trim();
        if (text) n.text = text;
        else delete n.text;
        M.setLineRoute(n, $('#connector-route-select').value);
        n.lineStyle = $('#connector-style-select').value;
        n.startArrow = $('#connector-start-arrow').value;
        n.endArrow = $('#connector-end-arrow').value;
      });
      render();
      $('#dialog').close();
    };
    $('#connector-label-input').select();
    return;
  }
  if (n.type === 'embed') {
    embedDialog(n);
    return;
  }
  if (n.type === 'link') {
    linkDialog(n);
    return;
  }
  snapshot();
  state.reshapeId = null;
  state.selected = new Set([id]);
  selectVisual();
  const el = $(`#objects [data-id="${id}"]`),
    text = el.querySelector('.object-text');
  if (!text) return;
  el.querySelectorAll('.resize, .rotate-handle, .vertex-handle, .edge-handle').forEach((h) =>
    h.remove(),
  );
  text.contentEditable = 'plaintext-only';
  el.classList.add('editing');
  state.editing = {
    id,
    el,
    text,
  };
  text.focus();
  const r = document.createRange();
  r.selectNodeContents(text);
  const selection = getSelection();
  selection.removeAllRanges();
  selection.addRange(r);
  text.addEventListener('input', () => {
    n.text = text.innerText;
    scheduleSave();
  });
  text.addEventListener('blur', () => finishEdit(), {
    once: true,
  });
}
export function finishEdit() {
  if (!state.editing) return;
  const current = state.editing;
  state.editing = null;
  const n = state.board?.objects.find((n) => n.id === current.id);
  if (n) n.text = current.text.innerText;
  current.text.contentEditable = 'false';
  current.el.classList.remove('editing');
  selectVisual();
  save();
}
export function activeEditor() {
  const el = document.activeElement;
  if (!el) return state.editing;
  if (el.matches('textarea,[contenteditable="plaintext-only"]')) return true;
  if (el.tagName === 'INPUT') {
    const type = (el.type || 'text').toLowerCase();
    return !['range', 'color', 'checkbox', 'radio', 'file', 'button', 'submit', 'reset'].includes(
      type,
    );
  }
  return state.editing;
}
