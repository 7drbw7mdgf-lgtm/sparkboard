import { toast } from './notifications.js';
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
  });
}
export function duplicate() {
  if (!editableNodes().length) return;
  commit(() => {
    const copies = M.duplicate(state.board.objects, state.selected, uid);
    state.board.objects.push(...copies);
    state.selected = new Set(copies.map((n) => n.id));
  });
}
export function toggleLock() {
  const allLocked = selectedNodes().every((n) => n.locked);
  commit(() => selectedNodes().forEach((n) => (n.locked = !allLocked)));
  toast(allLocked ? 'Selection unlocked' : 'Selection locked');
}
export function command(action) {
  if (action === 'lock') {
    toggleLock();
    return;
  }
  if (!editableNodes().length) return;
  commit(() => {
    const ns = editableNodes();
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
