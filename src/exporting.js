import { toast } from './notifications.js';
import { finishEdit } from './editor.js';
import { connectorGeometry, shapeSvg } from './rendering.js';
import { state } from './state.js';
import { M, colors, esc } from './core.js';
export function wrapText(text, maxWidth, fontSize) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${fontSize}px sans-serif`;
  const result = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        result.push(line);
        line = word;
      } else line = next;
    }
    result.push(line);
  }
  return result;
}
export function exportSVG() {
  const b = M.enclosing(
      state.board.objects.filter((n) => n.type !== 'connector'),
      state.board.objects,
    ),
    pad = 40;
  const lines = state.board.objects
    .filter((n) => ['path', 'connector'].includes(n.type))
    .map((n) => {
      const d =
        n.type === 'path'
          ? n.points.map((p, i) => (i ? 'L' : 'M') + p.x + ',' + p.y).join(' ')
          : connectorGeometry(n);
      return `<path d="${d}" stroke="${n.color || '#86917b'}" stroke-width="${n.strokeWidth || (n.type === 'path' ? 4 : 2)}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${n.type === 'connector' ? 'marker-end="url(#export-arrow)"' : ''}/>`;
    })
    .join('');
  const objects = state.board.objects
    .filter((n) => !['path', 'connector'].includes(n.type))
    .slice()
    .sort(
      (a, b) => (a.z ?? (a.type === 'frame' ? -10 : 0)) - (b.z ?? (b.type === 'frame' ? -10 : 0)),
    )
    .map((n) => {
      const x = n.x,
        y = n.y,
        w = n.w,
        h = n.h;
      let visual = '';
      if (n.type === 'image')
        visual = `<image href="${esc(n.src)}" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
      else {
        if (M.shapes.includes(n.type))
          visual = shapeSvg(n).replace('class="shape-body"', `width="${w}" height="${h}"`);
        else if (n.type !== 'text')
          visual = `<rect width="${w}" height="${h}" fill="${n.color || colors[0]}" rx="${['file', 'link', 'embed'].includes(n.type) ? 10 : 2}"/>`;
        let font = n.fontSize || (n.type === 'text' ? 22 : n.type === 'frame' ? 12 : 17),
          card = ['link', 'file', 'embed'].includes(n.type),
          text =
            n.text +
            (n.type === 'link'
              ? '\n' + new URL(n.url).hostname
              : n.type === 'file'
                ? '\nPDF document'
                : n.type === 'embed'
                  ? '\n' +
                    ({ video: 'Video', map: 'Map', pdf: 'PDF document' }[n.embedKind] || 'Embed') +
                    '\n' +
                    n.url
                  : ''),
          wrapped = wrapText(text, w - 36, font),
          align = n.align || (n.type === 'text' || n.type === 'frame' || card ? 'left' : 'center'),
          tx = align === 'left' ? 18 : align === 'right' ? w - 18 : w / 2,
          anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle',
          ty =
            n.type === 'frame'
              ? 30
              : n.type === 'text'
                ? font + 4
                : Math.max(font + 15, (h - wrapped.length * font * 1.45) / 2 + font);
        visual += `<text text-anchor="${anchor}" font-family="sans-serif" font-size="${font}" font-weight="${n.fontWeight || (n.type === 'text' ? 700 : 400)}" fill="${n.textColor || (n.type === 'text' ? n.color : '#3c4234')}">${wrapped.map((line, i) => `<tspan x="${tx}" y="${ty + i * font * 1.45}">${esc(line)}</tspan>`).join('')}</text>`;
      }
      return `<g transform="translate(${x} ${y}) rotate(${n.rotation || 0} ${w / 2} ${h / 2})">${visual}</g>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${b.w + pad * 2}" height="${b.h + pad * 2}" viewBox="${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}"><title>${esc(state.board.title)}</title><defs><marker id="export-arrow" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8" fill="none" stroke="context-stroke" stroke-width="1.4"/></marker></defs><rect x="${b.x - pad}" y="${b.y - pad}" width="${b.w + pad * 2}" height="${b.h + pad * 2}" fill="#f9faf7"/>${lines}${objects}</svg>`;
}
export function downloadBlob(content, type, extension) {
  const blob =
      content instanceof Blob
        ? content
        : new Blob([content], {
            type,
          }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = (state.board.title || 'Sparkboard').replace(/[^a-z0-9 -]/gi, '') + '.' + extension;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function download(type) {
  finishEdit();
  if (type === 'json') {
    downloadBlob(
      JSON.stringify(
        {
          ...state.board,
          format: 'sparkboard-v2',
        },
        null,
        2,
      ),
      'application/json',
      'json',
    );
    toast('Editable board exported');
    return;
  }
  const svg = exportSVG();
  if (type === 'svg') {
    downloadBlob(svg, 'image/svg+xml', 'svg');
    toast('SVG exported');
    return;
  }
  if (type === 'pdf') {
    const pop = window.open('', '_blank');
    if (!pop) {
      toast('Allow the print window to save your board as PDF.');
      return;
    }
    pop.document.write(
      `<!doctype html><title>${esc(state.board.title)}</title><style>@page{size:landscape;margin:8mm}body{margin:0;font:14px sans-serif}img{display:block;width:100%;height:92vh;object-fit:contain}p{text-align:center;color:#777}@media print{p{display:none}}</style><p>Choose “Save as PDF” in the print dialog.</p>`,
    );
    pop.document.close();
    const image = pop.document.createElement('img');
    image.onload = () => {
      pop.focus();
      pop.print();
    };
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    pop.document.body.append(image);
    return;
  }
  if (type === 'png')
    try {
      let image = new Image(),
        url = URL.createObjectURL(
          new Blob([svg], {
            type: 'image/svg+xml',
          }),
        );
      image.src = url;
      await image.decode();
      let scale = Math.min(2, 4096 / image.naturalWidth, 4096 / image.naturalHeight),
        canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw Error();
      downloadBlob(blob, 'image/png', 'png');
      toast('PNG exported');
    } catch {
      toast('Could not render PNG. Try SVG export instead.');
    }
}
