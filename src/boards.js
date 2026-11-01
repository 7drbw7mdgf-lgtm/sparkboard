import { BoardSessions } from './board-sessions.js';
import { download } from './exporting.js';
import { modal } from './dialogs.js';
import { endPointer } from './canvas.js';
import { renderBoardTabs } from './tabs.js';
import { $, uid } from './core.js';
import { state } from './state.js';
import { BoardRepository, boardSummary } from './storage/repository.js';
import { SaveScheduler } from './storage/save-scheduler.js';
import { finishEdit } from './editor.js';
import { render } from './rendering.js';
import { fit } from './viewport.js';
import { setTool } from './tools.js';
import { isCompactEditor, initialToolForLayout } from './mobile-editor-policy.js';
import { sample } from './templates.js';
import { toast } from './notifications.js';

const sessions = new BoardSessions();
export const forgetBoardSession = (id) => sessions.forget(id);
let conflictShown = false;
let repository;
let saves;
let transition = Promise.resolve();
let cloudSync = null;

/** Cloud code only sees a narrow, revision-protected local board adapter. */
export function connectCloudSync(controller) {
  cloudSync = controller;
}
export function cloudBoardAccess() {
  return {
    list: () => repository.listBoards(),
    load: (id) => repository.loadBoard(id),
    flush: () => flushSaves(),
    isEditing: () => Boolean(state.editing || saves?.dirty),
    async claim(id, owner) {
      const board = await repository.loadBoard(id);
      if (board.cloudOwner && board.cloudOwner !== owner)
        throw Error(
          'This board belongs to a different account. Export it to make a personal copy.',
        );
      if (board.cloudOwner === owner) return;
      board.cloudOwner = owner;
      const saved = await repository.saveBoard(board);
      if (state.board?.id === id) {
        state.board.cloudOwner = owner;
        state.board.revision = saved.revision;
      }
      state.boards = await repository.listBoards();
      renderBoardTabs();
    },
    async import(board) {
      const exists = state.boards.some((item) => item.id === board.id);
      if (exists) await repository.loadBoard(board.id);
      await repository.saveBoard(board);
      state.boards = await repository.listBoards();
      if (state.board?.id === board.id) mountBoard(await repository.loadBoard(board.id));
      else renderBoardTabs();
    },
    async fork(id) {
      const old = await repository.loadBoard(id);
      const copy = {
        ...old,
        id: uid(),
        title: (old.title || 'Board') + ' (conflict copy)',
        updated: Date.now(),
        cloudOwner: cloudSync?.enabled ? cloudSync.userId : old.cloudOwner,
      };
      delete copy.revision;
      delete copy.writer;
      await repository.saveBoard(copy);
      state.boards = await repository.listBoards();
      renderBoardTabs();
      toast('Cloud conflict: both versions were kept as separate boards.');
    },
    async remove(id) {
      await repository.deleteBoard(id);
      sessions.forget(id);
      state.boards = await repository.listBoards();
      if (state.board?.id === id) {
        if (state.boards.length) mountBoard(await repository.loadBoard(state.boards[0].id));
        else
          await insertBoard({
            id: uid(),
            title: 'Untitled board',
            kind: 'blank',
            objects: [],
            scenes: [],
            grid: true,
            snap: false,
            updated: Date.now(),
          });
      } else renderBoardTabs();
    },
  };
}

function reportSaveStatus(status, error) {
  const text = {
    pending: 'Changes waiting to save…',
    saving: 'Saving on this device…',
    saved: '✓ All changes saved on this device',
    error: 'Could not save — export a backup',
  };
  $('#saved').textContent = text[status];
  if (error) toast(error.message);
  if (error?.code === 'BOARD_CONFLICT' && !conflictShown && !$('#dialog').open) {
    conflictShown = true;
    modal(
      'This board changed in another window.',
      '<p>Your edits are still here. Save them as a separate board to keep both versions, or download an editable backup.</p><div class="modal-actions"><button class="primary" id="conflict-copy">Save my edits as a new board</button><button id="conflict-export">Download my backup</button></div>',
      'EDITS PRESERVED',
    );
    $('#conflict-copy').onclick = async () => {
      try {
        await saves.running?.catch(() => {});
        finishEdit();
        const oldId = state.board.id;
        const copy = {
          ...structuredClone(state.board),
          id: uid(),
          title: state.board.title + ' (copy)',
          updated: Date.now(),
        };
        await repository.saveBoard(copy);
        saves.pending.delete(oldId);
        await repository.setActiveBoard(copy.id);
        state.boards = await repository.listBoards();
        mountBoard(await repository.loadBoard(copy.id));
        $('#dialog').close();
        reportSaveStatus('saved');
        toast('Your edits were saved as a separate board.');
      } catch (error) {
        toast(error.message);
      }
    };
    $('#conflict-export').onclick = () => download('json');
  }
}

function updateSummary(board) {
  const summary = boardSummary(board);
  state.boards = [summary, ...state.boards.filter((item) => item.id !== board.id)];
}

function markChanged() {
  if (!state.board || !saves) return false;
  state.board.updated = Math.max(Date.now(), (state.board.updated || 0) + 1);
  updateSummary(state.board);
  saves.schedule(state.board);
  return true;
}

/** Typing only marks the active board; no serialization or IDB write happens yet. */
export function scheduleSave() {
  markChanged();
}

/** Structural actions save immediately; typing uses scheduleSave instead. */
export function save() {
  if (!markChanged()) return Promise.resolve();
  // Event handlers may fire-and-forget. The scheduler retains errors for flushSaves.
  return saves.flush().catch(() => {});
}

