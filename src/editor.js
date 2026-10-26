import { save, scheduleSave } from './boards.js';
import { $ } from './core.js';
import { selectVisual } from './rendering.js';
import { snapshot } from './history.js';
import { linkDialog } from './links.js';
import { state } from './state.js';
export function startEdit(id) {
  if (state.editing?.id === id) return;
  finishEdit();
  const n = state.board.objects.find((n) => n.id === id);
  if (!n || n.locked || ['path', 'connector', 'image', 'file'].includes(n.type)) return;
  if (n.type === 'link') {
    linkDialog(n);
    return;
  }
  snapshot();
  state.selected = new Set([id]);
  selectVisual();
  const el = $(`#objects [data-id="${id}"]`),
    text = el.querySelector('.object-text');
  if (!text) return;
  el.querySelector('.resize')?.remove();
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
