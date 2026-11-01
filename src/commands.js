import { toast } from './notifications.js';
import { selectVisual } from './rendering.js';
import { M, uid } from './core.js';
import { state } from './state.js';
import { commit } from './history.js';
import { editableNodes, selectedNodes } from './selection.js';
export function deleteSelected() {
  if (!editableNodes().length) return;
  commit(() => {
    const ids = new Set(editableNodes().map((n) => n.id));
    state.board.objects = state.board.objects.filter(
      (n) => !ids.has(n.id) && !ids.has(n.from) && !ids.has(n.to),
    );
    state.selected.clear();
    state.reshapeId = null;
  });
}
export function duplicate() {
  if (!editableNodes().length) return;
  commit(() => {
    const expanded = new Set(state.selected);
    for (const id of state.selected) {
      const n = state.board.objects.find((o) => o.id === id);
      if (n?.type === 'frame') {
        M.frameChildren(state.board.objects, n.id).forEach((cid) => expanded.add(cid));
      }
    }
    const copies = M.duplicate(state.board.objects, expanded, uid);
    state.board.objects.push(...copies);
    state.selected = new Set(copies.map((n) => n.id));
    state.reshapeId = null;
  });
}
export function toggleLock() {
  const allLocked = selectedNodes().every((n) => n.locked);
  state.reshapeId = null;
  commit(() => selectedNodes().forEach((n) => (n.locked = !allLocked)));
  toast(allLocked ? 'Selection unlocked' : 'Selection locked');
}
export function toggleReshape() {
  const ns = editableNodes();
  if (ns.length !== 1) return;
  const n = ns[0];
  if (!M.shapes.includes(n.type) && n.type !== 'path') return;
  state.reshapeId = state.reshapeId === n.id ? null : n.id;
  state.reshapeMode = 'points';
  selectVisual();
  toast(
    state.reshapeId
      ? 'Outline editing: move nodes, drag + handles to add points, or choose Bend to curve edges'
      : 'Outline editing finished',
  );
}
export function setOutlineMode(mode) {
  if (!['points', 'bend'].includes(mode) || !state.reshapeId) return;
  state.reshapeMode = mode;
  selectVisual();
  toast(mode === 'bend' ? 'Drag blue curve handles to bend each outline edge' : 'Drag white anchor nodes to reshape the outline');
}

export function command(action) {
  if (action === 'lock') {
    toggleLock();
    return;
  }
  if (action === 'reshape') {
    toggleReshape();
    return;
  }
  if (!editableNodes().length) return;
  commit(() => {
    const ns = editableNodes();
    if (action === 'reset-vertices') {
      ns.forEach((n) => {
        delete n.vertices;
        M.resetCurves(n);
      });
      state.reshapeId = null;
      state.reshapeMode = 'points';
    }
    if (action === 'bold') ns.forEach((n) => (n.fontWeight = n.fontWeight === 700 ? 400 : 700));
    if (action === 'group') {
      let group = uid();
      ns.forEach((n) => (n.group = group));
    }
    if (action === 'ungroup') ns.forEach((n) => delete n.group);
    if (action === 'front' || action === 'back') {
      let zs = state.board.objects.map((n) => n.z ?? (n.type === 'frame' ? -10 : 0)),
        base = action === 'front' ? Math.max(...zs) + 1 : Math.min(...zs) - ns.length;
      ns.forEach((n, i) => (n.z = base + i));
    }
  });
}
