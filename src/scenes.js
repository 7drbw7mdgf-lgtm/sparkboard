import { applyView } from './viewport.js';
import { finishEdit } from './editor.js';
import { toast } from './notifications.js';
import { commit } from './history.js';
import { modal } from './dialogs.js';
import { $, esc, uid } from './core.js';
import { state } from './state.js';
export function renderScenes() {
  if (!state.board) return;
  $('#scene-list').innerHTML = state.board.scenes.length
    ? state.board.scenes
        .map(
          (s, i) =>
            `<div class="scene-row"><button data-scene="${i}"><span class="scene-number">${String(i + 1).padStart(2, '0')}</span><span><b>${esc(s.name)}</b><small>${Math.round(s.view.z * 100)}% zoom</small></span></button><button data-rename-scene="${i}" title="Rename scene">✎</button><button data-delete-scene="${i}" title="Delete scene">×</button></div>`,
        )
        .join('')
    : '<div class="empty-scenes"><span>▣</span><b>A view worth coming back to.</b><p>Pan and zoom to a part of your board, then save it as a scene.</p></div>';
}
export function toggleScenes() {
  state.scenePanelOpen = !state.scenePanelOpen;
  $('#scenes-panel').hidden = !state.scenePanelOpen;
  if (state.scenePanelOpen) {
    state.inspectorOpen = false;
    $('#inspector').hidden = true;
    renderScenes();
  }
}
export function sceneDialog(index) {
  const existing = index === undefined ? null : state.board.scenes[index];
  modal(
    existing ? 'Rename scene' : 'Save this view',
    `<form id="scene-form" class="modal-form"><label>Scene name<input id="scene-name" required maxlength="100" value="${esc(existing?.name || 'Scene ' + (state.board.scenes.length + 1))}" autofocus></label><button class="primary" type="submit">${existing ? 'Save name' : 'Save scene'}</button></form>`,
    'SCENES',
  );
  $('#scene-form').onsubmit = (e) => {
    e.preventDefault();
    const name = $('#scene-name').value.trim();
    if (!name) return;
    commit(() => {
      if (existing) existing.name = name;
      else
        state.board.scenes.push({
          id: uid(),
          name,
          view: {
            ...state.view,
          },
        });
    });
    $('#dialog').close();
    toast('Scene saved');
  };
}
export function setupScenes() {
  $('#save-scene').onclick = () => sceneDialog();
  $('#scene-list').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.scene !== undefined) {
      finishEdit();
      state.view = {
        ...state.board.scenes[Number(b.dataset.scene)].view,
      };
      applyView();
    }
    if (b.dataset.deleteScene !== undefined)
      commit(() => state.board.scenes.splice(Number(b.dataset.deleteScene), 1));
    if (b.dataset.renameScene !== undefined) sceneDialog(Number(b.dataset.renameScene));
  };
}
