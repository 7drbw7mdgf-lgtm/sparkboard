import { finishEdit } from './editor.js';
import { state } from './state.js';
import { $, M } from './core.js';
export function applyView() {
  $('#world').style.transform =
    `translate(${state.view.x}px,${state.view.y}px) scale(${state.view.z})`;
  $('#canvas').style.backgroundSize = `${22 * state.view.z}px ${22 * state.view.z}px`;
  $('#canvas').style.backgroundPosition = `${state.view.x}px ${state.view.y}px`;
  $('#canvas').classList.toggle('no-grid', state.board?.grid === false);
  $('#grid-toggle').setAttribute('aria-pressed', String(state.board?.grid !== false));
  const gridLabel =
    state.board?.grid === false
      ? 'Grid and snapping off'
      : state.board?.snap
        ? 'Grid and snapping on'
        : 'Grid on, snapping off';
  $('#grid-toggle').setAttribute('aria-label', gridLabel);
  $('#grid-toggle').title = gridLabel + ' · Toggle grid and snapping';
  $('#zoom-level').textContent = Math.round(state.view.z * 100) + '%';
}
export function point(e) {
  const r = $('#canvas').getBoundingClientRect();
  return {
    x: (e.clientX - r.left - state.view.x) / state.view.z,
    y: (e.clientY - r.top - state.view.y) / state.view.z,
  };
}
export function screenPoint(p) {
  return {
    x: p.x * state.view.z + state.view.x,
    y: p.y * state.view.z + state.view.y + $('#canvas').getBoundingClientRect().top,
  };
}
export function centerPoint() {
  return point({
    clientX: innerWidth / 2,
    clientY: $('#canvas').getBoundingClientRect().top + $('#canvas').clientHeight / 2,
  });
}
export function zoom(z, cx = innerWidth / 2, cy = $('#canvas').clientHeight / 2) {
  finishEdit();
  let next = Math.min(3, Math.max(0.1, z));
  state.view.x = cx - ((cx - state.view.x) * next) / state.view.z;
  state.view.y = cy - ((cy - state.view.y) * next) / state.view.z;
  state.view.z = next;
  applyView();
}
export function focusBounds(box) {
  finishEdit();
  const availW = Math.max(170, innerWidth - (state.inspectorOpen ? 410 : 200)),
    availH = Math.max(160, $('#canvas').clientHeight - 160);
  state.view.z = Math.max(
    0.1,
    Math.min(1.3, availW / Math.max(box.w, 1), availH / Math.max(box.h, 1)),
  );
  state.view.x =
    (innerWidth - (state.inspectorOpen ? 260 : 0) - box.w * state.view.z) / 2 -
    box.x * state.view.z;
  state.view.y = ($('#canvas').clientHeight - box.h * state.view.z) / 2 - box.y * state.view.z;
  applyView();
}
export function fit() {
  if (!state.board) return;
  if (!state.board.objects.length) {
    state.view = {
      x: 0,
      y: 0,
      z: 1,
    };
    applyView();
    return;
  }
  focusBounds(
    M.enclosing(
      state.board.objects.filter((n) => n.type !== 'connector'),
      state.board.objects,
    ),
  );
}
export function setupViewport() {
  $('#canvas').addEventListener(
    'wheel',
    (e) => {
      if (e.target.closest('.pdf-viewer') && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey)
        zoom(
          state.view.z * Math.exp(-e.deltaY * 0.007),
          e.clientX,
          e.clientY - $('#canvas').getBoundingClientRect().top,
        );
      else {
        state.view.x -= e.deltaX;
        state.view.y -= e.deltaY;
        applyView();
      }
    },
    {
      passive: false,
    },
  );
}
