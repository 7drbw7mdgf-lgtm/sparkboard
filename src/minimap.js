import { hiddenMindmapIds } from './mindmap-model.js';
import { applyView, focusBounds } from './viewport.js';
import { state } from './state.js';
import { $, M } from './core.js';

/** A small map of the board. Click a frame to jump to it, or click empty map to pan. */
export function setupMinimap() {
  const host = document.createElement('div');
  host.id = 'board-minimap';
  host.setAttribute('role', 'navigation');
  host.setAttribute('aria-label', 'Board map. Click a frame to jump to it.');
  host.title = 'Board map. Click a frame to jump to it.';
  const canvas = document.createElement('canvas');
  host.append(canvas);
  document.body.append(host);
  const ctx = canvas.getContext('2d');
  let world = { x: 0, y: 0, w: 1, h: 1 };
  let frames = [];

  function visibleNodes() {
    if (!state.board) return [];
    const hidden = hiddenMindmapIds(state.board.objects);
    const folded = M.foldedObjectIds(state.board.objects);
    return state.board.objects.filter(
      (item) =>
        !['connector', 'line', 'path'].includes(item.type) &&
        !hidden.has(item.id) &&
        !folded.has(item.id),
    );
  }

  function measure() {
    const board = $('#canvas');
    const nodes = visibleNodes();
    const content = nodes.length
      ? M.enclosing(nodes, state.board.objects)
      : { x: 0, y: 0, w: 1200, h: 800 };
    const z = state.view.z || 1;
    const vx = -state.view.x / z;
    const vy = -state.view.y / z;
    const vw = (board?.clientWidth || 800) / z;
    const vh = (board?.clientHeight || 600) / z;
    const x = Math.min(content.x, vx);
    const y = Math.min(content.y, vy);
    const right = Math.max(content.x + content.w, vx + vw);
    const bottom = Math.max(content.y + content.h, vy + vh);
    world = {
      x: x - 60,
      y: y - 60,
      w: Math.max(240, right - x + 120),
      h: Math.max(180, bottom - y + 120),
      vx,
      vy,
      vw,
      vh,
    };
    frames = nodes.filter((item) => item.type === 'frame');
    return nodes;
  }

  function draw() {
    if (!ctx || host.hidden) return;
    const rect = host.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const nodes = state.board ? measure() : [];
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#f7f6f2';
    ctx.fillRect(0, 0, rect.width, rect.height);
    const sx = rect.width / world.w;
    const sy = rect.height / world.h;
    const mapX = (x) => (x - world.x) * sx;
    const mapY = (y) => (y - world.y) * sy;
    for (const item of nodes) {
      const box = M.bounds(item, state.board.objects);
      ctx.fillStyle = item.type === 'frame' ? '#e8edff' : item.color || '#d5d8e2';
      ctx.strokeStyle = item.type === 'frame' ? '#4262ff' : '#9aa3b5';
      ctx.lineWidth = item.type === 'frame' ? 1.4 : 0.6;
      const x = mapX(box.x);
      const y = mapY(box.y);
      const w = Math.max(2, box.w * sx);
      const h = Math.max(2, box.h * sy);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }
    ctx.strokeStyle = '#4262ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      mapX(world.vx),
      mapY(world.vy),
      Math.max(4, world.vw * sx),
      Math.max(4, world.vh * sy),
    );
  }

  function boardPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const u = (event.clientX - rect.left) / Math.max(1, rect.width);
    const v = (event.clientY - rect.top) / Math.max(1, rect.height);
    return { x: world.x + u * world.w, y: world.y + v * world.h };
  }

  host.addEventListener('pointerdown', (event) => {
    if (!state.board || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    measure();
    const at = boardPoint(event);
    const hit = frames
      .filter((frame) => {
        const box = M.bounds(frame, state.board.objects);
        return at.x >= box.x && at.x <= box.x + box.w && at.y >= box.y && at.y <= box.y + box.h;
      })
      .sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (hit) {
      focusBounds(M.bounds(hit, state.board.objects));
      return;
    }
    const board = $('#canvas');
    state.view.x = board.clientWidth / 2 - at.x * state.view.z;
    state.view.y = board.clientHeight / 2 - at.y * state.view.z;
    applyView();
  });

  document.addEventListener('sparkboard:render', draw);
  document.addEventListener('sparkboard:view', draw);
  window.addEventListener('resize', draw);
}
