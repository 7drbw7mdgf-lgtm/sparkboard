import { download } from './exporting.js';
import { focusBounds } from './viewport.js';
import { selectIds } from './selection.js';
import { toast } from './notifications.js';
import { createBoard, openBoard, deleteBoard } from './boards.js';
import { shapeNames } from './icons.js';
import { state } from './state.js';
import { $, $$, M, esc } from './core.js';
import { closeShapes } from './tools.js';
import { finishEdit } from './editor.js';
export function modal(title, body, label = 'YOUR WORKSPACE') {
  finishEdit();
  closeShapes();
  $('#modal-title').textContent = title;
  $('#modal-label').textContent = label;
  $('#modal-body').innerHTML = body;
  $('#dialog').showModal();
}
export function showBoards() {
  modal(
    'Your boards',
    `<input class="search-input" id="boards-search" type="search" placeholder="Search your boards…" aria-label="Search boards"><div id="boards-list">${state.boards.map((b) => `<div class="board-row" data-board-title="${esc(b.title.toLowerCase())}"><button data-board="${b.id}">${esc(b.title) || 'Untitled board'}<small>${b.objectCount} objects · ${b.sceneCount} scenes · On this device</small></button><button data-delete-board="${b.id}" title="Delete board">×</button></div>`).join('')}</div><div class="modal-actions"><button class="primary" data-action="new">＋ New board</button><button class="quiet" data-action="import">↑ Import board</button></div>`,
  );
  $('#boards-search').oninput = (e) =>
    $$('[data-board-title]').forEach(
      (row) => (row.hidden = !row.dataset.boardTitle.includes(e.target.value.toLowerCase())),
    );
}
export function searchBoard() {
  modal(
    'Find a thought.',
    `<input class="search-input" id="find-input" type="search" placeholder="Search text, notes, files and links…" aria-label="Find on board"><div id="search-results"></div>`,
    'FIND ON THIS BOARD',
  );
  const results = () => {
    const term = $('#find-input').value.toLowerCase().trim();
    let ns = state.board.objects
      .filter(
        (n) =>
          n.text &&
          (n.text.toLowerCase().includes(term) || (n.url || '').toLowerCase().includes(term)),
      )
      .slice(0, 40);
    $('#search-results').innerHTML = ns.length
      ? ns
          .map(
            (n) =>
              `<button class="search-result" data-find="${n.id}"><span class="result-dot" style="background:${n.color || '#dce7cc'}"></span><span><b>${esc(n.text.slice(0, 100))}</b><small>${esc(shapeNames[n.type] || n.type)}</small></span><span>↗</span></button>`,
          )
          .join('')
      : '<p class="panel-description">No matching items on this board.</p>';
  };
  $('#find-input').oninput = results;
  results();
  $('#find-input').focus();
}
export function showHelp() {
  modal(
    'A few handy shortcuts',
    Object.entries({
      'Select / Pan': 'V / H',
      'Move around': 'Space + drag',
      'Select multiple': 'Shift-click or drag empty canvas',
      'Select all': '⌘A',
      'Sticky / Text / Link': 'N / T / K',
      'Rectangle / Circle / Frame': 'R / O / F',
      'Line / Connect / Draw / Erase': 'L / C / P / E',
      'Reshape anchor points': 'A',
      'Edit selected item': 'Enter or double-click',
      'Copy / Paste': '⌘C / ⌘V',
      Duplicate: '⌘D',
      'Group / Ungroup': '⌘G / ⌘⇧G',
      'Undo / Redo': '⌘Z / ⌘⇧Z',
      'Nudge selection': 'Arrows · Shift for 10 px',
      'Find on board': '⌘F',
      'Delete selected': 'Delete',
      Zoom: 'Pinch or Ctrl + scroll',
    })
      .map(([a, b]) => `<div class="help-row"><span>${a}</span><kbd>${b}</kbd></div>`)
      .join(''),
    'MAKE YOURSELF AT HOME',
  );
}
export function setupDialogs() {
  $('#modal-body').addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    button.disabled = true;
    try {
      if (button.dataset.template) {
        await createBoard(button.dataset.template);
        $('#dialog').close();
        toast('Your new board is ready');
      }
      if (button.dataset.board) {
        await openBoard(button.dataset.board);
        $('#dialog').close();
      }
      if (
        button.dataset.deleteBoard &&
        confirm('Delete this board? Export a backup first if you want to keep it.')
      ) {
        await deleteBoard(button.dataset.deleteBoard);
        showBoards();
      }
      if (button.dataset.action === 'new') {
        await createBoard();
        $('#dialog').close();
      }
      if (button.dataset.action === 'import') $('#import-file').click();
      if (button.dataset.find) {
        const item = state.board.objects.find((item) => item.id === button.dataset.find);
        $('#dialog').close();
        selectIds([item.id]);
        focusBounds(M.bounds(item, state.board.objects));
      }
      if (button.dataset.export) {
        await download(button.dataset.export);
        $('#dialog').close();
      }
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  });
}
