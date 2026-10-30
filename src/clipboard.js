import { centerPoint } from './viewport.js';
import { commit } from './history.js';
import { insertFiles } from './media.js';
import { toast } from './notifications.js';
import { selectedNodes } from './selection.js';
import { state } from './state.js';
import { $, M, colors, node, uid } from './core.js';
import { activeEditor } from './editor.js';
export function setupClipboard() {
  document.addEventListener('copy', (e) => {
    if (
      !state.board ||
      document.body.classList.contains('workspace-empty') ||
      activeEditor() ||
      $('#dialog').open ||
      !state.selected.size
    )
      return;
    const nodes = selectedNodes().map(M.clone),
      ids = new Set(nodes.map((n) => n.id)),
      valid = nodes.filter((n) => n.type !== 'connector' || (ids.has(n.from) && ids.has(n.to)));
    state.clipboard = valid;
    e.clipboardData.setData('text/plain', 'sparkboard-objects:' + JSON.stringify(valid));
    e.preventDefault();
    toast(`${valid.length} items copied`);
  });
  document.addEventListener('paste', (e) => {
    if (
      !state.board ||
      document.body.classList.contains('workspace-empty') ||
      activeEditor() ||
      $('#dialog').open
    )
      return;
    if (e.clipboardData.files.length) {
      e.preventDefault();
      insertFiles(e.clipboardData.files);
      return;
    }
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    if (text.startsWith('sparkboard-objects:')) {
      try {
        const objects = M.validateBoard({
          objects: JSON.parse(text.slice('sparkboard-objects:'.length)),
        }).objects;
        objects.forEach((n) => (n.locked = false));
        commit(() => {
          const copies = M.duplicate(objects, new Set(objects.map((n) => n.id)), uid);
          const b = M.enclosing(copies, copies),
            p = centerPoint();
          copies.forEach((n) => M.translate(n, p.x - b.x - b.w / 2, p.y - b.y - b.h / 2));
          state.board.objects.push(...copies);
          state.selected = new Set(copies.map((n) => n.id));
        });
        toast('Items pasted');
      } catch {
        toast('These copied items could not be pasted');
      }
      return;
    }
    if (M.safeUrl(text.trim())) {
      let p = centerPoint(),
        url = M.safeUrl(text.trim());
      commit(() => {
        let n = node('link', p.x - 145, p.y - 90, 290, 180, new URL(url).hostname, '#ffffff', {
          url,
        });
        state.board.objects.push(n);
        state.selected = new Set([n.id]);
      });
      return;
    }
    const p = centerPoint();
    commit(() => {
      let n = node('sticky', p.x - 110, p.y - 100, 220, 200, text.slice(0, 10000), colors[0]);
      state.board.objects.push(n);
      state.selected = new Set([n.id]);
    });
  });
}
