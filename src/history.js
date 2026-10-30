import { $ } from './core.js';
import { save } from './boards.js';
import { render } from './rendering.js';
import { finishEdit } from './editor.js';
import { state } from './state.js';
// Copy mutable geometry without repeatedly encoding large attachment data URLs.
// Strings are immutable, so a media src can safely be shared by undo snapshots.
function copyObject(item) {
  const { src, ...fields } = item;
  const copy = structuredClone(fields);
  if (src !== undefined) copy.src = src;
  return copy;
}
export const boardState = () => ({
  objects: state.board.objects.map(copyObject),
  scenes: structuredClone(state.board.scenes || []),
});
export function snapshot() {
  state.history.push(boardState());
  if (state.history.length > 60) state.history.shift();
  state.future = [];
  updateHistory();
}
export function undo() {
  finishEdit();
  if (!state.history.length) return;
  state.future.push(boardState());
  Object.assign(state.board, state.history.pop());
  state.selected.clear();
  render();
  save();
}
export function redo() {
  finishEdit();
  if (!state.future.length) return;
  state.history.push(boardState());
  Object.assign(state.board, state.future.pop());
  state.selected.clear();
  render();
  save();
}
export function updateHistory() {
  $('#undo').disabled = !state.history.length;
  $('#redo').disabled = !state.future.length;
}
export function commit(fn) {
  finishEdit();
  snapshot();
  fn();
  render();
  save();
}
