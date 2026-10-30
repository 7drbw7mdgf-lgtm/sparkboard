import { finishEdit } from './editor.js';
import { state } from './state.js';
import { openBoard, flushSaves, scheduleSave, forgetBoardSession } from './boards.js';
import { $, esc } from './core.js';
import { toast } from './notifications.js';
import { modal, showBoards } from './dialogs.js';
import { closeTab, restoreTabs } from './tab-model.js';
import { svgIcon } from './icons.js';

const storageKey = 'sparkboard.open-tabs';
let order;
let closing = false;
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(order));
  } catch {
    /* Tabs still work for this session. */
  }
}
function restore() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey));
  } catch {
    /* Start with the active board. */
  }
  return restoreTabs(
    saved,
    state.boards.map((board) => board.id),
    state.board?.id,
  );
}

async function renameBoard(id) {
  try {
    if (id !== state.board?.id) await openBoard(id);
    modal(
      'Give this board a name.',
      `<form id="rename-board" class="modal-form"><label>Board name<input id="rename-title" required maxlength="200" value="${esc(state.board.title)}" autofocus></label><button class="primary" type="submit">Save name</button></form>`,
      'RENAME BOARD',
    );
    $('#rename-board').onsubmit = (event) => {
      event.preventDefault();
      state.board.title = $('#rename-title').value.trim() || 'Untitled board';
      scheduleSave();
      renderBoardTabs();
      $('#dialog').close();
    };
    $('#rename-title').select();
  } catch (error) {
    toast(error.message);
  }
}

async function closeBoardTab(id) {
  if (closing) return;
  closing = true;
  const before = [...order];
  try {
    finishEdit();
    await flushSaves();
    const next = closeTab(order, id, state.board?.id);
    order = next.ids;
    if (id === state.board?.id) {
      if (next.active) await openBoard(next.active);
      else {
        document.body.classList.add('workspace-empty');
        $('#empty-workspace').hidden = false;
        state.selected.clear();
        state.history = [];
        state.future = [];
        showBoards();
      }
    }
    forgetBoardSession(id);
    persist();
    renderBoardTabs({ reveal: true });
  } catch (error) {
    order = before;
    renderBoardTabs();
    toast(error.message);
  } finally {
    closing = false;
  }
}

/** Only opened boards appear here; the library holds every saved board. */
export function renderBoardTabs({ reveal = false, openActive = false } = {}) {
  const nav = $('#board-tabs');
  const firstRender = order === undefined;
  order ??= restore();
  const restoreEmpty = firstRender && order.length === 0;
  if (restoreEmpty) {
    document.body.classList.add('workspace-empty');
    $('#empty-workspace').hidden = false;
  }
  const available = new Map(state.boards.map((board) => [board.id, board]));
  order = order.filter((id) => available.has(id));
  if (openActive && !restoreEmpty && state.board && !order.includes(state.board.id))
    order.push(state.board.id);
  persist();
  for (const tab of [...nav.children]) if (!order.includes(tab.dataset.board)) tab.remove();
  for (const id of order) {
    const board = available.get(id);
    let tab = [...nav.children].find((item) => item.dataset.board === id);
    if (!tab) {
      tab = document.createElement('div');
      tab.className = 'board-tab';
      tab.dataset.board = id;
      tab.innerHTML = `<button class="tab-open"></button><button class="tab-close">${svgIcon('close')}</button>`;
      const open = tab.querySelector('.tab-open');
      open.onclick = () => {
        if (state.board?.id !== id || document.body.classList.contains('workspace-empty'))
          openBoard(id).catch((error) => toast(error.message));
      };
      open.ondblclick = () => renameBoard(id);
      open.onkeydown = (event) => {
        if (event.key === 'F2') {
          event.preventDefault();
          renameBoard(id);
        }
      };
      tab.querySelector('.tab-close').onclick = () => closeBoardTab(id);
      nav.append(tab);
    }
    const active = id === state.board?.id;
    tab.classList.toggle('is-active', active);
    const open = tab.querySelector('.tab-open');
    open.textContent = board.title || 'Untitled board';
    open.title = `${board.title || 'Untitled board'} · Double-click to rename`;
    open.setAttribute('aria-current', active ? 'page' : 'false');
    const close = tab.querySelector('.tab-close');
    close.setAttribute('aria-label', `Close ${board.title || 'Untitled board'} tab`);
    close.title = 'Close tab · Board stays saved';
  }
  if (reveal)
    requestAnimationFrame(() =>
      nav
        .querySelector('[aria-current="page"]')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
    );
}