export async function flushSaves() {
  if (!saves) return;
  await saves.flush(); // Unlike save(), the explicit barrier propagates failures.
}

function mountBoard(board) {
  sessions.remember(state);
  const session = sessions.restore(board);
  conflictShown = false;
  state.board = board;
  state.board.scenes ??= [];
  state.board.grid ??= true;
  state.board.snap ??= false;
  state.history = session?.history || [];
  state.future = session?.future || [];
  state.selected.clear();
  state.reshapeId = null;
  state.connectorStart = null;
  state.connectorDraft = null;
  state.view = session ? { ...session.view } : { x: 0, y: 0, z: 1 };
  state.scenePanelOpen = false;
  $('#scenes-panel').hidden = true;
  document.body.classList.remove('workspace-empty');
  $('#empty-workspace').hidden = true;
  $('#board-type').textContent =
    {
      studio: 'Creative workspace',
      blank: 'Free canvas',
      retro: 'Retrospective',
      mindmap: 'Mind map',
      brainstorm: 'Brainstorm',
    }[board.kind] || 'Whiteboard';
  renderBoardTabs({ reveal: true, openActive: true });
  repository.retainMediaFor(board);
  render();
  if (!session) fit();
}

function switchSafely(action) {
  transition = transition
    .catch(() => {})
    .then(async () => {
      endPointer();
      finishEdit();
      await flushSaves();
      return action();
    });
  return transition;
}

export function openBoard(id) {
  return switchSafely(async () => {
    const incoming = await repository.loadBoard(id);
    await repository.setActiveBoard(id);
    mountBoard(incoming);
    reportSaveStatus('saved');
  });
}

async function insertBoard(board) {
  if (cloudSync?.enabled && cloudSync.userId) board.cloudOwner = cloudSync.userId;
  else delete board.cloudOwner;
  await repository.saveBoard(board);
  state.boards = await repository.listBoards();
  await repository.setActiveBoard(board.id);
  mountBoard(await repository.loadBoard(board.id));
  reportSaveStatus('saved');
  cloudSync?.schedule();
}

export function createBoard(kind = 'blank') {
  return switchSafely(async () => {
    const titles = {
      brainstorm: 'The next big thing',
      retro: 'Sprint retrospective',
      mindmap: 'Connecting the dots',
      blank: 'Untitled board',
      studio: 'The creative studio',
    };
    await insertBoard({
      id: uid(),
      title: titles[kind] || titles.blank,
      kind,
      objects: await sample(kind),
      scenes: [],
      grid: true,
      snap: false,
      updated: Date.now(),
    });
  });
}

export function importBoard(parsed) {
  return switchSafely(() =>
    insertBoard({
      ...parsed,
      id: uid(),
      title: String(parsed.title || 'Imported board').slice(0, 200),
      kind: parsed.kind || 'blank',
      scenes: parsed.scenes || [],
      updated: Date.now(),
    }),
  );
}

export function deleteBoard(id) {
  return switchSafely(async () => {
    await repository.deleteBoard(id);
    cloudSync?.markDeleted(id);
    sessions.forget(id);
    state.boards = await repository.listBoards();
    if (state.board?.id === id) {
      if (state.boards.length) {
        const next = await repository.loadBoard(state.boards[0].id);
        await repository.setActiveBoard(next.id);
        mountBoard(next);
      } else {
        await insertBoard({
          id: uid(),
          title: 'Untitled board',
          kind: 'blank',
          objects: [],
          scenes: [],
          grid: true,
          snap: false,
          updated: Date.now(),
        });
      }
    }
    renderBoardTabs();
    reportSaveStatus('saved');
    cloudSync?.schedule();
  });
}

export async function init() {
  repository = await BoardRepository.open();
  saves = new SaveScheduler(
    async (snapshot, original) => {
      const stored = await repository.saveBoard(snapshot);
      original.revision = stored.revision;
      cloudSync?.schedule();
      // Retain fast media references without applying stale text/geometry to live edits.
      for (const item of stored.objects.filter((item) => item.mediaId)) {
        const live = original.objects.find((object) => object.id === item.id);
        const before = snapshot.objects.find((object) => object.id === item.id);
        if (live && live.src === before.src) live.mediaId = item.mediaId;
      }
    },
    { onState: reportSaveStatus },
  );
  repository.db.onversionchange = () => {
    repository.close();
    toast('Storage changed in another window. Reload Sparkboard before editing.');
    state.ready = false;
  };
  state.boards = await repository.listBoards();
  if (state.boards.length) {
    const active = await repository.getActiveBoard();
    await openBoard(
      state.boards.some((board) => board.id === active) ? active : state.boards[0].id,
    );
  } else await createBoard('brainstorm');
  state.ready = true;
  setTool(initialToolForLayout(isCompactEditor()));
  $('#canvas').removeAttribute('aria-busy');
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saves.journal(repository);
      flushSaves().catch(() => {});
    }
  });
  window.addEventListener('pagehide', () => {
    saves.journal(repository);
    flushSaves().catch(() => {});
  });
  window.addEventListener('beforeunload', (event) => {
    if (saves.dirty && !saves.journal(repository)) {
      // Only an actual unsaved attachment/storage failure requires a close warning.
      event.preventDefault();
      event.returnValue = '';
    }
    flushSaves().catch(() => {});
  });
  window.sparkboardBeforeUpdate = async () => {
    finishEdit();
    await flushSaves();
  };
}
