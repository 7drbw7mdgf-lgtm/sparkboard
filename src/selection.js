import { selectVisual } from './rendering.js';
import { M } from './core.js';
import { state } from './state.js';
export const selectedNodes = () =>
  state.board?.objects.filter((n) => state.selected.has(n.id)) || [];
export const editableNodes = () => selectedNodes().filter((n) => !n.locked);
export function selectIds(ids) {
  state.selected = M.expandGroups(state.board.objects, ids);
  selectVisual();
}
