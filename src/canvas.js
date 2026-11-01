import { toast } from './notifications.js';
import { selectIds } from './selection.js';
import { applyView, point, screenPoint } from './viewport.js';
import { save } from './boards.js';
import { render, renderFast, renderLines, selectVisual } from './rendering.js';
import { finishEdit, startEdit } from './editor.js';
import { setTool } from './tools.js';
import { state } from './state.js';
import { commit, snapshot, updateHistory } from './history.js';
import { $, M, colors, node, uid } from './core.js';
import { allowDoubleClickEdit, isCompactEditor } from './mobile-editor-policy.js';

function roundPt(p) {
  return {
    x: Math.round(p.x * 10) / 10,
    y: Math.round(p.y * 10) / 10,
  };
}

function isFrameInterior(n, p) {
  if (!n || n.type !== 'frame') return false;
  return p.x - n.x > 16 && n.x + n.w - p.x > 16 && p.y - n.y > 44 && n.y + n.h - p.y > 16;
}

function currentLineOptions(defaultRoute = 'straight') {
  return {
    route: $('#line-route')?.value || defaultRoute,
    lineStyle: $('#line-style')?.value || 'solid',
    startArrow: $('#line-start-arrow')?.value || 'none',
    endArrow: $('#line-end-arrow')?.value || 'arrow',
    color: $('#line-color')?.value || '#86917b',
    strokeWidth: Number($('#line-width')?.value) || 2,
  };
}

function snapLinePoint(start, end) {
  const dx = end.x - start.x,
    dy = end.y - start.y,
    dist = Math.hypot(dx, dy),
    angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return {
    x: Math.round(start.x + Math.cos(angle) * dist),
    y: Math.round(start.y + Math.sin(angle) * dist),
  };
}

function upsertConnector(props) {
  props = { ...props };
  for (const field of ['fromPort', 'toPort', 'fromAnchor', 'toAnchor'])
    if (!props[field]) delete props[field];
  const existing = state.board.objects.find(
    (o) =>
      o.type === 'connector' &&
      ((o.from === props.from && o.to === props.to) ||
        (o.from === props.to && o.to === props.from)),
  );
  if (existing) {
    Object.assign(existing, props);
    if (!props.fromPort) delete existing.fromPort;
    if (!props.toPort) delete existing.toPort;
    if (!props.fromAnchor) delete existing.fromAnchor;
    if (!props.toAnchor) delete existing.toAnchor;
    M.dedupeConnectors(state.board.objects);
    return existing.id;
  }
  const created = { id: uid(), type: 'connector', ...props };
  state.board.objects.push(created);
  M.dedupeConnectors(state.board.objects);
  return created.id;
}

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
  return M.nearestBinding(
    state.board.objects,
    p,
    excludeId,
    26 / state.view.z,
    state.connectorDraft?.binding?.nodeId,
    state.drag?.startPt || p,
  );
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
  // On phones, creation selects the object first so it can be repositioned.
  // Text editing stays available through Format → Edit text.
  if ((type === 'sticky' || type === 'text') && !isCompactEditor()) startEdit(n.id);
}

export function capture(e) {
  if (state.drag) state.drag.pointerId = e.pointerId;
  $('#canvas').setPointerCapture(e.pointerId);
}

