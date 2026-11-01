import { CONNECTION_LAYER, objectLayer } from './layers.js';
import { hiddenMindmapIds } from './mindmap-model.js';
import { disposePDFViewers } from './pdf-viewer.js';
import { embedContents } from './embeds.js';
import { properties } from './inspector.js';
import { updateHistory } from './history.js';
import { renderScenes } from './scenes.js';
import { applyView } from './viewport.js';
import { state } from './state.js';
import { $, $$, M, colors, esc } from './core.js';

export function lineDashAttr(style = 'solid', width = 2) {
  const w = Math.max(1, Number(width) || 2);
  if (style === 'dashed') return ` stroke-dasharray="${w * 3.5} ${w * 2.2}"`;
  if (style === 'dotted') return ` stroke-dasharray="0.5 ${w * 2.4}"`;
  return '';
}

export function markerDefs(prefix = '') {
  return `<defs><marker id="${prefix}arrow-arrow" viewBox="0 0 10 10" markerWidth="7" markerHeight="7" refX="8.5" refY="5" orient="auto-start-reverse"><path d="M1.5,1.5 L8.5,5 L1.5,8.5" fill="none" stroke="context-stroke" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker><marker id="${prefix}arrow-filled" viewBox="0 0 10 10" markerWidth="7" markerHeight="7" refX="8.5" refY="5" orient="auto-start-reverse"><path d="M1,1.5 L9,5 L1,8.5 Z" fill="context-stroke" stroke="context-stroke" stroke-width="1" stroke-linejoin="round"/></marker><marker id="${prefix}arrow-circle" viewBox="0 0 10 10" markerWidth="6" markerHeight="6" refX="5" refY="5" orient="auto-start-reverse"><circle cx="5" cy="5" r="3.2" fill="context-stroke"/></marker><marker id="${prefix}arrow-diamond" viewBox="0 0 10 10" markerWidth="7" markerHeight="7" refX="5" refY="5" orient="auto-start-reverse"><path d="M1,5 L5,1.5 L9,5 L5,8.5 Z" fill="context-stroke"/></marker></defs>`;
}

export function markerAttrs(n, prefix = '') {
  const start = n.startArrow && M.arrowHeads.includes(n.startArrow) ? n.startArrow : 'none';
  const defaultEnd = n.type === 'connector' ? 'arrow' : 'none';
  const end = n.endArrow && M.arrowHeads.includes(n.endArrow) ? n.endArrow : defaultEnd;
  return `${start !== 'none' ? ` marker-start="url(#${prefix}arrow-${start})"` : ''}${end !== 'none' ? ` marker-end="url(#${prefix}arrow-${end})"` : ''}`;
}

export function shapeSvg(n) {
  const fill = n.type === 'frame' ? 'none' : n.color || colors[1],
    width = n.strokeWidth ?? 1.3,
    stroke = width > 0 ? n.stroke || '#a8b39c' : 'none',
    dash =
      n.lineStyle && n.lineStyle !== 'solid'
        ? lineDashAttr(n.lineStyle, width)
        : n.type === 'frame'
          ? ' stroke-dasharray="3 2"'
          : '';
  let geometry;
  if (Array.isArray(n.curves) && n.curves.some(Boolean)) geometry = `<path d="${M.shapePath(n)}"/>`;
  else if (Array.isArray(n.vertices) && n.vertices.length >= 3)
    geometry = `<polygon points="${M.verticesToPoints(n.vertices)}"/>`;
  else if (M.polygons[n.type]) geometry = `<polygon points="${M.polygons[n.type]}"/>`;
  else if (n.type === 'circle') geometry = '<ellipse cx="50" cy="50" rx="48" ry="48"/>';
  else if (n.type === 'pill') geometry = '<rect x="2" y="8" width="96" height="84" rx="42"/>';
  else if (n.type === 'cylinder')
    geometry =
      '<path d="M4,18 C4,6 96,6 96,18 L96,82 C96,94 4,94 4,82 Z M4,18 C4,30 96,30 96,18"/>';
  else
    geometry = `<rect x="1" y="1" width="98" height="98" rx="${n.type === 'shape' ? Math.max(0, Math.min(48, (100 * (n.cornerRadius ?? 6)) / Math.max(1, Math.min(n.w, n.h)))) : n.type === 'frame' ? 4 : 6}"/>`;
  geometry = geometry.replace(/\/>/g, ' vector-effect="non-scaling-stroke"/>');
  return `<svg class="shape-body" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash}>${geometry}</svg>`;
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
  return `left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px;transform:rotate(${n.rotation || 0}deg);z-index:${objectLayer(n)};--fill:${n.color || colors[0]};--text-color:${n.textColor || (n.type === 'text' ? n.color : '#3c4234')};font-size:${n.fontSize || (n.type === 'text' ? 22 : n.type === 'frame' ? 12 : 17)}px;font-weight:${n.fontWeight || (n.type === 'text' || n.type === 'frame' ? 700 : 400)};text-align:${n.align || (n.type === 'text' || n.type === 'frame' ? 'left' : 'center')};font-family:${['DM Sans', 'Manrope', 'Georgia', 'Arial', 'monospace'].includes(n.fontFamily) ? n.fontFamily : n.type === 'text' ? 'DM Sans' : 'Manrope'};font-style:${n.fontStyle === 'italic' ? 'italic' : 'normal'};text-decoration:${n.textDecoration === 'underline' ? 'underline' : 'none'};opacity:${Number.isFinite(n.opacity) ? Math.max(0, Math.min(1, n.opacity)) : 1}${n.type === 'sticky' ? `;border-radius:${Math.max(0, Math.min(80, n.cornerRadius ?? 12))}px` : ''}`;
}

