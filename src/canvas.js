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

function localShapePoint(n, p) {
  const cx = n.x + n.w / 2,
    cy = n.y + n.h / 2,
    angle = -((n.rotation || 0) * Math.PI) / 180,
    dx = p.x - cx,
    dy = p.y - cy,
    rx = dx * Math.cos(angle) - dy * Math.sin(angle),
    ry = dx * Math.sin(angle) + dy * Math.cos(angle);
  return {
    x: ((rx + n.w / 2) / Math.max(1, n.w)) * 100,
    y: ((ry + n.h / 2) / Math.max(1, n.h)) * 100,
  };
}

function nearestTargetPort(p, excludeId) {
  let best = null,
    bestDist = 36 / state.view.z;
  for (const n of state.board.objects) {
    if (n.id === excludeId || ['path', 'connector', 'frame'].includes(n.type)) continue;
    for (const port of M.ports) {
      const pp = M.portPoint(n, port),
        d = Math.hypot(p.x - pp.x, p.y - pp.y);
      if (d < bestDist) {
        bestDist = d;
        best = { node: n, port, x: pp.x, y: pp.y };
      }
    }
    if (!best && p.x >= n.x && p.x <= n.x + n.w && p.y >= n.y && p.y <= n.y + n.h) {
      const ports = M.ports.map((port) => ({ port, ...M.portPoint(n, port) }));
      ports.sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y));
      best = { node: n, port: ports[0].port, x: ports[0].x, y: ports[0].y };
    }
  }
  return best;
}