export function endPointer(e) {
  if (!state.drag) return;
  if (e && state.drag.pointerId !== undefined && e.pointerId !== state.drag.pointerId) return;
  const d = state.drag;
  state.drag = null;
  state.guides = [];
  document.body.classList.remove('is-panning');
  $('#canvas').style.cursor =
    state.space || state.tool === 'hand'
      ? 'grab'
      : state.tool === 'select'
        ? 'default'
        : 'crosshair';
  $('#selection-box').hidden = true;
  const pointerId = d.pointerId ?? e?.pointerId;
  if (pointerId !== undefined && $('#canvas').hasPointerCapture(pointerId))
    $('#canvas').releasePointerCapture(pointerId);
  if (d.type === 'pan') return;
  if (d.type === 'rebind-connector') {
    const draft = state.connectorDraft;
    state.connectorDraft = null;
    if (draft?.binding && e?.type === 'pointerup') {
      const connector = state.board.objects.find((n) => n.id === d.id),
        side = d.side;
      if (connector)
        commit(() => {
          connector[side] = draft.binding.nodeId;
          delete connector[side + 'Port'];
          delete connector[side + 'Anchor'];
          if (draft.binding.port) connector[side + 'Port'] = draft.binding.port;
          else if (draft.binding.anchor) connector[side + 'Anchor'] = draft.binding.anchor;
        });
    }
    renderLines();
    return;
  }
  if (d.type === 'connect-port') {
    const draft = state.connectorDraft;
    state.connectorDraft = null;
    if (e?.type !== 'pointerup') {
      state.connectorStart = null;
      renderLines();
      return;
    }
    if (draft?.to && draft.to !== d.from) {
      let createdId;
      commit(() => {
        const opts = d.opts || currentLineOptions('curved');
        createdId = upsertConnector({
          from: d.from,
          to: draft.to,
          fromPort: d.fromPort,
          toPort: draft.toPort,
          fromAnchor: d.fromAnchor,
          toAnchor: draft.toAnchor,
          ...opts,
        });
        state.selected = new Set([createdId]);
      });
      state.connectorStart = null;
      if (d.fromTool) setTool('select');
      selectVisual();
    } else {
      if (d.fromTool) {
        state.connectorStart = d.from;
        toast('Click another object to connect it');
      }
      renderLines();
    }
    return;
  }
  if (d.type === 'draw-line') {
    state.connectorDraft = null;
    const start = d.start,
      rawEnd = d.end || d.start,
      dist = Math.hypot(rawEnd.x - start.x, rawEnd.y - start.y),
      pts =
        dist < 8
          ? [
              { x: Math.round(start.x - 90), y: Math.round(start.y) },
              { x: Math.round(start.x + 90), y: Math.round(start.y) },
            ]
          : [
              { x: Math.round(start.x), y: Math.round(start.y) },
              { x: Math.round(rawEnd.x), y: Math.round(rawEnd.y) },
            ];
    commit(() => {
      const created = {
        id: uid(),
        type: 'line',
        points: pts,
        ...d.opts,
      };
      created.controls = M.lineControls(created);
      state.board.objects.push(created);
      state.selected = new Set([created.id]);
    });
    setTool('select');
    return;
  }
  if (d.type === 'draw-shape') {
    setTool('select');
    render();
    save();
    return;
  }
  if (d.type === 'draw') {
    let n = state.board.objects.find((n) => n.id === d.id);
    if (n && n.points.length === 1)
      n.points.push({
        x: Math.round((n.points[0].x + 0.5) * 10) / 10,
        y: Math.round((n.points[0].y + 0.5) * 10) / 10,
      });
    renderLines();
    updateHistory();
    save();
    return;
  }
  if (d.type === 'move' && !d.changed && !d.shiftKey && d.wasSelected && state.selected.size > 1) {
    state.selected = M.expandGroups(state.board.objects, [d.id]);
    selectVisual();
    return;
  }
  if (d.changed) {
    render();
    save();
  } else {
    renderLines();
  }
}