export function render() {
  if (!state.board) return;
  disposePDFViewers();
  M.dedupeConnectors(state.board.objects);
  const hidden = hiddenMindmapIds(state.board.objects);
  $('#objects').replaceChildren();
  for (const n of state.board.objects.filter(
    (n) => !['connector', 'line', 'path'].includes(n.type) && !hidden.has(n.id),
  )) {
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
        positionPort(pEl, n, port);
        el.append(pEl);
      }
    }
    if (n.locked)
      el.insertAdjacentHTML('beforeend', '<span class="lock-badge" title="Locked">▣</span>');
    $('#objects').append(el);
  }
  selectVisual();
  applyView();
  renderScenes();
  updateHistory();
  document.dispatchEvent(new Event('sparkboard:render'));
}

export function renderFast() {
  if (!state.board) return;
  const objectsById = new Map(state.board.objects.map((item) => [item.id, item]));
  $$('#objects .object').forEach((el) => {
    const n = objectsById.get(el.dataset.id);
    if (!n) return;
    el.style.cssText = objectStyle(n);
    el.querySelectorAll('.port').forEach((port) => positionPort(port, n, port.dataset.port));
    if (M.shapes.includes(n.type)) {
      const svg = el.querySelector('.shape-body');
      if (svg) svg.outerHTML = shapeSvg(n);
      if (state.reshapeId === n.id) {
        const verts = M.shapeVertices(n);
        const edges = el.querySelectorAll('.edge-handle');
        verts.forEach((v, i) => {
          const next = verts[(i + 1) % verts.length];
          if (edges[i]) {
            edges[i].style.left = `${(v.x + next.x) / 2}%`;
            edges[i].style.top = `${(v.y + next.y) / 2}%`;
          }
        });
        const handles = el.querySelectorAll('.vertex-handle');
        verts.forEach((v, i) => {
          if (handles[i]) {
            handles[i].style.left = `${v.x}%`;
            handles[i].style.top = `${v.y}%`;
          }
        });
        const bends = el.querySelectorAll('.shape-curve-handle');
        verts.forEach((v, i) => {
          const next = verts[(i + 1) % verts.length];
          const handle = n.curves?.[i] || { x: (v.x + next.x) / 2, y: (v.y + next.y) / 2 };
          if (bends[i]) {
            bends[i].style.left = `${handle.x}%`;
            bends[i].style.top = `${handle.y}%`;
          }
        });
      }
    }
  });
  renderLines();
}

function positionPort(element, n, port) {
  const point = M.portPoint({ ...n, rotation: 0 }, port);
  element.style.left = `${point.x - n.x + point.nx * 10}px`;
  element.style.top = `${point.y - n.y + point.ny * 10}px`;
  // Keep the center aligned when the mobile layout enlarges the port.
  element.style.translate = '-50% -50%';
  element.style.right = 'auto';
  element.style.bottom = 'auto';
}

export function connectorGeometry(n) {
  return M.connectorRoute(n, state.board?.objects || []).d;
}

