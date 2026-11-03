import { toast } from './notifications.js';
import { selectIds } from './selection.js';
import { applyView, centerPoint, point, screenPoint } from './viewport.js';
import { save } from './boards.js';
import { render, renderFast, renderLines, selectVisual } from './rendering.js';
import { finishEdit, startEdit } from './editor.js';
import { setTool } from './tools.js';
import { state } from './state.js';
import { commit, snapshot, updateHistory } from './history.js';
import { $, M, colors, node, uid } from './core.js';
import {
  allowDoubleClickEdit,
  doubleTapOpensText,
  isCompactEditor,
} from './mobile-editor-policy.js';
import { createFlowStep } from './flowchart-model.js';
import {
  addMindChild,
  floatMindTopic,
  hiddenMindmapIds,
  indexMindmap,
  isMindDescendant,
  isMindNode,
  layoutMindmap,
  reparentMindTopic,
} from './mindmap-model.js';

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
  const flow = state.board?.diagramView === 'flowchart' && defaultRoute === 'curved';
  return {
    route: flow ? 'elbow' : $('#line-route')?.value || defaultRoute,
    lineStyle: $('#line-style')?.value || 'solid',
    startArrow: $('#line-start-arrow')?.value || 'none',
    endArrow: flow ? 'filled' : $('#line-end-arrow')?.value || 'arrow',
    color: flow ? '#64748b' : $('#line-color')?.value || '#86917b',
    strokeWidth: flow ? 2.5 : Number($('#line-width')?.value) || 2,
    ...(flow ? { flowEdge: true } : {}),
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
  const role = (o) => (o.mindBranch ? 'branch' : o.relationship ? 'relationship' : 'connector');
  const incomingRole = role(props);
  const existing = state.board.objects.find(
    (o) =>
      o.type === 'connector' &&
      role(o) === incomingRole &&
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

/** Release a dragged connector onto empty canvas to place and link its new endpoint. */
function dropLinkedNode(d, p) {
  const source = state.board?.objects.find((item) => item.id === d.from);
  if (
    !source ||
    source.locked ||
    ['connector', 'line', 'path', 'frame', 'image', 'file', 'embed'].includes(source.type)
  )
    return false;
  const mode = state.board.diagramView || (state.board.kind === 'mindmap' ? 'mindmap' : 'canvas');
  let created;
  commit(() => {
    if ((mode === 'mindmap' || mode === 'outline') && isMindNode(source)) {
      source.mindCollapsed = false;
      created = addMindChild(state.board.objects, {
        id: uid(),
        connectorId: uid(),
        parentId: source.id,
      });
      layoutMindmap(state.board.objects);
    } else if (mode === 'flowchart') {
      created = createFlowStep(state.board.objects, {
        role: 'process',
        fromId: source.id,
        makeId: uid,
        dropPosition: { x: p.x - 102, y: p.y - 48 },
      });
      // Preserve the explicit connection handle where the user started dragging.
      const edge = state.board.objects.find(
        (item) => item.type === 'connector' && item.from === source.id && item.to === created.id,
      );
      if (edge && ['n', 'e', 's', 'w'].includes(d.fromPort)) {
        edge.fromPort = d.fromPort;
        edge.avoidObstacles = false;
      }
      if (edge && d.fromPort === 'c') {
        delete edge.fromPort;
        delete edge.toPort;
      }
      if (edge) delete edge.fromAnchor;
    } else {
      created = node(
        'shape',
        Math.round(p.x - 100),
        Math.round(p.y - 50),
        200,
        100,
        'New node',
        '#e7edff',
        { cornerRadius: 14 },
      );
      state.board.objects.push(created);
      const sides = M.facingPorts(source, created);
      const side = ['n', 'e', 's', 'w'].includes(d.fromPort);
      upsertConnector({
        from: source.id,
        to: created.id,
        ...(side ? { fromPort: d.fromPort, toPort: sides.toPort, avoidObstacles: false } : {}),
        ...(d.opts || currentLineOptions('curved')),
      });
    }
    state.selected = new Set([created.id]);
  });
  state.connectorStart = null;
  setTool('select');
  toast(
    mode === 'mindmap' || mode === 'outline'
      ? 'Branch added · drag into empty space for another'
      : 'Linked node added · drag it to adjust the layout',
  );
  return true;
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

/** A click, or a short slip off a shape, must not count as dragging a node away. */
const CONNECTOR_DRAG_AWAY = 96;

/** The connector stroke leaves the shape. A click there only clears the selection. */
function connectorStrokeBesideShape(edge, p, target) {
  if (
    target?.closest?.(
      '[data-connector-end],[data-connector-waypoint],[data-connector-add],.connector-label',
    )
  )
    return false;
  const pad = 40 / (state.view.z || 1);
  for (const id of [edge.from, edge.to]) {
    const shape = state.board.objects.find((item) => item.id === id);
    if (!shape || ['connector', 'line', 'path'].includes(shape.type)) continue;
    const box = M.bounds(shape, state.board.objects);
    const beside =
      p.x >= box.x - pad &&
      p.x <= box.x + box.w + pad &&
      p.y >= box.y - pad &&
      p.y <= box.y + box.h + pad;
    if (beside && !M.hitsShape(shape, p)) return true;
  }
  return false;
}

let lastShapeTap = null;
let textGestureAt = 0;

function shapeAcceptsText(n) {
  return (
    n &&
    !n.locked &&
    typeof n.text === 'string' &&
    !['connector', 'line', 'path', 'image', 'file', 'embed', 'link'].includes(n.type)
  );
}

/** A second tap on the same shape opens the text box. Empty canvas taps do not. */
function noteShapeTap(drag, e) {
  if (!drag || drag.type !== 'move' || drag.changed || !e || e.type !== 'pointerup') {
    lastShapeTap = null;
    return;
  }
  const n = state.board?.objects.find((item) => item.id === drag.id);
  if (!shapeAcceptsText(n)) {
    lastShapeTap = null;
    return;
  }
  const release = point(e);
  const now = Date.now();
  const previous = lastShapeTap;
  lastShapeTap = { id: n.id, at: now, x: release.x, y: release.y };
  if (
    doubleTapOpensText({
      previous,
      id: n.id,
      at: now,
      x: release.x,
      y: release.y,
      z: state.view.z || 1,
    })
  ) {
    lastShapeTap = null;
    textGestureAt = now;
    startEdit(n.id);
  }
}

/** Drop incoming links when the recipient itself is dragged clear of where it was connected. */
export function detachDraggedRecipients(objects, originals, movingIds, options = {}) {
  const removed = [];
  if (!movingIds?.size) return removed;
  for (let i = objects.length - 1; i >= 0; i--) {
    const edge = objects[i];
    if (edge?.type !== 'connector' || !movingIds.has(edge.to) || movingIds.has(edge.from)) continue;
    if (options.keep?.(edge)) continue;
    const before = originals.find((item) => item.id === edge.to);
    const after = objects.find((item) => item.id === edge.to);
    if (!before || !after) continue;
    const dx = after.x + after.w / 2 - (before.x + before.w / 2);
    const dy = after.y + after.h / 2 - (before.y + before.h / 2);
    if (Math.hypot(dx, dy) < CONNECTOR_DRAG_AWAY) continue;
    objects.splice(i, 1);
    removed.push(edge.id);
  }
  return removed;
}

/** Snap a connector end onto a port, or unhook the recipient end when it is dragged clear. */
export function applyConnectorEndRelease(objects, connectorId, { side, binding } = {}) {
  const connector = objects.find((item) => item.id === connectorId && item.type === 'connector');
  if (!connector || (side !== 'from' && side !== 'to')) return 'missing';
  if (binding?.nodeId && objects.some((item) => item.id === binding.nodeId)) {
    connector[side] = binding.nodeId;
    delete connector[side + 'Port'];
    delete connector[side + 'Anchor'];
    if (binding.port) connector[side + 'Port'] = binding.port;
    else if (binding.anchor) connector[side + 'Anchor'] = binding.anchor;
    return 'snapped';
  }
  // Releasing the handle in empty space must not delete the connector.
  // A click just outside a shape, or a pull that does not land on another
  // shape, leaves the link alone. Delete, or dragging the recipient node
  // clear of where it was connected, is what removes it.
  return 'kept';
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

/** A swimlane is a frame with a header band that folds down to that band. */
export function addSwimlane() {
  if (!state.board) return;
  const center = centerPoint();
  const n = node(
    'frame',
    Math.round(center.x - 240),
    Math.round(center.y - 180),
    480,
    360,
    'SWIMLANE',
    'transparent',
    { swimlane: true },
  );
  commit(() => {
    state.board.objects.push(n);
    state.selected = new Set([n.id]);
  });
  setTool('select');
  toast('Swimlane added. Fold it from the corner.');
}

/** Where a click on a blue dot should drop the linked copy. */
function linkedDropPoint(source, port) {
  const gap = 36;
  const w = 200;
  const h = 100;
  const cx = source.x + source.w / 2;
  const cy = source.y + source.h / 2;
  if (port === 'n') return { x: cx, y: source.y - gap - h / 2 };
  if (port === 's') return { x: cx, y: source.y + source.h + gap + h / 2 };
  if (port === 'w') return { x: source.x - gap - w / 2, y: cy };
  return { x: source.x + source.w + gap + w / 2, y: cy };
}

/**
 * A link between two mind-map topics is a relationship curve whose ends slide
 * until a later drag pins them. A center dot omits ports so the line stays
 * outside shapes. A side dot is fixed and may cross shapes.
 */
function connectionProps(drag, draft) {
  const opts = { ...(drag.opts || currentLineOptions('curved')) };
  const fromNode = state.board.objects.find((item) => item.id === drag.from);
  const toNode = state.board.objects.find((item) => item.id === draft.to);
  const bothMind = isMindNode(fromNode) && isMindNode(toNode);
  // Relationship curves are independent of the hierarchy link, even between
  // a parent and its child; the user can pin either end later.
  const base = { from: drag.from, to: draft.to, ...opts };
  if (bothMind) return { ...base, relationship: true, route: 'curved', endArrow: 'arrow' };
  if (drag.fromPort === 'c') return base;
  if (['n', 'e', 's', 'w'].includes(drag.fromPort)) {
    return {
      ...base,
      fromPort: drag.fromPort,
      toPort: draft.toPort,
      avoidObstacles: false,
    };
  }
  return {
    ...base,
    fromAnchor: drag.fromAnchor,
    toPort: draft.toPort,
    toAnchor: draft.toAnchor,
  };
}

export function capture(e) {
  if (state.drag) state.drag.pointerId = e.pointerId;
  $('#canvas').setPointerCapture(e.pointerId);
}

function mindDropHost(objects, moved, release) {
  const index = indexMindmap(objects);
  const contains = (item, p) => {
    const box = M.bounds(item, objects);
    return p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h;
  };
  const hidden = hiddenMindmapIds(objects);
  const host = [...index.nodes].reverse().find(
    (item) => item.id !== moved.id && !hidden.has(item.id) && contains(item, release),
  ) || null;
  return { host, index, contains };
}

function highlightMindDrop(drag, release) {
  const moving = drag?.type === 'move' && drag.movingIds?.size === 1
    && ['mindmap', 'outline'].includes(state.diagramMode);
  const topic = moving && state.board?.objects.find((item) =>
    item.id === drag.id && isMindNode(item));
  const target = topic ? mindDropHost(state.board.objects, topic, release).host : null;
  const valid = target && !isMindDescendant(state.board.objects, topic.id, target.id);
  document.querySelectorAll('#objects .object').forEach((element) => {
    element.classList.toggle('mind-drop-target', Boolean(valid && target.id === element.dataset.id));
    element.classList.toggle('mind-drop-invalid', Boolean(target && !valid && target.id === element.dataset.id));
  });
}

function settleMindDrop(moved, release, travel) {
  const objects = state.board.objects;
  const { host, index, contains } = mindDropHost(objects, moved, release);
  if (host && isMindDescendant(objects, moved.id, host.id, index)) {
    layoutMindmap(objects);
    toast('A topic stays above its own branch');
    return 'cycle';
  }
  if (host && host.id !== moved.mindParent && reparentMindTopic(objects, moved.id, host.id)) {
    layoutMindmap(objects);
    toast('Topic moved onto that branch');
    return 'reparented';
  }
  const parent = moved.mindParent && index.byId.get(moved.mindParent);
  const center = { x: moved.x + moved.w / 2, y: moved.y + moved.h / 2 };
  if (
    travel >= 48 &&
    moved.mindParent &&
    (!parent || !contains(parent, center)) &&
    floatMindTopic(objects, moved.id)
  ) {
    layoutMindmap(objects);
    toast('Floating topic');
    return 'floated';
  }
  layoutMindmap(objects);
  return 'laid-out';
}

export function endPointer(e) {
  if (!state.drag) return;
  if (e && state.drag.pointerId !== undefined && e.pointerId !== state.drag.pointerId) return;
  const d = state.drag;
  state.drag = null;
  state.guides = [];
  document.querySelectorAll('#objects .mind-drop-target, #objects .mind-drop-invalid')
    .forEach((element) => element.classList.remove('mind-drop-target', 'mind-drop-invalid'));
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
  if (d.type === 'manual-route') {
    renderLines();
    return;
  }
  if (d.type === 'connector-waypoint') {
    if (d.changed) {
      save();
      toast('Manual route saved · Reset bends to restore automatic routing');
    }
    renderLines();
    return;
  }
  if (d.type === 'rebind-connector') {
    const draft = state.connectorDraft;
    state.connectorDraft = null;
    let travel = 0;
    if (e?.type === 'pointerup' && d.origin) {
      const release = point(e);
      travel = Math.hypot(release.x - d.origin.x, release.y - d.origin.y) * (state.view.z || 1);
    }
    // A click, or a pull that does not land on a shape, never retargets or deletes.
    const changing = Boolean(draft?.binding) && travel >= 24;
    let result = 'kept';
    if (e?.type === 'pointerup' && changing)
      commit(() => {
        result = applyConnectorEndRelease(state.board.objects, d.id, {
          side: d.side,
          binding: draft?.binding,
          detached: d.detached,
          selected: state.selected,
        });
      });
    if (result === 'removed') toast('Connection removed');
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
      const props = connectionProps(d, draft);
      let createdId;
      commit(() => {
        createdId = upsertConnector(props);
        state.selected = new Set([createdId]);
      });
      state.connectorStart = null;
      if (d.fromTool) setTool('select');
      selectVisual();
    } else {
      const release = point(e);
      const movedPx =
        d.downPt &&
        Math.hypot(release.x - d.downPt.x, release.y - d.downPt.y) * (state.view.z || 1);
      // A tap on a blue dot duplicates a linked shape. A drag onto empty space drops one there.
      if ((movedPx || 0) < 16 && !d.fromTool) {
        const source = state.board.objects.find((item) => item.id === d.from);
        if (source && dropLinkedNode(d, linkedDropPoint(source, d.fromPort))) return;
      }
      if ((movedPx || 0) >= 48 && dropLinkedNode(d, release)) return;
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
  if (d.type === 'marquee') {
    const current = d.current || d.start;
    const moved = Math.hypot(current.x - d.start.x, current.y - d.start.y) * (state.view.z || 1);
    if (moved < 8) {
      state.selected = new Set(d.original);
      state.reshapeId = null;
    }
    selectVisual();
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
  if (d.type === 'vertex' && !d.changed && isCompactEditor()) {
    state.selectedVertex = d.index;
    selectVisual();
    return;
  }
  if (d.type === 'move' && !d.changed && !d.shiftKey && d.wasSelected && state.selected.size > 1) {
    state.selected = M.expandGroups(state.board.objects, [d.id]);
    selectVisual();
    return;
  }
  if (d.type === 'move' && d.changed && e?.type === 'pointerup') {
    let travel = 0;
    let settlement = null;
    if (d.origin) {
      const release = point(e);
      travel = Math.hypot(release.x - d.origin.x, release.y - d.origin.y) * (state.view.z || 1);
      const moved = state.board.objects.find((item) => item.id === d.id);
      const mapping = state.diagramMode === 'mindmap' || state.diagramMode === 'outline';
      if (mapping && isMindNode(moved) && d.movingIds?.size === 1)
        settlement = settleMindDrop(moved, release, travel);
    }
    // The shape itself has to travel with the pointer. A click outside, or a
    // jump from snapping, does not count as dragging a node away.
    if (travel >= CONNECTOR_DRAG_AWAY) {
      const removed = detachDraggedRecipients(state.board.objects, d.original, d.movingIds, {
        keep: (edge) => edge.mindBranch && settlement && settlement !== 'floated',
      });
      for (const id of removed) state.selected.delete(id);
      if (removed.length)
        toast(removed.length === 1 ? 'Connection removed' : 'Connections removed');
    }
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
    // Tool precedence: a Line gesture always draws, even if it starts on a
    // shape, vertex, selection handle or former connector port.
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
    if (state.tool === 'eraser') {
      state.drag = {
        type: 'erase',
        changed: false,
      };
      eraseAt(p);
      capture(e);
      return;
    }
    const bendHandle = e.target.closest('[data-connector-waypoint]');
    const addBendHandle = e.target.closest('[data-connector-add]');
    if (bendHandle) {
      const edge = state.board.objects.find(
        (item) => item.id === bendHandle.dataset.id && item.type === 'connector',
      );
      const index = Number(bendHandle.dataset.connectorWaypoint);
      if (!edge || edge.locked || !Array.isArray(edge.waypoints) || !edge.waypoints[index]) return;
      if (e.altKey) {
        commit(() => edge.waypoints.splice(index, 1));
        return;
      }
      state.drag = { type: 'connector-waypoint', id: edge.id, index, changed: false };
      capture(e);
      return;
    }
    if (addBendHandle) {
      const edge = state.board.objects.find(
        (item) => item.id === addBendHandle.dataset.id && item.type === 'connector',
      );
      if (!edge || edge.locked || (edge.waypoints?.length || 0) >= 12) return;
      commit(() => {
        edge.waypoints ??= [];
        edge.waypoints.push({ x: Math.round(p.x), y: Math.round(p.y) });
        state.selected = new Set([edge.id]);
      });
      return;
    }
    const bindingHandle = e.target.closest('[data-connector-end]');
    if (state.tool !== 'connector' && bindingHandle && n?.type === 'connector' && !n.locked) {
      const side = bindingHandle.dataset.connectorEnd,
        other = side === 'from' ? 'to' : 'from';
      state.drag = {
        type: 'rebind-connector',
        id: n.id,
        side,
        excludeId: n[other],
        startPt: p,
        origin: p,
        detached: false,
      };
      capture(e);
      e.preventDefault();
      return;
    }
    const foldButton = e.target.closest('[data-frame-fold]');
    if (state.tool === 'select' && foldButton) {
      const frame = state.board.objects.find(
        (item) => item.id === foldButton.dataset.frameFold && item.type === 'frame',
      );
      if (frame && !frame.locked) {
        commit(() => {
          M.toggleFrameFold(frame, state.board.objects);
          if (frame.collapsed) for (const id of frame.foldedIds || []) state.selected.delete(id);
        });
      }
      return;
    }
    const portEl = e.target.closest('.port');
    if (portEl && n && !['path', 'line', 'connector', 'frame'].includes(n.type) && !n.locked) {
      const fromPort = portEl.dataset.port;
      const startPt =
        fromPort === 'c'
          ? { x: n.x + n.w / 2, y: n.y + n.h / 2, nx: 0, ny: 0 }
          : M.portPoint(n, fromPort);
      const opts = currentLineOptions('curved');
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
        downPt: p,
        opts,
      };
      capture(e);
      renderLines();
      return;
    }
    const vertexEl = e.target.closest('.vertex-handle');
    if (state.tool !== 'connector' && vertexEl && n && !n.locked) {
      const idx = Number(vertexEl.dataset.vertex);
      state.selectedVertex = idx;
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
    const shapeCurveEl = e.target.closest('.shape-curve-handle');
    if (state.tool !== 'connector' && shapeCurveEl && n && M.shapes.includes(n.type) && !n.locked) {
      state.drag = {
        type: 'curve-edge',
        id: n.id,
        index: Number(shapeCurveEl.dataset.curveEdge),
        changed: false,
      };
      capture(e);
      return;
    }
    const edgeEl = e.target.closest('.edge-handle');
    if (state.tool !== 'connector' && edgeEl && n && !n.locked) {
      const edgeIdx = Number(edgeEl.dataset.edge);
      snapshot();
      const local = localShapePoint(n, p);
      M.insertVertex(n, edgeIdx, local);
      state.selectedVertex = edgeIdx + 1;
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
    if (state.tool !== 'connector' && curveEl && n?.type === 'line' && !n.locked) {
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
    if (state.tool !== 'connector' && lineVertEl && n && n.type === 'line' && !n.locked) {
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
    if (state.tool !== 'connector' && pathVertEl && n && n.type === 'path' && !n.locked) {
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
      if (!n || ['path', 'line', 'connector', 'frame'].includes(n.type)) {
        const wasConnecting = Boolean(state.connectorStart);
        state.connectorStart = null;
        state.connectorDraft = null;
        if (isCompactEditor() && wasConnecting) setTool('select');
        else renderLines();
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
        fromPort: sourceBinding?.port || null,
        fromAnchor: sourceBinding?.anchor,
        startPt,
        downPt: p,
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
        { w: defaultW, h: defaultH } = M.defaultShapeSize(type),
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
      state.tool === 'select' &&
      !e.target.closest(
        '.port,.resize,.rotate-handle,.vertex-handle,.edge-handle,.shape-curve-handle',
      ) &&
      (n.type === 'connector' ? connectorStrokeBesideShape(n, p, e.target) : !M.hitsShape(n, p))
    )
      n = null;
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
    if (
      n.type === 'connector' &&
      !resizeEl &&
      !e.target.closest(
        '[data-connector-end],[data-connector-waypoint],[data-connector-add],.connector-label',
      )
    ) {
      state.selected = new Set([n.id]);
      selectVisual();
      state.drag = { type: 'manual-route', id: n.id, origin: p, changed: false };
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
      origin: p,
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
    if (state.drag.type === 'manual-route') {
      const edge = state.board.objects.find(
        (item) => item.id === state.drag.id && item.type === 'connector',
      );
      if (!edge || edge.locked) return;
      const travel =
        Math.hypot(p.x - state.drag.origin.x, p.y - state.drag.origin.y) * (state.view.z || 1);
      if (travel < 8) return;
      if (!state.drag.changed) {
        snapshot();
        edge.avoidObstacles = false;
        edge.waypoints = [
          { x: Math.round(state.drag.origin.x), y: Math.round(state.drag.origin.y) },
        ];
        state.drag.changed = true;
        state.drag.type = 'connector-waypoint';
        state.drag.index = 0;
      }
      edge.waypoints[0] = { x: Math.round(p.x), y: Math.round(p.y) };
      renderLines();
      return;
    }
    if (state.drag.type === 'connector-waypoint') {
      const edge = state.board.objects.find(
        (item) => item.id === state.drag.id && item.type === 'connector',
      );
      if (!edge?.waypoints?.[state.drag.index]) return;
      if (!state.drag.changed) snapshot();
      state.drag.changed = true;
      edge.waypoints[state.drag.index] = { x: Math.round(p.x), y: Math.round(p.y) };
      renderLines();
      return;
    }
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
      if (drag.origin && !drag.detached) {
        const dx = (p.x - drag.origin.x) * state.view.z,
          dy = (p.y - drag.origin.y) * state.view.z;
        if (Math.hypot(dx, dy) >= 12) drag.detached = true;
      }
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
      const centerDot = state.drag.fromPort === 'c' || !state.drag.fromPort;
      const sideDot = ['n', 'e', 's', 'w'].includes(state.drag.fromPort);
      if (hit && fromNode) {
        const bothMind = isMindNode(fromNode) && isMindNode(hit.node);
        const preview = M.connectorRoute(
          {
            from: state.drag.from,
            to: hit.node.id,
            ...(centerDot || bothMind ? {} : { fromPort: state.drag.fromPort, toPort: hit.port }),
            route: bothMind ? 'curved' : opts.route,
            ...(sideDot && !bothMind ? { avoidObstacles: false } : {}),
          },
          state.board.objects,
        );
        state.connectorDraft = {
          type: 'connector',
          from: state.drag.from,
          fromPort: centerDot || bothMind ? undefined : state.drag.fromPort,
          to: hit.node.id,
          toPort: centerDot || bothMind ? undefined : hit.port,
          binding: {
            nodeId: hit.node.id,
            port: hit.port,
            anchor: hit.anchor,
            x: hit.port || hit.anchor ? hit.x : preview.end.x,
            y: hit.port || hit.anchor ? hit.y : preview.end.y,
          },
          d: preview.d,
          ...opts,
          ...(bothMind ? { route: 'curved' } : {}),
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
      if (w * state.view.z < 8 && h * state.view.z < 8) return;
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
      const verts = M.shapeVertices(n);
      const start = verts[state.drag.index];
      const end = verts[(state.drag.index + 1) % verts.length];
      const existing = n.curves?.[state.drag.index] || {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
      };
      if (!state.drag.changed && Math.hypot(existing.x - local.x, existing.y - local.y) < 0.25)
        return;
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
    if (!state.drag.changed && Math.hypot(dx, dy) * state.view.z < 8) return;
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
    highlightMindDrop(state.drag, p);
  });

  $('#canvas').addEventListener('pointerup', (e) => {
    const drag = state.drag;
    endPointer(e);
    noteShapeTap(drag, e);
  });
  $('#canvas').addEventListener('pointercancel', (e) => {
    lastShapeTap = null;
    endPointer(e);
  });
  $('#canvas').addEventListener('lostpointercapture', (e) => {
    if (state.drag) lastShapeTap = null;
    endPointer(e);
  });
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
    else if (state.tool === 'select' && Date.now() - textGestureAt > 500) addAt('sticky', point(e));
  });
}