export function setupCanvas() {
  let lastTouchAt = 0;
  $('#canvas').addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      lastTouchAt = Date.now();
      // Free the canvas before any touch drag. The user can reopen Format explicitly.
      if (isCompactEditor() && state.inspectorOpen) {
        state.inspectorOpen = false;
        $('#inspector').hidden = true;
        $('#inspect').setAttribute('aria-expanded', 'false');
      }
    }
    if (!state.board || state.drag || (e.button !== 0 && e.button !== 1)) return;
    const panning = state.space || state.tool === 'hand' || e.button === 1;
    // Media buttons remain clickable, but navigation gestures take priority.
    if (!panning && e.target.closest('[data-open]')) return;
    if (!panning && state.editing && e.target.closest('[contenteditable]')) return;
    e.preventDefault();
    finishEdit();
    if (
      document.activeElement &&
      document.activeElement !== document.body &&
      !e.target.closest('input,textarea,select,button,[contenteditable]')
    ) {
      document.activeElement.blur?.();
    }
    const p = point(e),
      el = e.target.closest('[data-id]');
    let n = el && state.board.objects.find((n) => n.id === el.dataset.id);
    if (panning) {
      e.preventDefault();
      document.body.classList.add('is-panning');
      $('#canvas').style.cursor = 'grabbing';
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
    const bindingHandle = e.target.closest('[data-connector-end]');
    if (bindingHandle && n?.type === 'connector' && !n.locked) {
      const side = bindingHandle.dataset.connectorEnd,
        other = side === 'from' ? 'to' : 'from';
      state.drag = { type: 'rebind-connector', id: n.id, side, excludeId: n[other], startPt: p };
      capture(e);
      e.preventDefault();
      return;
    }
    const portEl = e.target.closest('.port');
    if (portEl && n && !['path', 'line', 'connector', 'frame'].includes(n.type)) {
      const fromPort = portEl.dataset.port,
        startPt = M.portPoint(n, fromPort),
        opts = currentLineOptions('curved');
      state.connectorDraft = {
        from: n.id,
        fromPort,
        d: `M${startPt.x},${startPt.y} L${p.x},${p.y}`,
        ...opts,
      };
      state.drag = {
        type: 'connect-port',
        from: n.id,
        fromPort,
        startPt,
        opts,
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
    const curveEl = e.target.closest('.shape-curve-handle');
    if (curveEl && n && M.shapes.includes(n.type) && !n.locked) {
      state.drag = {
        type: 'curve-edge',
        id: n.id,
        index: Number(curveEl.dataset.curveEdge),
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
    const curveEl = e.target.closest('.curve-handle');
    if (curveEl && n?.type === 'line' && !n.locked) {
      state.drag = {
        type: 'line-control',
        id: n.id,
        index: Number(curveEl.dataset.lineControl),
        changed: false,
      };
      capture(e);
      return;
    }
    const lineVertEl = e.target.closest('.line-vertex');
    if (lineVertEl && n && n.type === 'line' && !n.locked) {
      const idx = Number(lineVertEl.dataset.lineVertex);
      state.drag = {
        type: 'line-vertex',
        id: n.id,
        index: idx,
        changed: false,
      };
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
    if (state.tool === 'line') {
      const opts = currentLineOptions('straight');
      state.connectorDraft = {
        type: 'line',
        d: `M${p.x},${p.y} L${p.x},${p.y}`,
        ...opts,
      };
      state.drag = {
        type: 'draw-line',
        start: p,
        end: p,
        opts,
      };
      capture(e);
      renderLines();
      return;
    }
    if (state.tool === 'connector') {
      if (!n || ['path', 'line', 'connector', 'frame'].includes(n.type)) {
        state.connectorStart = null;
        renderLines();
        return;
      }
      if (state.connectorStart && state.connectorStart !== n.id) {
        const from = state.connectorStart,
          opts = currentLineOptions('curved');
        let createdId;
        commit(() => {
          createdId = upsertConnector({
            from,
            to: n.id,
            ...opts,
          });
        });
        state.connectorStart = null;
        setTool('select');
        state.selected = new Set([createdId]);
        selectVisual();
        return;
      }
      const opts = currentLineOptions('curved'),
        startPt = { x: Math.round(n.x + n.w / 2), y: Math.round(n.y + n.h / 2) };
      const sourceBinding = M.nearestBinding([n], p, null, 26 / state.view.z);
      state.connectorStart = n.id;
      selectIds([n.id]);
      state.connectorDraft = {
        from: n.id,
        d: `M${startPt.x},${startPt.y} L${p.x},${p.y}`,
        ...opts,
      };
      state.drag = {
        type: 'connect-port',
        from: n.id,
        fromPort: null,
        fromAnchor: sourceBinding?.anchor,
        startPt,
        opts,
        fromTool: true,
      };
      capture(e);
      renderLines();
      return;
    }
    if (state.tool === 'pen') {
      snapshot();
      const pt = roundPt(p);
      const path = {
        id: uid(),
        type: 'path',
        points: [pt],
        color: $('#pen-color').value,
        strokeWidth: Number($('#pen-width').value),
      };
      state.board.objects.push(path);
      state.drag = {
        type: 'draw',
        id: path.id,
      };
      capture(e);
      renderLines();
      return;
    }
    if (M.shapes.includes(state.tool)) {
      snapshot();
      const type = state.tool,
        defaultW = type === 'frame' ? 420 : 190,
        defaultH = type === 'frame' ? 320 : 170,
        created = node(
          type,
          p.x,
          p.y,
          defaultW,
          defaultH,
          type === 'frame' ? 'NEW FRAME' : '',
          type === 'frame' ? 'transparent' : colors[1],
        );
      state.board.objects.push(created);
      state.selected = new Set([created.id]);
      state.drag = {
        type: 'draw-shape',
        id: created.id,
        shapeType: type,
        start: p,
        moved: false,
      };
      render();
      capture(e);
      return;
    }
    if (state.tool !== 'select') {
      addAt(state.tool, p);
      return;
    }
    const rotateEl = e.target.closest('.rotate-handle');
    const resizeEl = e.target.closest('.resize');
    if (
      n &&
      n.type === 'frame' &&
      !state.selected.has(n.id) &&
      !e.shiftKey &&
      !rotateEl &&
      !resizeEl &&
      isFrameInterior(n, p)
    ) {
      n = null;
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
    if (e.shiftKey && !rotateEl && !resizeEl) {
      const ids = M.expandGroups(state.board.objects, [n.id]);
      if (state.selected.has(n.id)) ids.forEach((id) => state.selected.delete(id));
      else ids.forEach((id) => state.selected.add(id));
      selectVisual();
      return;
    }
    const wasSelected = state.selected.has(n.id);
    if (!wasSelected) {
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
      wasSelected,
      shiftKey: e.shiftKey,
      movingIds,
      original: state.board.objects.filter((o) => movingIds.has(o.id) && !o.locked).map(M.clone),
      changed: false,
    };
    capture(e);
  });

  $('#canvas').addEventListener('pointermove', (e) => {
    if (!state.drag || (state.drag.pointerId !== undefined && e.pointerId !== state.drag.pointerId))
      return;
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
    if (state.drag.type === 'draw-line') {
      const target = e.shiftKey ? snapLinePoint(state.drag.start, p) : p;
      state.drag.end = target;
      const preview = M.lineRoute({
        points: [state.drag.start, target],
        route: state.drag.opts.route,
      });
      state.connectorDraft = {
        type: 'line',
        d: preview.d,
        ...state.drag.opts,
      };
      renderLines();
      return;
    }
    if (state.drag.type === 'draw-shape') {
      const n = state.board.objects.find((o) => o.id === state.drag.id);
      if (!n) return;
      const dx = p.x - state.drag.start.x,
        dy = p.y - state.drag.start.y;
      if (!state.drag.moved && Math.hypot(dx, dy) * state.view.z < 6) return;
      state.drag.moved = true;
      let w = Math.max(36, Math.abs(dx)),
        h = Math.max(36, Math.abs(dy));
      if (e.shiftKey) {
        const size = Math.max(w, h);
        w = size;
        h = size;
      }
      n.x = Math.round(dx < 0 ? state.drag.start.x - w : state.drag.start.x);
      n.y = Math.round(dy < 0 ? state.drag.start.y - h : state.drag.start.y);
      n.w = Math.round(w);
      n.h = Math.round(h);
      renderFast();
      return;
    }
    if (state.drag.type === 'rebind-connector') {
      const drag = state.drag,
        connector = state.board.objects.find((n) => n.id === drag.id);
      const hit = nearestTargetPort(p, drag.excludeId);
      if (!connector) return;
      const temporary = { ...connector },
        side = drag.side;
      delete temporary[side + 'Port'];
      delete temporary[side + 'Anchor'];
      if (hit) {
        temporary[side] = hit.node.id;
        if (hit.port) temporary[side + 'Port'] = hit.port;
        else if (hit.anchor) temporary[side + 'Anchor'] = hit.anchor;
        const preview = M.connectorRoute(temporary, state.board.objects);
        state.connectorDraft = {
          ...temporary,
          d: preview.d,
          binding: {
            nodeId: hit.node.id,
            port: hit.port,
            anchor: hit.anchor,
            x: hit.port || hit.anchor ? hit.x : side === 'from' ? preview.start.x : preview.end.x,
            y: hit.port || hit.anchor ? hit.y : side === 'from' ? preview.start.y : preview.end.y,
          },
        };
      } else {
        const route = M.connectorRoute(connector, state.board.objects),
          fixed = side === 'from' ? route.end : route.start;
        state.connectorDraft = {
          ...temporary,
          d:
            side === 'from'
              ? `M${p.x},${p.y} L${fixed.x},${fixed.y}`
              : `M${fixed.x},${fixed.y} L${p.x},${p.y}`,
        };
      }
      renderLines();
      return;
    }
    if (state.drag.type === 'connect-port') {
      const hit = nearestTargetPort(p, state.drag.from);
      const fromNode = state.board.objects.find((o) => o.id === state.drag.from);
      const opts = state.drag.opts || currentLineOptions('curved');
      if (hit && fromNode) {
        const preview = M.connectorRoute(
          {
            from: state.drag.from,
            to: hit.node.id,
            fromPort: state.drag.fromPort,
            toPort: hit.port,
            fromAnchor: state.drag.fromAnchor,
            toAnchor: hit.anchor,
            route: opts.route,
          },
          state.board.objects,
        );
        state.connectorDraft = {
          type: 'connector',
          from: state.drag.from,
          fromPort: state.drag.fromPort,
          to: hit.node.id,
          toPort: hit.port,
          fromAnchor: state.drag.fromAnchor,
          toAnchor: hit.anchor,
          binding: {
            nodeId: hit.node.id,
            port: hit.port,
            anchor: hit.anchor,
            x: hit.port || hit.anchor ? hit.x : preview.end.x,
            y: hit.port || hit.anchor ? hit.y : preview.end.y,
          },
          d: preview.d,
          ...opts,
        };
      } else {
        const s = state.drag.startPt;
        state.connectorDraft = {
          type: 'connector',
          from: state.drag.from,
          fromPort: state.drag.fromPort,
          d: `M${s.x},${s.y} L${p.x},${p.y}`,
          ...opts,
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
      if (w * state.view.z < 3 && h * state.view.z < 3) return;
      const ids = state.board.objects
        .filter((n) => {
          const b = M.bounds(n, state.board.objects);
          if (n.type === 'frame' || n.type === 'connector') {
            return b.x >= x && b.y >= y && b.x + b.w <= x + w && b.y + b.h <= y + h;
          }
          return b.x + b.w >= x && b.x <= x + w && b.y + b.h >= y && b.y <= y + h;
        })
        .map((n) => n.id);
      state.selected = M.expandGroups(state.board.objects, [...state.drag.original, ...ids]);
      selectVisual();
      return;
    }
    const n = state.board.objects.find((n) => n.id === state.drag.id);
    if (!n) return;
    if (state.drag.type === 'draw') {
      const last = n.points.at(-1);
      if (Math.hypot(p.x - last.x, p.y - last.y) > 1.5 / state.view.z) {
        n.points.push(roundPt(p));
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
      renderFast();
      return;
    }
    if (state.drag.type === 'curve-edge') {
      const local = localShapePoint(n, p);
      const existing = n.curves?.[state.drag.index];
      if (!state.drag.changed &&
          Math.hypot((existing?.x ?? 50) - local.x, (existing?.y ?? 50) - local.y) < 0.25) return;
      if (!state.drag.changed) {
        snapshot();
        state.drag.changed = true;
      }
      M.moveCurve(n, state.drag.index, local);
      renderFast();
      return;
    }
    if (state.drag.type === 'line-control') {
      if (!state.drag.changed) {
        snapshot();
        state.drag.changed = true;
        n.controls = M.lineControls(n);
      }
      n.controls[state.drag.index] = roundPt(p);
      n.curveEdited = true;
      n.route = 'curved';
      renderLines();
      return;
    }
    if (state.drag.type === 'line-vertex') {
      if (!state.drag.changed) {
        snapshot();
        state.drag.changed = true;
      }
      const otherIdx = state.drag.index === 0 ? n.points.length - 1 : 0;
      const target = e.shiftKey ? snapLinePoint(n.points[otherIdx], p) : p;
      M.moveLineEndpoint(n, state.drag.index, { x: Math.round(target.x), y: Math.round(target.y) });
      renderLines();
      return;
    }
    if (state.drag.type === 'path-vertex') {
      if (!state.drag.changed) {
        snapshot();
        state.drag.changed = true;
      }
      n.points[state.drag.index] = roundPt(p);
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
      renderFast();
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
        lockAspect:
          e.shiftKey || n.type === 'image' || (M.shapes.includes(n.type) && n.lockAspect !== false),
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
    renderFast();
  });

  $('#canvas').addEventListener('pointerup', endPointer);
  $('#canvas').addEventListener('pointercancel', endPointer);
  $('#canvas').addEventListener('lostpointercapture', endPointer);
  $('#canvas').addEventListener('dblclick', (e) => {
    if (
      !allowDoubleClickEdit({
        pointerType: e.pointerType,
        firesTouchEvents: e.sourceCapabilities?.firesTouchEvents,
        lastTouchAt,
        now: Date.now(),
      })
    )
      return;
    if (state.space || state.tool !== 'select' || e.target.closest('[data-open]')) return;
    let id = e.target.closest('[data-id]')?.dataset.id;
    if (id) startEdit(id);
    else if (state.tool === 'select') addAt('sticky', point(e));
  });
}
