import { endPointer } from './canvas.js';
import { linkDialog } from './links.js';
import { selectVisual } from './rendering.js';
import { closeShapes, setTool } from './tools.js';
import { properties } from './inspector.js';
import { editableNodes, selectIds } from './selection.js';
import { activeEditor, finishEdit, startEdit } from './editor.js';
import { commit, redo, undo } from './history.js';
import { command, deleteSelected, duplicate, toggleLock } from './commands.js';
import { applyView, fit, zoom } from './viewport.js';
import { toggleScenes } from './scenes.js';
import { modal, searchBoard, showBoards, showHelp } from './dialogs.js';
import { toast } from './notifications.js';
import { createBoard, save, scheduleSave, flushSaves } from './boards.js';
import { state } from './state.js';
import { $, M } from './core.js';
export function setupControls() {
  $('#canvas').setAttribute('aria-busy', 'true');
  $('#close-dialog').onclick = () => $('#dialog').close();
  $('#dialog').onclick = (e) => {
    if (e.target === $('#dialog')) $('#dialog').close();
  };
  $('#title').oninput = (e) => {
    if (state.board) {
      state.board.title = e.target.value;
      scheduleSave();
    }
  };
  $('#new-board').onclick = async () => {
    try {
      await createBoard();
      $('#dialog').close();
      toast('A fresh canvas. Make it yours.');
    } catch (error) {
      toast(error.message);
    }
  };
  $('#boards').onclick = showBoards;
  $('#search-board').onclick = searchBoard;
  $('#scenes').onclick = toggleScenes;
  $('#close-scenes').onclick = () => {
    state.scenePanelOpen = false;
    $('#scenes-panel').hidden = true;
  };
  $('#close-welcome').onclick = () => $('#welcome').remove();
  $('#help').onclick = showHelp;
  $('#templates').onclick = () =>
    modal(
      'Give your ideas a head start.',
      `<div class="template-grid">${[
        ['studio', 'Creative studio', 'Images, resources and ideas. Everything in one space.'],
        ['brainstorm', 'Brainstorm', 'Turn a few sparks into your next big thing.'],
        ['retro', 'Sprint retrospective', 'Reflect on the good. Make the next sprint better.'],
        ['mindmap', 'Mind map', 'Find the connections between your ideas.'],
        ['blank', 'A clean slate', 'Your space, your rules. Start from scratch.'],
      ]
        .map(
          ([k, t, d]) =>
            `<button class="template-card" data-template="${k}"><div class="mini-notes"><i></i><i></i><i></i></div><b>${t}</b><p>${d}</p></button>`,
        )
        .join('')}</div>`,
      'A PLACE TO START',
    );
  $('#export').onclick = () =>
    modal(
      'Take your ideas with you.',
      [
        [
          'json',
          'Editable board',
          'A portable backup, including your images, PDFs, groups and scenes.',
        ],
        ['svg', 'Vector image', 'A crisp, scalable image of the whole canvas.'],
        ['png', 'PNG image', 'A high-resolution image, ready to share.'],
        ['pdf', 'Print / Save as PDF', 'Open the print dialog and choose Save as PDF.'],
      ]
        .map(
          ([type, title, detail]) =>
            `<button class="export-option" data-export="${type}"><b>↓ ${title}</b><span>${detail}</span></button>`,
        )
        .join(''),
      'SAVE & EXPORT',
    );
  $('#zoom-in').onclick = () => zoom(state.view.z * 1.2);
  $('#zoom-out').onclick = () => zoom(state.view.z / 1.2);
  $('#zoom-level').onclick = () => zoom(1);
  $('#fit').onclick = fit;
  $('#grid-toggle').onclick = () => {
    state.board.grid = !state.board.grid;
    applyView();
    save();
  };
  $('#snap-toggle').onclick = () => {
    state.board.snap = !state.board.snap;
    applyView();
    save();
    toast(state.board.snap ? 'Snap to grid on' : 'Snap to grid off');
  };
  $('#delete').onclick = deleteSelected;
  $('#duplicate').onclick = duplicate;
  $('#lock').onclick = toggleLock;
  $('#undo').onclick = undo;
  $('#redo').onclick = redo;
  $('#edit').onclick = () => {
    if (state.selected.size === 1) startEdit([...state.selected][0]);
  };
  $('#swatches').onclick = (e) => {
    let c = e.target.dataset.color;
    if (c)
      commit(() =>
        editableNodes()
          .filter((n) => !['image', 'file', 'link'].includes(n.type))
          .forEach((n) => (n.color = c)),
      );
  };
  $('#inspect').onclick = () => {
    state.inspectorOpen = !state.inspectorOpen;
    state.scenePanelOpen = false;
    $('#scenes-panel').hidden = true;
    properties();
  };
  $('#close-inspector').onclick = () => {
    state.inspectorOpen = false;
    properties();
  };
  $('#inspector-body').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.command) command(b.dataset.command);
    if (b.dataset.alignText)
      commit(() => editableNodes().forEach((n) => (n.align = b.dataset.alignText)));
    if (b.dataset.align) commit(() => M.align(editableNodes(), b.dataset.align));
    if (b.dataset.distribute) commit(() => M.distribute(editableNodes(), b.dataset.distribute));
  };
  $('#inspector-body').onchange = (e) => {
    const prop = e.target.dataset.prop;
    if (!prop) return;
    let value = e.target.value;
    if (['fontSize', 'rotation', 'strokeWidth'].includes(prop)) {
      value = Number(value);
      if (!Number.isFinite(value)) return;
      if (prop === 'fontSize') value = Math.max(8, Math.min(144, value));
      if (prop === 'rotation') value = Math.max(-360, Math.min(360, value));
    }
    commit(() =>
      editableNodes().forEach((n) => {
        if (prop === 'stroke' && ['path', 'connector'].includes(n.type)) n.color = value;
        else n[prop] = value;
      }),
    );
  };
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.shape-picker')) closeShapes();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#shape-menu').hidden) {
        closeShapes();
        $('#shape-toggle').focus();
        e.preventDefault();
        return;
      }
      if (state.editing) {
        e.preventDefault();
        finishEdit();
        document.activeElement?.blur();
        return;
      }
      if ($('#dialog').open) return;
      if (activeEditor()) {
        document.activeElement.blur();
        return;
      }
      state.selected.clear();
      setTool('select');
      selectVisual();
      return;
    }
    if (activeEditor() || $('#dialog').open || !state.board) return;
    const mod = e.metaKey || e.ctrlKey,
      key = e.key.toLowerCase();
    if (e.code === 'Space') {
      e.preventDefault();
      state.space = true;
      $('#canvas').style.cursor = 'grab';
      return;
    }
    if (mod) {
      if (key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (key === 'd') {
        e.preventDefault();
        duplicate();
      }
      if (key === 'a') {
        e.preventDefault();
        selectIds(state.board.objects.map((n) => n.id));
      }
      if (key === 'g') {
        e.preventDefault();
        command(e.shiftKey ? 'ungroup' : 'group');
      }
      if (key === 'f') {
        e.preventDefault();
        searchBoard();
      }
      if (key === 's') {
        e.preventDefault();
        save()
          .then(() => flushSaves())
          .then(() => toast('Saved on this device'))
          .catch((error) => toast(error.message));
      }
      return;
    }
    if (['Backspace', 'Delete'].includes(e.key)) {
      e.preventDefault();
      deleteSelected();
      return;
    }
    if (e.key === 'Enter' && state.selected.size === 1) {
      e.preventDefault();
      startEdit([...state.selected][0]);
      return;
    }
    if (e.key.startsWith('Arrow') && state.selected.size) {
      e.preventDefault();
      let step = e.shiftKey ? 10 : 1,
        dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0,
        dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      commit(() => editableNodes().forEach((n) => M.translate(n, dx, dy)));
      return;
    }
    const map = {
      v: 'select',
      h: 'hand',
      n: 'sticky',
      t: 'text',
      r: 'shape',
      o: 'circle',
      f: 'frame',
      c: 'connector',
      p: 'pen',
    };
    if (key === 'l') linkDialog();
    else if (map[key]) setTool(map[key]);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      state.space = false;
      $('#canvas').style.cursor =
        state.tool === 'hand' ? 'grab' : state.tool === 'select' ? 'default' : 'crosshair';
    }
  });
  window.addEventListener('blur', () => {
    state.space = false;
    endPointer();
  });
  window.addEventListener('resize', () => {
    closeShapes();
    applyView();
  });
}
