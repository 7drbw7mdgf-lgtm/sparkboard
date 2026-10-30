import { disposePDFViewers } from './pdf-viewer.js';
import { embedContents } from './embeds.js';
import { properties } from './inspector.js';
import { updateHistory } from './history.js';
import { renderScenes } from './scenes.js';
import { applyView } from './viewport.js';
import { state } from './state.js';
import { $, $$, M, colors, esc } from './core.js';

export function shapeSvg(n) {
  const fill = n.type === 'frame' ? 'none' : n.color || colors[1],
    stroke = n.stroke || '#a8b39c',
    width = n.strokeWidth ?? 1.3;
  let geometry;
  if (Array.isArray(n.vertices) && n.vertices.length >= 3)
    geometry = `<polygon points="${M.verticesToPoints(n.vertices)}"/>`;
  else if (M.polygons[n.type]) geometry = `<polygon points="${M.polygons[n.type]}"/>`;
  else if (n.type === 'circle') geometry = '<ellipse cx="50" cy="50" rx="48" ry="48"/>';
  else geometry = `<rect x="1" y="1" width="98" height="98" rx="${n.type === 'frame' ? 4 : 6}"/>`;
  geometry = geometry.replace(/\/>/g, ' vector-effect="non-scaling-stroke"/>');
  return `<svg class="shape-body" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" fill="${fill}" stroke="${stroke}" stroke-width="${width}" ${n.type === 'frame' ? 'stroke-dasharray="3 2"' : ''}>${geometry}</svg>`;
}