function eraseAt(p) {
  const radius = 12 / state.view.z;
  const hit = state.board.objects.filter(
    (n) => n.type === 'path' && !n.locked && M.pathHitsPoint(n, p, radius),
  );
  if (!hit.length) return false;
  if (!state.drag.changed) {
    snapshot();
    state.drag.changed = true;
  }
  const hitIds = new Set(hit.map((n) => n.id));
  state.board.objects = state.board.objects.filter((n) => !hitIds.has(n.id));
  hitIds.forEach((id) => state.selected.delete(id));
  renderLines();
  return true;
}

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
  state.guides = [];
  $('#selection-box').hidden = true;
  if (e && $('#canvas').hasPointerCapture(e.pointerId))
    $('#canvas').releasePointerCapture(e.pointerId);
  if (d.type === 'connect-port') {
    const draft = state.connectorDraft;
    state.connectorDraft = null;
    if (draft?.to && draft.to !== d.from) {
      commit(() => {
        const created = {
          id: uid(),
          type: 'connector',
          from: d.from,
          to: draft.to,
          fromPort: d.fromPort,
          toPort: draft.toPort,
          route: 'curved',
          color: '#86917b',
          strokeWidth: 2,
        };
        state.board.objects.push(created);
        state.selected = new Set([created.id]);
      });
    } else {
      renderLines();
    }
    return;
  }
  if (d.type === 'draw') {
    let n = state.board.objects.find((n) => n.id === d.id);
    if (n && n.points.length === 1)
      n.points.push({
        x: n.points[0].x + 0.1,
        y: n.points[0].y + 0.1,
      });
    state.selected = new Set([d.id]);
    render();
    save();
  } else if (d.changed) {
    render();
    save();
  } else {
    renderLines();
  }
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
    if (state.tool === 'eraser') {
      state.drag = {
        type: 'erase',
        changed: false,
      };
      eraseAt(p);
      capture(e);
      return;
    }
    const portEl = e.target.closest('.port');
    if (portEl && n && !['path', 'connector', 'frame'].includes(n.type)) {
      const fromPort = portEl.dataset.port,
        startPt = M.portPoint(n, fromPort);
      state.connectorDraft = {
        from: n.id,
        fromPort,
        d: `M${startPt.x},${startPt.y} L${p.x},${p.y}`,
      };
      state.drag = {
        type: 'connect-port',
        from: n.id,
        fromPort,
        startPt,
      };
      capture(e);
      renderLines();
      return;
    }
    const vertexEl = e.target.closest('.vertex-handle');
    if (vertexEl && n && !n.locked) {
      const idx = Number(vertexEl.dataset.vertex);
      if (e.altKey) {
        if (M.shapeVertices(n).length <= 3) {
          toast('A shape needs at least 3 anchor points');
          return;
        }
        commit(() => M.removeVertex(n, idx));
        return;
      }
      state.drag = {
        type: 'vertex',
        id: n.id,
        index: idx,
        changed: false,
      };
      capture(e);
      return;
    }
    const edgeEl = e.target.closest('.edge-handle');
    if (edgeEl && n && !n.locked) {
      const edgeIdx = Number(edgeEl.dataset.edge);
      snapshot();
      const local = localShapePoint(n, p);
      M.insertVertex(n, edgeIdx, local);
      state.drag = {
        type: 'vertex',
        id: n.id,
        index: edgeIdx + 1,
        changed: true,
      };
      render();
      capture(e);
      return;
    }
    const pathVertEl = e.target.closest('.path-vertex');
    if (pathVertEl && n && n.type === 'path' && !n.locked) {
      const idx = Number(pathVertEl.dataset.pathVertex);
      if (e.altKey && n.points.length > 2) {
        commit(() => n.points.splice(idx, 1));
        return;
      }
      state.drag = {
        type: 'path-vertex',
        id: n.id,
        index: idx,
        changed: false,
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
            route: 'curved',
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
      state.reshapeId = null;
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
    const rotateEl = e.target.closest('.rotate-handle');
    const resizeEl = e.target.closest('.resize');
    if (e.shiftKey && !rotateEl && !resizeEl) {
      const ids = M.expandGroups(state.board.objects, [n.id]);
      if (state.selected.has(n.id)) ids.forEach((id) => state.selected.delete(id));
      else ids.forEach((id) => state.selected.add(id));
      selectVisual();
      return;
    }
    if (!state.selected.has(n.id)) {
      state.selected = M.expandGroups(state.board.objects, [n.id]);
      if (state.reshapeId !== n.id) state.reshapeId = null;
    }
    selectVisual();
    if (n.locked) {
      toast('This item is locked. Use the lock button to unlock it.');
      return;
    }
    if (rotateEl) {
      state.drag = {
        type: 'rotate',
        id: n.id,
        start: p,
        original: M.clone(n),
        changed: false,
      };
      capture(e);
      return;
    }
    const movingIds = new Set(state.selected);
    if (!resizeEl) {
      for (const id of [...movingIds]) {
        const item = state.board.objects.find((o) => o.id === id);
        if (item?.type === 'frame') {
          M.frameChildren(state.board.objects, item.id).forEach((cid) => movingIds.add(cid));
        }
      }
    }
    state.drag = {
      type: resizeEl ? 'resize' : 'move',
      dir: resizeEl?.dataset.dir || 'se',
      start: p,
      id: n.id,
      movingIds,
      original: state.board.objects.filter((o) => movingIds.has(o.id) && !o.locked).map(M.clone),
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
    if (state.drag.type === 'erase') {
      eraseAt(p);
      return;
    }
    if (state.drag.type === 'connect-port') {
      const hit = nearestTargetPort(p, state.drag.from);
      const fromNode = state.board.objects.find((o) => o.id === state.drag.from);
      if (hit && fromNode) {
        const preview = M.connectorRoute(
          {
            from: state.drag.from,
            to: hit.node.id,
            fromPort: state.drag.fromPort,
            toPort: hit.port,
            route: 'curved',
          },
          state.board.objects,
        );
        state.connectorDraft = {
          from: state.drag.from,
          fromPort: state.drag.fromPort,
          to: hit.node.id,
          toPort: hit.port,
          d: preview.d,
        };
      } else {
        const s = state.drag.startPt;
        state.connectorDraft = {
          from: state.drag.from,
          fromPort: state.drag.fromPort,
          d: `M${s.x},${s.y} L${p.x},${p.y}`,
        };
      }
      renderLines();
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
    if (!n) return;
    if (state.drag.type === 'draw') {
      if (Math.hypot(p.x - n.points.at(-1).x, p.y - n.points.at(-1).y) > 2 / state.view.z) {
        n.points.push(p);
        renderLines();
      }
      return;
    }
    if (state.drag.type === 'vertex') {
      if (!state.drag.changed) {
        snapshot();
        state.drag.changed = true;
      }
      const local = localShapePoint(n, p);
      M.moveVertex(n, state.drag.index, local);
      render();
      return;
    }
    if (state.drag.type === 'path-vertex') {
      if (!state.drag.changed) {
        snapshot();
        state.drag.changed = true;
      }
      n.points[state.drag.index] = { x: p.x, y: p.y };
      renderLines();
      return;
    }
    if (state.drag.type === 'rotate') {
      if (!state.drag.changed) {
        snapshot();
        state.drag.changed = true;
      }
      const cx = n.x + n.w / 2,
        cy = n.y + n.h / 2;
      let deg = Math.round(((Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90) * 10) / 10;
      if (deg > 180) deg -= 360;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      n.rotation = deg;
      render();
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
      const nextBox = M.resizeBox(original, state.drag.dir, dx, dy, {
        lockAspect: e.shiftKey || n.type === 'image',
        snap: !!state.board.snap,
      });
      Object.assign(n, nextBox);
      const others = state.board.objects
        .filter((o) => o.id !== n.id && !['connector', 'path'].includes(o.type))
        .map((o) => M.bounds(o, state.board.objects));
      state.guides = M.smartGuides(
        M.bounds(n, state.board.objects),
        others,
        5 / state.view.z,
      ).guides;
    } else {
      const origin = state.drag.original.find((o) => o.id === state.drag.id);
      if (origin && origin.type !== 'connector') {
        const baseBounds = M.bounds(origin, state.board.objects);
        const movedBounds = {
          x: baseBounds.x + dx,
          y: baseBounds.y + dy,
          w: baseBounds.w,
          h: baseBounds.h,
        };
        const others = state.board.objects
          .filter((o) => !state.drag.movingIds.has(o.id) && !['connector', 'path'].includes(o.type))
          .map((o) => M.bounds(o, state.board.objects));
        const smart = M.smartGuides(movedBounds, others, 5 / state.view.z);
        state.guides = smart.guides;
        if (smart.guides.length) {
          dx += smart.dx;
          dy += smart.dy;
        } else if (state.board.snap) {
          dx = Math.round((baseBounds.x + dx) / 22) * 22 - baseBounds.x;
          dy = Math.round((baseBounds.y + dy) / 22) * 22 - baseBounds.y;
        }
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
