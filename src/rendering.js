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
  if (M.polygons[n.type]) geometry = `<polygon points="${M.polygons[n.type]}"/>`;
  else if (n.type === 'circle') geometry = '<ellipse cx="50" cy="50" rx="48" ry="48"/>';
  else geometry = `<rect x="1" y="1" width="98" height="98" rx="${n.type === 'frame' ? 4 : 6}"/>`;
  geometry = geometry.replace(/\/>/g, ' vector-effect="non-scaling-stroke"/>');
  return `<svg class="shape-body" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" fill="${fill}" stroke="${stroke}" stroke-width="${width}" ${n.type === 'frame' ? 'stroke-dasharray="3 2"' : ''}>${geometry}</svg>`;
}
export function objectContents(n) {
  if (n.type === 'image') return `<img src="${esc(n.src)}" alt="${esc(n.text)}" draggable="false">`;
  if (n.type === 'link') {
    let url = M.safeUrl(n.url);
    return `<div class="link-art">↗<span>LINK</span></div><div class="card-copy"><b>${esc(n.text || 'Web link')}</b><span>${esc(url ? new URL(url).hostname : 'Invalid link')}</span>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-open="true">Open link ↗</a>` : ''}</div>`;
  }
  if (n.type === 'file')
    return `<div class="file-art">PDF</div><div class="card-copy"><b>${esc(n.text)}</b><span>PDF document · ${Math.round((n.size || 0) / 1024)} KB</span><a href="${esc(n.src)}" download="${esc(n.text)}" data-open="true">Download PDF ↓</a></div>`;
  return `${M.shapes.includes(n.type) ? shapeSvg(n) : ''}<span class="object-text">${esc(n.text)}</span>`;
}
export function objectStyle(n) {
  return `left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px;transform:rotate(${n.rotation || 0}deg);z-index:${n.z ?? (n.type === 'frame' ? -10 : 0)};--fill:${n.color || colors[0]};--text-color:${n.textColor || (n.type === 'text' ? n.color : '#3c4234')};font-size:${n.fontSize || (n.type === 'text' ? 22 : n.type === 'frame' ? 12 : 17)}px;font-weight:${n.fontWeight || (n.type === 'text' || n.type === 'frame' ? 700 : 400)};text-align:${n.align || (n.type === 'text' || n.type === 'frame' ? 'left' : 'center')}`;
}
export function render() {
  if (!state.board) return;
  $('#objects').replaceChildren();
  for (const n of state.board.objects.filter((n) => !['connector', 'path'].includes(n.type))) {
    const el = document.createElement('div');
    el.className = `object ${n.type} ${M.shapes.includes(n.type) ? 'geometric' : ''} ${state.selected.has(n.id) ? 'selected' : ''} ${n.locked ? 'locked' : ''}`;
    el.dataset.id = n.id;
    el.style.cssText = objectStyle(n);
    el.innerHTML = objectContents(n);
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
  let a = state.board.objects.find((o) => o.id === n.from),
    b = state.board.objects.find((o) => o.id === n.to);
  if (!a || !b) return '';
  let ax = a.x + a.w / 2,
    ay = a.y + a.h / 2,
    bx = b.x + b.w / 2,
    by = b.y + b.h / 2,
    dx = bx - ax,
    dy = by - ay;
  if (!dx && !dy) return '';
  let sa = Math.min((a.w / 2 + 7) / (Math.abs(dx) || 1), (a.h / 2 + 7) / (Math.abs(dy) || 1)),
    sb = Math.min((b.w / 2 + 7) / (Math.abs(dx) || 1), (b.h / 2 + 7) / (Math.abs(dy) || 1));
  return `M${ax + dx * sa},${ay + dy * sa} L${bx - dx * sb},${by - dy * sb}`;
}
export function renderLines() {
  $('#connections').innerHTML =
    '<defs><marker id="arrowhead" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8" fill="none" stroke="context-stroke" stroke-width="1.4"/></marker></defs>' +
    state.board.objects
      .filter((n) => ['connector', 'path'].includes(n.type))
      .map((n) => {
        let d =
          n.type === 'path'
            ? n.points.map((p, i) => (i ? 'L' : 'M') + p.x + ',' + p.y).join(' ')
            : connectorGeometry(n);
        return `<path data-id="${n.id}" d="${d}" fill="none" stroke="${state.selected.has(n.id) ? '#ed7959' : n.color || '#86917b'}" stroke-width="${n.strokeWidth || (n.type === 'path' ? 4 : 2)}" stroke-linecap="round" stroke-linejoin="round" ${n.type === 'connector' ? 'marker-end="url(#arrowhead)"' : ''}/>`;
      })
      .join('');
}
export function selectVisual() {
  $$('#objects .object').forEach((el) => {
    const n = state.board.objects.find((n) => n.id === el.dataset.id);
    el.classList.toggle('selected', state.selected.has(n.id));
    el.querySelector('.resize')?.remove();
    if (state.selected.size === 1 && state.selected.has(n.id) && !n.locked) {
      const h = document.createElement('span');
      h.className = 'resize';
      el.append(h);
    }
  });
  renderLines();
  properties();
  updateHistory();
}