export function objectContents(n) {
  if (n.type === 'embed' || n.type === 'file') return embedContents(n);
  if (n.type === 'image') return `<img src="${esc(n.src)}" alt="${esc(n.text)}" draggable="false">`;
  if (n.type === 'link') {
    let url = M.safeUrl(n.url);
    return `<div class="link-art">↗<span>LINK</span></div><div class="card-copy"><b>${esc(n.text || 'Web link')}</b><span>${esc(url ? new URL(url).hostname : 'Invalid link')}</span>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-open="true">Open link ↗</a>` : ''}</div>`;
  }
  return `${M.shapes.includes(n.type) ? shapeSvg(n) : ''}<span class="object-text">${esc(n.text)}</span>`;
}

export function objectStyle(n) {
  return `left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px;transform:rotate(${n.rotation || 0}deg);z-index:${n.z ?? (n.type === 'frame' ? -10 : 0)};--fill:${n.color || colors[0]};--text-color:${n.textColor || (n.type === 'text' ? n.color : '#3c4234')};font-size:${n.fontSize || (n.type === 'text' ? 22 : n.type === 'frame' ? 12 : 17)}px;font-weight:${n.fontWeight || (n.type === 'text' || n.type === 'frame' ? 700 : 400)};text-align:${n.align || (n.type === 'text' || n.type === 'frame' ? 'left' : 'center')}`;
}

export function render() {
  if (!state.board) return;
  disposePDFViewers();
  $('#objects').replaceChildren();
  for (const n of state.board.objects.filter((n) => !['connector', 'path'].includes(n.type))) {
    const el = document.createElement('div');
    el.className = `object ${n.type} ${M.shapes.includes(n.type) ? 'geometric' : ''} ${state.selected.has(n.id) ? 'selected' : ''} ${n.locked ? 'locked' : ''}`;
    el.dataset.id = n.id;
    el.style.cssText = objectStyle(n);
    el.innerHTML = objectContents(n);
    if (!['frame'].includes(n.type)) {
      for (const port of M.ports) {
        const pEl = document.createElement('span');
        pEl.className = `port port-${port}`;
        pEl.dataset.port = port;
        pEl.title = `Drag to connect (${port.toUpperCase()})`;
        el.append(pEl);
      }
    }
    if (n.locked)
      el.insertAdjacentHTML('beforeend', '<span class="lock-badge" title="Locked">▣</span>');
    $('#objects').append(el);
  }
  renderLines();
  selectVisual();
  applyView();
  renderScenes();
  updateHistory();
}

export function connectorGeometry(n) {
  return M.connectorRoute(n, state.board?.objects || []).d;
}

export function renderLines() {
  if (!state.board) return;
  const lines = state.board.objects
    .filter((n) => ['connector', 'path'].includes(n.type))
    .map((n) => {
      const selected = state.selected.has(n.id);
      if (n.type === 'path') {
        const d = M.smoothPath(n.points);
        const anchors =
          state.reshapeId === n.id && selected && !n.locked
            ? n.points
                .map(
                  (p, i) =>
                    `<circle class="path-vertex" data-id="${n.id}" data-path-vertex="${i}" cx="${p.x}" cy="${p.y}" r="5"/>`,
                )
                .join('')
            : '';
        return `<g data-id="${n.id}"><path class="path-hit" data-id="${n.id}" d="${d}" fill="none" stroke="transparent" stroke-width="${Math.max(14, (n.strokeWidth || 4) + 10)}" stroke-linecap="round" stroke-linejoin="round"/><path data-id="${n.id}" d="${d}" fill="none" stroke="${selected ? '#ed7959' : n.color || '#86917b'}" stroke-width="${n.strokeWidth || 4}" stroke-linecap="round" stroke-linejoin="round"/>${anchors}</g>`;
      }
      const route = M.connectorRoute(n, state.board.objects);
      if (!route.d) return '';
      const stroke = selected ? '#ed7959' : n.color || '#86917b';
      const label = n.text
        ? (() => {
            const w = Math.max(44, Math.min(240, n.text.length * 7.4 + 20));
            return `<g class="connector-label" data-id="${n.id}" transform="translate(${route.labelX},${route.labelY})"><rect x="${-w / 2}" y="-12" width="${w}" height="24" rx="12" fill="#ffffffee" stroke="${selected ? '#ed7959' : '#d5dbd0'}" stroke-width="1.2"/><text text-anchor="middle" dominant-baseline="central" font-size="11.5" font-weight="600" fill="#3c4234">${esc(n.text)}</text></g>`;
          })()
        : '';
      return `<g data-id="${n.id}"><path class="connector-hit" data-id="${n.id}" d="${route.d}" fill="none" stroke="transparent" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><path data-id="${n.id}" d="${route.d}" fill="none" stroke="${stroke}" stroke-width="${n.strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrowhead)"/>${label}</g>`;
    })
    .join('');
  const draft = state.connectorDraft
    ? `<path class="connector-draft" d="${state.connectorDraft.d}" fill="none" stroke="#ed7959" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round" marker-end="url(#arrowhead)"/>`
    : '';
  const guides = (state.guides || [])
    .map((g) =>
      g.axis === 'x'
        ? `<line class="smart-guide" x1="${g.pos}" y1="${g.from}" x2="${g.pos}" y2="${g.to}"/>`
        : `<line class="smart-guide" x1="${g.from}" y1="${g.pos}" x2="${g.to}" y2="${g.pos}"/>`,
    )
    .join('');
  $('#connections').innerHTML =
    '<defs><marker id="arrowhead" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8" fill="none" stroke="context-stroke" stroke-width="1.4"/></marker></defs>' +
    lines +
    draft +
    guides;
}

export function selectVisual() {
  if (!state.board) return;
  if (state.reshapeId && (!state.selected.has(state.reshapeId) || state.selected.size !== 1)) {
    state.reshapeId = null;
  }
  $$('#objects .object').forEach((el) => {
    const n = state.board.objects.find((n) => n.id === el.dataset.id);
    if (!n) return;
    const isSelected = state.selected.has(n.id);
    const isReshaping = isSelected && state.reshapeId === n.id && M.shapes.includes(n.type);
    el.classList.toggle('selected', isSelected);
    el.classList.toggle('reshaping', isReshaping);
    el.querySelectorAll('.resize, .rotate-handle, .vertex-handle, .edge-handle').forEach((h) =>
      h.remove(),
    );
    if (state.selected.size === 1 && isSelected && !n.locked && !state.editing) {
      if (isReshaping) {
        const verts = M.shapeVertices(n);
        verts.forEach((v, i) => {
          const next = verts[(i + 1) % verts.length];
          const edge = document.createElement('span');
          edge.className = 'edge-handle';
          edge.dataset.edge = String(i);
          edge.title = 'Drag or click to insert a new anchor point';
          edge.style.left = `${(v.x + next.x) / 2}%`;
          edge.style.top = `${(v.y + next.y) / 2}%`;
          el.append(edge);
        });
        verts.forEach((v, i) => {
          const handle = document.createElement('span');
          handle.className = 'vertex-handle';
          handle.dataset.vertex = String(i);
          handle.title = 'Drag to reshape · Option/Alt-click to delete point';
          handle.style.left = `${v.x}%`;
          handle.style.top = `${v.y}%`;
          el.append(handle);
        });
      } else {
        for (const dir of ['nw', 'ne', 'sw', 'se']) {
          const h = document.createElement('span');
          h.className = `resize ${dir}`;
          h.dataset.dir = dir;
          h.title = 'Drag to resize (Shift to lock aspect ratio)';
          el.append(h);
        }
        const rot = document.createElement('span');
        rot.className = 'rotate-handle';
        rot.dataset.rotate = 'true';
        rot.title = 'Drag to rotate (Shift to snap 15°)';
        el.append(rot);
      }
    }
  });
  renderLines();
  properties();
  updateHistory();
}