export function renderLines() {
  if (!state.board) return;
  $('#connections').style.zIndex = CONNECTION_LAYER;
  M.dedupeConnectors(state.board.objects);
  const hidden = hiddenMindmapIds(state.board.objects);
  const obstacles = M.obstacleBoxes(state.board.objects.filter((item) => !hidden.has(item.id)));
  const lines = state.board.objects
    .filter(
      (n) =>
        ['connector', 'line', 'path'].includes(n.type) &&
        !hidden.has(n.from) &&
        !hidden.has(n.to) &&
        !(state.drag?.type === 'rebind-connector' && state.drag.id === n.id),
    )
    .slice()
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
    .map((n) => {
      const selected = state.selected.has(n.id);
      if (n.type === 'path') {
        const d = M.smoothPath(n.points);
        const width = n.strokeWidth || 4;
        const halo = selected
          ? `<path class="selection-halo" d="${d}" fill="none" stroke="#ed7959" stroke-width="${width + 6}" stroke-linecap="round" stroke-linejoin="round" opacity="0.32"/>`
          : '';
        const anchors =
          state.reshapeId === n.id && selected && !n.locked
            ? n.points
                .map(
                  (p, i) =>
                    `<circle class="path-vertex" data-id="${n.id}" data-path-vertex="${i}" cx="${p.x}" cy="${p.y}" r="5"/>`,
                )
                .join('')
            : selected && n.points.length
              ? `<circle class="connector-endpoint" data-id="${n.id}" cx="${n.points[0].x}" cy="${n.points[0].y}" r="4"/><circle class="connector-endpoint" data-id="${n.id}" cx="${n.points.at(-1).x}" cy="${n.points.at(-1).y}" r="4"/>`
              : '';
        return `<g data-id="${n.id}" class="${selected ? 'is-selected' : ''}"><path class="path-hit" data-id="${n.id}" d="${d}" fill="none" stroke="transparent" stroke-width="${Math.max(14, width + 10)}" stroke-linecap="round" stroke-linejoin="round"/>${halo}<path data-id="${n.id}" d="${d}" fill="none" stroke="${n.color || '#86917b'}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${lineDashAttr(n.lineStyle, width)}/>${anchors}</g>`;
      }
      const route =
        n.type === 'line' ? M.lineRoute(n) : M.connectorRoute(n, state.board.objects, obstacles);
      if (!route.d) return '';
      const stroke = n.color || '#86917b',
        width = n.strokeWidth || 2,
        dash = lineDashAttr(n.lineStyle || 'solid', width),
        markers = markerAttrs(n);
      const halo = selected
        ? `<path class="selection-halo" d="${route.d}" fill="none" stroke="#ed7959" stroke-width="${width + 6}" stroke-linecap="round" stroke-linejoin="round" opacity="0.28"/>`
        : '';
      const label = n.text
        ? (() => {
            const w = Math.max(44, Math.min(240, n.text.length * 7.4 + 20));
            return `<g class="connector-label" data-id="${n.id}" transform="translate(${route.labelX},${route.labelY})"><rect x="${-w / 2}" y="-12" width="${w}" height="24" rx="12" fill="#ffffffee" stroke="${selected ? '#ed7959' : '#d5dbd0'}" stroke-width="1.2"/><text text-anchor="middle" dominant-baseline="central" font-size="11.5" font-weight="600" fill="#3c4234">${esc(n.text)}</text></g>`;
          })()
        : '';
      const curveControls =
        n.type === 'line' && selected && !n.locked
          ? M.lineControls(n)
              .map((point, index) => {
                const anchor = index === 0 ? route.start : route.end;
                return `<line class="curve-guide" x1="${anchor.x}" y1="${anchor.y}" x2="${point.x}" y2="${point.y}"/><circle class="path-vertex curve-handle" data-id="${n.id}" data-line-control="${index}" cx="${point.x}" cy="${point.y}" r="6"><title>Drag curve handle ${index + 1} to bend this line</title></circle>`;
              })
              .join('')
          : '';
      const handles = selected
        ? n.type === 'line' && !n.locked
          ? `<circle class="path-vertex line-vertex" data-id="${n.id}" data-line-vertex="0" cx="${route.start.x}" cy="${route.start.y}" r="5.5"/><circle class="path-vertex line-vertex" data-id="${n.id}" data-line-vertex="${n.points.length - 1}" cx="${route.end.x}" cy="${route.end.y}" r="5.5"/>`
          : `<circle class="connector-endpoint ${n.locked ? '' : 'connector-binding'}" ${n.locked ? '' : 'data-connector-end="from"'} data-id="${n.id}" cx="${route.start.x}" cy="${route.start.y}" r="${6 / state.view.z}"/><circle class="connector-endpoint ${n.locked ? '' : 'connector-binding'}" ${n.locked ? '' : 'data-connector-end="to"'} data-id="${n.id}" cx="${route.end.x}" cy="${route.end.y}" r="${6 / state.view.z}"/>`
        : '';
      return `<g data-id="${n.id}" class="${selected ? 'is-selected' : ''}"><path class="connector-hit" data-id="${n.id}" d="${route.d}" fill="none" stroke="transparent" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>${halo}<path data-id="${n.id}" d="${route.d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash}${markers}/>${label}${curveControls}${handles}</g>`;
    })
    .join('');
  const draft = state.connectorDraft
    ? `<path class="connector-draft" d="${state.connectorDraft.d}" fill="none" stroke="${state.connectorDraft.color || '#ed7959'}" stroke-width="${state.connectorDraft.strokeWidth || 2}"${state.connectorDraft.lineStyle ? lineDashAttr(state.connectorDraft.lineStyle, state.connectorDraft.strokeWidth || 2) : ' stroke-dasharray="5 4"'} stroke-linecap="round"${markerAttrs(state.connectorDraft)}/>`
    : '';
  const guides = (state.guides || [])
    .map((g) =>
      g.axis === 'x'
        ? `<line class="smart-guide" x1="${g.pos}" y1="${g.from}" x2="${g.pos}" y2="${g.to}"/>`
        : `<line class="smart-guide" x1="${g.from}" y1="${g.pos}" x2="${g.to}" y2="${g.pos}"/>`,
    )
    .join('');
  const binding = state.connectorDraft?.binding;
  const magnet = binding
    ? `<circle class="magnetic-anchor-halo" cx="${binding.x}" cy="${binding.y}" r="${13 / state.view.z}"/><circle class="magnetic-anchor-point" cx="${binding.x}" cy="${binding.y}" r="${4 / state.view.z}"/>`
    : '';
  $$('#objects .object').forEach((el) =>
    el.classList.toggle('connect-target', el.dataset.id === binding?.nodeId),
  );
  $('#connections').innerHTML = markerDefs('') + lines + draft + magnet + guides;
}

