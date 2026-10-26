import { toast } from './notifications.js';
import { selectIds, selectedNodes } from './selection.js';
import { applyView, point, screenPoint } from './viewport.js';
import { save } from './boards.js';
import { render, renderLines, selectVisual } from './rendering.js';
import { finishEdit, startEdit } from './editor.js';
import { setTool } from './tools.js';
import { state } from './state.js';
import { commit, snapshot } from './history.js';
import { $, M, colors, node, uid } from './core.js';
export function addAt(type, p) {
  const n = node(
    type,
    p.x,
    p.y,
    type === 'text' ? 280 : type === 'frame' ? 420 : 190,
    type === 'text' ? 80 : type === 'frame' ? 320 : 170,
    type === 'sticky'
      ? 'Your next idea'
      : type === 'text'
        ? 'Add your text'
        : type === 'frame'
          ? 'NEW FRAME'
          : '',
    type === 'sticky'
      ? colors[0]
      : type === 'text'
        ? '#3b4435'
        : type === 'frame'
          ? 'transparent'
          : colors[1],
  );
  commit(() => {
    state.board.objects.push(n);
    state.selected = new Set([n.id]);
  });
  setTool('select');
  if (type === 'sticky' || type === 'text') startEdit(n.id);
}
export function capture(e) {
  $('#canvas').setPointerCapture(e.pointerId);
}
export function endPointer(e) {
  if (!state.drag) return;
  const d = state.drag;
  state.drag = null;
  $('#selection-box').hidden = true;
  if (e && $('#canvas').hasPointerCapture(e.pointerId))
    $('#canvas').releasePointerCapture(e.pointerId);
  if (d.type === 'draw') {
    let n = state.board.objects.find((n) => n.id === d.id);
    if (n.points.length === 1)
      n.points.push({
        x: n.points[0].x + 0.1,
        y: n.points[0].y + 0.1,
      });
    state.selected = new Set([d.id]);
    render();
    save();
  } else if (d.changed) save();
}
export function setupCanvas() {
  $('#canvas').addEventListener('pointerdown', (e) => {
    if (!state.board || (e.button !== 0 && e.button !== 1) || e.target.closest('[data-open]'))
      return;
    if (state.editing && e.target.closest('[contenteditable]')) return;
    e.preventDefault();
    finishEdit();
    const p = point(e),
      el = e.target.closest('[data-id]'),
      n = el && state.board.objects.find((n) => n.id === el.dataset.id);
    if (state.space || state.tool === 'hand' || e.button === 1) {
      e.preventDefault();
      state.drag = {
        type: 'pan',
        cx: e.clientX,
        cy: e.clientY,
        x: state.view.x,
        y: state.view.y,
      };
      capture(e);
      return;
    }
    if (state.tool === 'connector') {
      if (!n || ['path', 'connector', 'frame'].includes(n.type)) return;
      if (!state.connectorStart) {
        state.connectorStart = n.id;
        selectIds([n.id]);
        toast('Click another object to connect it');
      } else if (state.connectorStart !== n.id) {
        const from = state.connectorStart;
        commit(() =>
          state.board.objects.push({
            id: uid(),
            type: 'connector',
            from,
            to: n.id,
            color: '#86917b',
            strokeWidth: 2,
          }),
        );
        setTool('select');
        state.selected.clear();
        selectVisual();
      }
      return;
    }
    if (state.tool === 'pen') {
      snapshot();
      const path = {
        id: uid(),
        type: 'path',
        points: [p],
        color: $('#pen-color').value,
        strokeWidth: Number($('#pen-width').value),
      };
      state.board.objects.push(path);
      state.drag = {
        type: 'draw',
        id: path.id,
      };
      capture(e);
      return;
    }
    if (state.tool !== 'select') {
      addAt(state.tool, p);
      return;
    }
    if (!n) {
      if (!e.shiftKey) state.selected.clear();
      state.drag = {
        type: 'marquee',
        start: p,
        original: new Set(state.selected),
        current: p,
      };
      capture(e);
      selectVisual();
      return;
    }
    const resize = e.target.classList.contains('resize');
    if (e.shiftKey) {
      const ids = M.expandGroups(state.board.objects, [n.id]);
      if (state.selected.has(n.id)) ids.forEach((id) => state.selected.delete(id));
      else ids.forEach((id) => state.selected.add(id));
      selectVisual();
      return;
    }
    if (!state.selected.has(n.id)) state.selected = M.expandGroups(state.board.objects, [n.id]);
    selectVisual();
    if (n.locked) {
      toast('This item is locked. Use the lock button to unlock it.');
      return;
    }
    state.drag = {
      type: resize ? 'resize' : 'move',
      start: p,
      id: n.id,
      original: selectedNodes().map(M.clone),
      changed: false,
    };
    capture(e);
  });
  $('#canvas').addEventListener('pointermove', (e) => {
    if (!state.drag) return;
    const p = point(e);
    if (state.drag.type === 'pan') {
      state.view.x = state.drag.x + e.clientX - state.drag.cx;
      state.view.y = state.drag.y + e.clientY - state.drag.cy;
      applyView();
      return;
    }
    if (state.drag.type === 'marquee') {
      state.drag.current = p;
      const a = screenPoint(state.drag.start),
        b = screenPoint(p);
      $('#selection-box').hidden = false;
      $('#selection-box').style.cssText =
        `left:${Math.min(a.x, b.x)}px;top:${Math.min(a.y, b.y)}px;width:${Math.abs(a.x - b.x)}px;height:${Math.abs(a.y - b.y)}px`;
      const x = Math.min(p.x, state.drag.start.x),
        y = Math.min(p.y, state.drag.start.y),
        w = Math.abs(p.x - state.drag.start.x),
        h = Math.abs(p.y - state.drag.start.y);
      const ids = state.board.objects
        .filter((n) => n.type !== 'frame' && n.type !== 'connector')
        .filter((n) => {
          let b = M.bounds(n, state.board.objects);
          return b.x >= x && b.y >= y && b.x + b.w <= x + w && b.y + b.h <= y + h;
        })
        .map((n) => n.id);
      state.selected = M.expandGroups(state.board.objects, [...state.drag.original, ...ids]);
      selectVisual();
      return;
    }
    const n = state.board.objects.find((n) => n.id === state.drag.id);
    if (state.drag.type === 'draw') {
      if (Math.hypot(p.x - n.points.at(-1).x, p.y - n.points.at(-1).y) > 1 / state.view.z) {
        n.points.push(p);
        renderLines();
      }
      return;
    }
    let dx = p.x - state.drag.start.x,
      dy = p.y - state.drag.start.y;
    if (!state.drag.changed && Math.hypot(dx, dy) * state.view.z < 3) return;
    if (!state.drag.changed) {
      snapshot();
      state.drag.changed = true;
    }
    if (state.drag.type === 'resize') {
      const original = state.drag.original.find((o) => o.id === n.id);
      n.w = Math.max(50, original.w + dx);
      n.h = Math.max(40, original.h + dy);
      if (e.shiftKey || n.type === 'image') {
        let ratio = original.h / original.w;
        n.h = n.w * ratio;
      }
      if (state.board.snap) {
        n.w = Math.round(n.w / 22) * 22;
        n.h = Math.round(n.h / 22) * 22;
      }
    } else {
      if (state.board.snap) {
        const origin = state.drag.original.find((o) => o.id === state.drag.id),
          b = M.bounds(origin, state.board.objects);
        dx = Math.round((b.x + dx) / 22) * 22 - b.x;
        dy = Math.round((b.y + dy) / 22) * 22 - b.y;
      }
      for (const original of state.drag.original) {
        let target = state.board.objects.find((o) => o.id === original.id);
        Object.assign(target, M.clone(original));
        M.translate(target, dx, dy);
      }
    }
    render();
  });
  $('#canvas').addEventListener('pointerup', endPointer);
  $('#canvas').addEventListener('pointercancel', endPointer);
  $('#canvas').addEventListener('dblclick', (e) => {
    if (e.target.closest('[data-open]')) return;
    let id = e.target.closest('[data-id]')?.dataset.id;
    if (id) startEdit(id);
    else if (state.tool === 'select') addAt('sticky', point(e));
  });
}
