import { isNativeControl } from './keyboard.js';
import { mindmapShortcut } from './mindmap.js';
import { svgIcon } from './icons.js';
import { endPointer } from './canvas.js';
import { linkDialog } from './links.js';
import { render, renderFast, selectVisual } from './rendering.js';
import { closeShapes, setTool } from './tools.js';
import { properties } from './inspector.js';
import { isCompactEditor } from './mobile-editor-policy.js';
import { showFormatPage, stepVisibleFormatPage } from './mobile-format-pages.js';
import { editableNodes, selectIds } from './selection.js';
import { activeEditor, finishEdit, startEdit } from './editor.js';
import { commit, redo, snapshot, undo } from './history.js';
import {
  command,
  deleteSelected,
  duplicate,
  toggleLock,
  toggleReshape,
  setOutlineMode,
} from './commands.js';
import { applyView, fit, zoom } from './viewport.js';
import { toggleScenes } from './scenes.js';
import { modal, searchBoard, showBoards, showHelp } from './dialogs.js';
import { toast } from './notifications.js';
import { createBoard, save, flushSaves } from './boards.js';
import { state } from './state.js';
import { $, M } from './core.js';
export function setupControls() {
  for (const [id, icon] of Object.entries({
    undo: 'undo',
    redo: 'redo',
    'grid-toggle': 'grid',
    boards: 'templates',
    help: 'help',
    'search-board': 'search',
    inspect: 'format',
    'mobile-more': 'more',
    scenes: 'scenes',
    templates: 'templates',
    export: 'export',
    fit: 'frame',
  })) {
    const button = $('#' + id);
    button.setAttribute('aria-label', button.getAttribute('aria-label') || button.title);
    button.innerHTML =
      svgIcon(icon) +
      (button.classList.contains('quiet')
        ? `<span>${{ search: 'Find', format: 'Format', scenes: 'Scenes', templates: 'Templates', export: 'Export', more: 'More' }[icon]}</span>`
        : '');
  }
  const mobileMore = $('#mobile-more');
  const mobileMoreMenu = $('#mobile-more-menu');
  const closeMore = () => {
    mobileMoreMenu.hidden = true;
    mobileMore.setAttribute('aria-expanded', 'false');
  };
  mobileMore.onclick = () => {
    const next = mobileMoreMenu.hidden;
    mobileMoreMenu.hidden = !next;
    mobileMore.setAttribute('aria-expanded', String(next));
  };
  mobileMoreMenu.onclick = (event) => {
    const original = event.target.closest('[data-more-action]')?.dataset.moreAction;
    if (!original) return;
    closeMore();
    $('#' + original).click();
  };
  document.addEventListener('pointerdown', (event) => {
    if (
      !mobileMoreMenu.hidden &&
      !mobileMore.contains(event.target) &&
      !mobileMoreMenu.contains(event.target)
    )
      closeMore();
  });
  $('#canvas').setAttribute('aria-busy', 'true');
  $('#close-dialog').onclick = () => $('#dialog').close();
  $('#dialog').onclick = (e) => {
    if (e.target === $('#dialog')) $('#dialog').close();
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
  $('#open-library').onclick = showBoards;
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
    const enabled = state.board.grid === false;
    state.board.grid = enabled;
    state.board.snap = enabled;
    applyView();
    save();
    toast(enabled ? 'Grid and snapping on' : 'Grid and snapping off');
  };
  $('#undo').onclick = undo;
  $('#redo').onclick = redo;
  $('#inspect').onclick = () => {
    if (!state.selected.size && !['pen', 'line', 'connector'].includes(state.tool)) {
      toast('Select an item on the board to format it');
      return;
    }
    state.inspectorOpen = !state.inspectorOpen;
    state.scenePanelOpen = false;
    $('#scenes-panel').hidden = true;
    properties();
  };
  $('#mobile-selection-actions').onclick = (event) => {
    const action = event.target.closest('[data-mobile-action]')?.dataset.mobileAction;
    if (!action || !state.selected.size) return;
    if (action === 'nodes' || action === 'done') {
      toggleReshape();
    } else if (action === 'points' || action === 'bend') {
      setOutlineMode(action);
    } else if (action === 'remove-point') {
      const node = editableNodes()[0];
      const index = state.selectedVertex;
      if (
        node &&
        state.reshapeId === node.id &&
        M.shapes.includes(node.type) &&
        state.reshapeMode === 'points' &&
        Number.isInteger(index) &&
        M.shapeVertices(node).length > 3 &&
        index < M.shapeVertices(node).length
      ) {
        commit(() => {
          M.removeVertex(node, index);
          state.selectedVertex = null;
        });
      }
    } else if (action === 'connect') {
      const source = editableNodes()[0];
      if (
        state.selected.size !== 1 ||
        !source ||
        ['path', 'line', 'connector', 'frame', 'file', 'image', 'embed'].includes(source.type)
      )
        return;
      setTool('connector');
      state.connectorStart = source.id;
      toast('Tap the object you want to connect to. Tap Select to cancel.');
    } else if (action === 'format') {
      state.inspectorOpen = !state.inspectorOpen;
      properties();
    } else if (action === 'duplicate') {
      duplicate();
    } else if (action === 'edit' && state.selected.size === 1) {
      startEdit([...state.selected][0]);
    }
  };
  $('#close-inspector').onclick = () => {
    state.inspectorOpen = false;
    properties();
  };
  const inspector = $('#inspector-body');
  inspector.onclick = (e) => {
    const page = e.target.closest('[data-format-page]');
    if (page) {
      showFormatPage(inspector, page.dataset.formatPage);
      return;
    }
    const step = e.target.closest('[data-format-step]');
    if (step) {
      stepVisibleFormatPage(inspector, Number(step.dataset.formatStep));
      return;
    }
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.command) {
      const action = b.dataset.command;
      if (action === 'duplicate') duplicate();
      else if (action === 'delete') deleteSelected();
      else if (action === 'edit') {
        if (state.selected.size === 1) {
          if (isCompactEditor()) {
            state.inspectorOpen = false;
            properties();
          }
          startEdit([...state.selected][0]);
        }
      } else if (action === 'edit-link') {
        const n = editableNodes()[0];
        if (n?.type === 'link') linkDialog(n);
      } else command(action);
    }
    if (b.dataset.outlineMode) setOutlineMode(b.dataset.outlineMode);
    if (b.dataset.aspect) {
      commit(() =>
        editableNodes()
          .filter((n) => M.shapes.includes(n.type))
          .forEach((n) => {
            n.lockAspect = n.lockAspect === false;
          }),
      );
    }
    if (b.dataset.toggleStyle) {
      const toggle = b.dataset.toggleStyle;
      if (toggle === 'bold') command('bold');
      if (toggle === 'italic')
        commit(() =>
          editableNodes().forEach(
            (n) => (n.fontStyle = n.fontStyle === 'italic' ? 'normal' : 'italic'),
          ),
        );
      if (toggle === 'underline')
        commit(() =>
          editableNodes().forEach(
            (n) => (n.textDecoration = n.textDecoration === 'underline' ? 'none' : 'underline'),
          ),
        );
    }
    if (b.dataset.alignText)
      commit(() => editableNodes().forEach((n) => (n.align = b.dataset.alignText)));
    if (b.dataset.align) commit(() => M.align(editableNodes(), b.dataset.align));
    if (b.dataset.distribute) commit(() => M.distribute(editableNodes(), b.dataset.distribute));
  };
  const applyInspectorProp = (prop, rawValue) => {
    const allowed = new Set([
      'avoidObstacles',
      'fontSize',
      'rotation',
      'strokeWidth',
      'w',
      'h',
      'cornerRadius',
      'opacity',
      'type',
      'route',
      'stroke',
      'text',
      'startArrow',
      'endArrow',
      'color',
      'lineStyle',
      'fontFamily',
      'textColor',
    ]);
    if (!allowed.has(prop)) return false;
    let value = rawValue;
    if (prop === 'avoidObstacles') value = rawValue === 'true';
    if (
      ['fontSize', 'rotation', 'strokeWidth', 'w', 'h', 'cornerRadius', 'opacity'].includes(prop)
    ) {
      value = Number(rawValue);
      if (!Number.isFinite(value)) return false;
      if (prop === 'fontSize') value = Math.max(8, Math.min(144, value));
      if (prop === 'rotation') value = Math.max(-360, Math.min(360, value));
      if (prop === 'strokeWidth') value = Math.max(0, Math.min(16, value));
      if (prop === 'cornerRadius') value = Math.max(0, Math.min(80, value));
      if (prop === 'opacity') value = Math.max(0, Math.min(100, value)) / 100;
      if (prop === 'w' || prop === 'h') value = Math.max(30, Math.min(10000, value));
    }
    if (
      prop === 'fontFamily' &&
      !['DM Sans', 'Manrope', 'Georgia', 'Arial', 'monospace'].includes(value)
    )
      return false;
    if (['color', 'stroke', 'textColor'].includes(prop) && !/^#[0-9a-f]{6}$/i.test(value))
      return false;
    if (prop === 'lineStyle' && !M.lineStyles.includes(value)) return false;
    if (['startArrow', 'endArrow'].includes(prop) && !M.arrowHeads.includes(value)) return false;
    if (prop === 'route' && !M.routes.includes(value)) return false;
    editableNodes().forEach((n) => {
      if (prop === 'type' && M.shapes.includes(n.type) && M.shapes.includes(value)) {
        n.type = value;
        delete n.vertices;
        M.resetCurves(n);
      } else if (prop === 'route' && ['connector', 'line'].includes(n.type)) {
        M.setLineRoute(n, value);
      } else if (prop === 'stroke' && ['path', 'connector', 'line'].includes(n.type)) {
        n.color = value;
      } else if (prop === 'text' && ['connector', 'line'].includes(n.type)) {
        const trimmed = String(value || '').trim();
        if (trimmed) n.text = trimmed;
        else delete n.text;
      } else if (
        ['w', 'h'].includes(prop) &&
        M.shapes.includes(n.type) &&
        n.lockAspect !== false &&
        n.w > 0 &&
        n.h > 0
      ) {
        const ratio = n.w / n.h;
        if (prop === 'w') {
          n.w = value;
          n.h = Math.max(30, Math.min(10000, value / ratio));
        } else {
          n.h = value;
          n.w = Math.max(30, Math.min(10000, value * ratio));
        }
      } else {
        n[prop] = value;
      }
    });
    return true;
  };
  let inspectorInputSnap = false;
  inspector.oninput = (e) => {
    const prop = e.target.dataset.prop;
    if (!prop || !['range', 'color'].includes(e.target.type)) return;
    if (!inspectorInputSnap) {
      snapshot();
      inspectorInputSnap = true;
    }
    if (applyInspectorProp(prop, e.target.value)) renderFast();
  };
  inspector.onchange = (e) => {
    const prop = e.target.dataset.prop;
    if (!prop) return;
    if (inspectorInputSnap) {
      inspectorInputSnap = false;
      applyInspectorProp(prop, e.target.value);
      render();
      save();
      return;
    }
    commit(() => applyInspectorProp(prop, e.target.value));
  };
  const lineOptsPanel = $('#line-options');
  if (lineOptsPanel) {
    lineOptsPanel.onchange = (e) => {
      const id = e.target.id;
      const map = {
        'line-route': 'route',
        'line-style': 'lineStyle',
        'line-start-arrow': 'startArrow',
        'line-end-arrow': 'endArrow',
        'line-color': 'color',
        'line-width': 'strokeWidth',
      };
      const prop = map[id];
      if (!prop) return;
      const targets = editableNodes().filter((n) => ['line', 'connector'].includes(n.type));
      if (!targets.length) return;
      const val = prop === 'strokeWidth' ? Number(e.target.value) || 2 : e.target.value;
      commit(() =>
        targets.forEach((n) => (prop === 'route' ? M.setLineRoute(n, val) : (n[prop] = val))),
      );
    };
  }
  const drawOptsPanel = $('#drawing-options');
  if (drawOptsPanel) {
    drawOptsPanel.onchange = (e) => {
      const id = e.target.id;
      const prop = id === 'pen-color' ? 'color' : id === 'pen-width' ? 'strokeWidth' : null;
      if (!prop) return;
      const targets = editableNodes().filter((n) => n.type === 'path');
      if (!targets.length) return;
      const val = prop === 'strokeWidth' ? Number(e.target.value) || 4 : e.target.value;
      commit(() =>
        targets.forEach((n) => (prop === 'route' ? M.setLineRoute(n, val) : (n[prop] = val))),
      );
    };
  }
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
      if (state.reshapeId) {
        state.reshapeId = null;
        selectVisual();
        return;
      }
      state.selected.clear();
      setTool('select');
      selectVisual();
      return;
    }
    if (
      activeEditor() ||
      isNativeControl(e.target) ||
      $('#dialog').open ||
      !state.board ||
      document.body.classList.contains('workspace-empty')
    )
      return;
    const mod = e.metaKey || e.ctrlKey,
      key = e.key.toLowerCase();
    if (e.code === 'Space') {
      e.preventDefault();
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur?.();
      }
      state.space = true;
      if (state.drag?.type !== 'pan') $('#canvas').style.cursor = 'grab';
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
    if (mindmapShortcut(e)) return;
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
      commit(() => {
        const moving = new Set(editableNodes().map((n) => n.id));
        for (const id of [...moving]) {
          const item = state.board.objects.find((o) => o.id === id);
          if (item?.type === 'frame') {
            M.frameChildren(state.board.objects, item.id).forEach((cid) => moving.add(cid));
          }
        }
        state.board.objects
          .filter((n) => moving.has(n.id) && !n.locked)
          .forEach((n) => M.translate(n, dx, dy));
      });
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
      l: 'line',
      c: 'connector',
      p: 'pen',
      e: 'eraser',
    };
    if (key === 'a' && state.selected.size === 1) toggleReshape();
    else if (key === 'k') linkDialog();
    else if (map[key]) setTool(map[key]);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      if (!activeEditor()) e.preventDefault();
      state.space = false;
      if (state.drag?.type !== 'pan') {
        $('#canvas').style.cursor =
          state.tool === 'hand' ? 'grab' : state.tool === 'select' ? 'default' : 'crosshair';
      }
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