export function selectVisual() {
  if (!state.board) return;
  if (state.reshapeId && (!state.selected.has(state.reshapeId) || state.selected.size !== 1)) {
    state.reshapeId = null;
  }
  // Index once rather than scanning the entire board for every rendered element.
  const objectsById = new Map(state.board.objects.map((item) => [item.id, item]));
  $$('#objects .object').forEach((el) => {
    const n = objectsById.get(el.dataset.id);
    if (!n) return;
    const isSelected = state.selected.has(n.id);
    const isReshaping = isSelected && state.reshapeId === n.id && M.shapes.includes(n.type);
    el.classList.toggle('selected', isSelected);
    el.classList.toggle('reshaping', isReshaping);
    el.querySelectorAll(
      '.resize, .rotate-handle, .vertex-handle, .edge-handle, .shape-curve-handle',
    ).forEach((h) => h.remove());
    if (state.selected.size === 1 && isSelected && !n.locked && !state.editing) {
      if (isReshaping) {
        const verts = M.shapeVertices(n);
        const bendMode = state.reshapeMode === 'bend';
        verts.forEach((v, i) => {
          const next = verts[(i + 1) % verts.length];
          const edge = document.createElement('span');
          if (bendMode) {
            edge.className = 'shape-curve-handle';
            edge.dataset.curveEdge = String(i);
            edge.title = 'Drag to bend this outline segment';
            const control = n.curves?.[i] || { x: (v.x + next.x) / 2, y: (v.y + next.y) / 2 };
            edge.style.left = `${control.x}%`;
            edge.style.top = `${control.y}%`;
          } else {
            edge.className = 'edge-handle';
            edge.dataset.edge = String(i);
            edge.title = 'Drag to add an anchor point';
            edge.style.left = `${(v.x + next.x) / 2}%`;
            edge.style.top = `${(v.y + next.y) / 2}%`;
          }
          el.append(edge);
        });
        verts.forEach((v, i) => {
          const handle = document.createElement('span');
          handle.className = 'vertex-handle';
          if (i === state.selectedVertex) handle.classList.add('active-node');
          handle.dataset.vertex = String(i);
          handle.title = 'Drag to reshape · Option/Alt-click to delete point';
          handle.style.left = `${v.x}%`;
          handle.style.top = `${v.y}%`;
          el.append(handle);
        });
      } else {
        for (const dir of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
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
  if (typeof document.dispatchEvent === 'function')
    document.dispatchEvent(new Event('sparkboard:selection'));
}
