import { embedDialog } from './embeds.js';
import { modal } from './dialogs.js';
import { save, scheduleSave } from './boards.js';
import { $, esc } from './core.js';
import { render, selectVisual } from './rendering.js';
import { commit, snapshot } from './history.js';
import { linkDialog } from './links.js';
import { state } from './state.js';
export function startEdit(id) {
  if (state.editing?.id === id) return;
  finishEdit();
  const n = state.board.objects.find((n) => n.id === id);
  if (!n || n.locked || ['path', 'image', 'file'].includes(n.type)) return;
  if (n.type === 'connector') {
    const route = n.route || 'straight';
    modal(
      'Label or style this connector.',
      `<form id="connector-form" class="modal-form"><label>Connector label <span class="optional">(optional)</span><input id="connector-label-input" maxlength="160" placeholder="e.g. leads to, depends on, next step" value="${esc(n.text || '')}" autofocus></label><label>Routing style<select id="connector-route-select"><option value="straight" ${route === 'straight' ? 'selected' : ''}>Straight line</option><option value="curved" ${route === 'curved' ? 'selected' : ''}>Curved Bezier</option><option value="elbow" ${route === 'elbow' ? 'selected' : ''}>Orthogonal elbow</option></select></label><button class="primary" type="submit">Save connector</button></form>`,
      'CONNECTOR',
    );
    $('#connector-form').onsubmit = (e) => {
      e.preventDefault();
      commit(() => {
        const text = $('#connector-label-input').value.trim();
        if (text) n.text = text;
        else delete n.text;
        n.route = $('#connector-route-select').value;
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
  return (
    document.activeElement?.matches('input,textarea,select,[contenteditable="plaintext-only"]') ||
    state.editing
  );
}
