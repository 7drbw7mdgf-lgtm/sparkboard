import { resolveEmbed } from './src/embed-model.js';
const shapes = [
  'shape',
  'pill',
  'circle',
  'triangle',
  'diamond',
  'pentagon',
  'hexagon',
  'octagon',
  'parallelogram',
  'trapezoid',
  'star',
  'cross',
  'arrow',
  'bubble',
  'cloud',
  'cylinder',
  'heart',
  'frame',
];
const types = [
  'sticky',
  'text',
  ...shapes,
  'line',
  'path',
  'connector',
  'image',
  'link',
  'file',
  'embed',
];
const ports = ['n', 'e', 's', 'w'];
const routes = ['straight', 'curved', 'elbow'];
const lineStyles = ['solid', 'dashed', 'dotted'];
const arrowHeads = ['none', 'arrow', 'filled', 'circle', 'diamond'];
const polygons = {
  triangle: '50,3 98,97 2,97',
  diamond: '50,1 99,50 50,99 1,50',
  pentagon: '50,2 98,38 80,96 20,96 2,38',
  hexagon: '25,2 75,2 99,50 75,98 25,98 1,50',
  octagon: '30,2 70,2 98,30 98,70 70,98 30,98 2,70 2,30',
  parallelogram: '20,4 98,4 80,96 2,96',
  trapezoid: '18,4 82,4 98,96 2,96',
  star: '50,1 62,34 98,35 70,57 79,94 50,73 21,94 30,57 2,35 38,34',
  cross: '35,2 65,2 65,35 98,35 98,65 65,65 65,98 35,98 35,65 2,65 2,35 35,35',
  arrow: '0,28 63,28 63,3 100,50 63,97 63,72 0,72',
  bubble: '5,3 95,3 99,8 99,76 94,81 40,81 19,100 19,81 5,81 1,76 1,8',
  cloud: '24,78 10,78 3,66 6,50 18,42 24,25 40,18 56,22 68,14 84,20 92,36 98,50 94,68 82,78 52,78',
  heart: '50,94 16,62 3,40 8,18 26,8 43,14 50,26 57,14 74,8 92,18 97,40 84,62',
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const clampCoord = (v) => Math.max(-25, Math.min(125, Math.round(v * 100) / 100));

function defaultVertices(type) {
  if (polygons[type]) {
    return polygons[type].split(/\s+/).map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    });
  }
  if (type === 'circle') {
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI * 2) / 12 - Math.PI / 2;
      return {
        x: Math.round((50 + 48 * Math.cos(a)) * 100) / 100,
        y: Math.round((50 + 48 * Math.sin(a)) * 100) / 100,
      };
    });
  }
  if (type === 'pill') {
    return [
      { x: 22, y: 6 },
      { x: 78, y: 6 },
      { x: 94, y: 22 },
      { x: 94, y: 50 },
      { x: 94, y: 78 },
      { x: 78, y: 94 },
      { x: 22, y: 94 },
      { x: 6, y: 78 },
      { x: 6, y: 50 },
      { x: 6, y: 22 },
    ];
  }
  if (type === 'cylinder') {
    return [
      { x: 50, y: 4 },
      { x: 85, y: 8 },
      { x: 96, y: 18 },
      { x: 96, y: 82 },
      { x: 85, y: 92 },
      { x: 50, y: 96 },
      { x: 15, y: 92 },
      { x: 4, y: 82 },
      { x: 4, y: 18 },
      { x: 15, y: 8 },
    ];
  }
  return [
    { x: 1, y: 1 },
    { x: 99, y: 1 },
    { x: 99, y: 99 },
    { x: 1, y: 99 },
  ];
}

function shapeVertices(n) {
  if (Array.isArray(n?.vertices) && n.vertices.length >= 3) {
    return n.vertices.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  }
  return defaultVertices(n?.type);
}

function verticesToPoints(vertices) {
  return vertices.map((p) => `${clampCoord(p.x)},${clampCoord(p.y)}`).join(' ');
}

function moveVertex(n, index, point) {
  const verts = shapeVertices(n);
  if (index < 0 || index >= verts.length) return verts;
  verts[index] = { x: clampCoord(point.x), y: clampCoord(point.y) };
  n.vertices = verts;
  return verts;
}

function insertVertex(n, edgeIndex, point) {
  const verts = shapeVertices(n);
  const i = ((edgeIndex % verts.length) + verts.length) % verts.length;
  const a = verts[i],
    b = verts[(i + 1) % verts.length];
  const inserted = point
    ? { x: clampCoord(point.x), y: clampCoord(point.y) }
    : { x: clampCoord((a.x + b.x) / 2), y: clampCoord((a.y + b.y) / 2) };
  verts.splice(i + 1, 0, inserted);
  n.vertices = verts;
  return verts;
}

function removeVertex(n, index) {
  const verts = shapeVertices(n);
  if (verts.length <= 3 || index < 0 || index >= verts.length) return verts;
  verts.splice(index, 1);
  n.vertices = verts;
  return verts;
}

function portPoint(n, port = 'e') {
  const cx = n.x + n.w / 2,
    cy = n.y + n.h / 2;
  const local =
    port === 'n'
      ? { x: 0, y: -n.h / 2, nx: 0, ny: -1 }
      : port === 's'
        ? { x: 0, y: n.h / 2, nx: 0, ny: 1 }
        : port === 'w'
          ? { x: -n.w / 2, y: 0, nx: -1, ny: 0 }
          : { x: n.w / 2, y: 0, nx: 1, ny: 0 };
  const angle = ((n.rotation || 0) * Math.PI) / 180;
  if (!angle) {
    return { x: cx + local.x, y: cy + local.y, nx: local.nx, ny: local.ny, port };
  }
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  return {
    x: cx + local.x * cos - local.y * sin,
    y: cy + local.x * sin + local.y * cos,
    nx: local.nx * cos - local.ny * sin,
    ny: local.nx * sin + local.ny * cos,
    port,
  };
}

function autoPorts(a, b, fromPort, toPort) {
  const acx = a.x + a.w / 2,
    acy = a.y + a.h / 2,
    bcx = b.x + b.w / 2,
    bcy = b.y + b.h / 2,
    dx = bcx - acx,
    dy = bcy - acy;
  const fp =
    fromPort && ports.includes(fromPort)
      ? fromPort
      : Math.abs(dx) >= Math.abs(dy)
        ? dx >= 0
          ? 'e'
          : 'w'
        : dy >= 0
          ? 's'
          : 'n';
  const tp =
    toPort && ports.includes(toPort)
      ? toPort
      : Math.abs(dx) >= Math.abs(dy)
        ? dx >= 0
          ? 'w'
          : 'e'
        : dy >= 0
          ? 'n'
          : 's';
  return [portPoint(a, fp), portPoint(b, tp)];
}

function lineRoute(n) {
  if (!Array.isArray(n?.points) || n.points.length < 2) {
    return { d: '', labelX: 0, labelY: 0, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
  }
  const p1 = n.points[0],
    p2 = n.points.at(-1),
    x1 = Number(p1.x),
    y1 = Number(p1.y),
    x2 = Number(p2.x),
    y2 = Number(p2.y),
    dx = x2 - x1,
    dy = y2 - y1,
    route = routes.includes(n.route) ? n.route : 'straight',
    start = { x: x1, y: y1 },
    end = { x: x2, y: y2 };
  if (!dx && !dy) {
    return {
      d: `M${x1},${y1} L${x1 + 0.1},${y1 + 0.1}`,
      labelX: x1,
      labelY: y1,
      start,
      end,
    };
  }
  if (route === 'straight') {
    return {
      d: `M${x1},${y1} L${x2},${y2}`,
      labelX: (x1 + x2) / 2,
      labelY: (y1 + y2) / 2,
      start,
      end,
    };
  }
  if (route === 'elbow') {
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (Math.abs(dy) < 1) {
        return {
          d: `M${x1},${y1} L${x2},${y2}`,
          labelX: (x1 + x2) / 2,
          labelY: (y1 + y2) / 2,
          start,
          end,
        };
      }
      const mx = (x1 + x2) / 2;
      return {
        d: `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`,
        labelX: mx,
        labelY: (y1 + y2) / 2,
        start,
        end,
      };
    }
    if (Math.abs(dx) < 1) {
      return {
        d: `M${x1},${y1} L${x2},${y2}`,
        labelX: (x1 + x2) / 2,
        labelY: (y1 + y2) / 2,
        start,
        end,
      };
    }
    const my = (y1 + y2) / 2;
    return {
      d: `M${x1},${y1} L${x1},${my} L${x2},${my} L${x2},${y2}`,
      labelX: (x1 + x2) / 2,
      labelY: my,
      start,
      end,
    };
  }
  let c1x, c1y, c2x, c2y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const bow = Math.abs(dy) < 16 ? -Math.max(24, Math.min(64, Math.abs(dx) * 0.24)) : 0;
    c1x = x1 + dx * 0.45;
    c1y = y1 + bow;
    c2x = x2 - dx * 0.45;
    c2y = y2 + bow;
  } else {
    const bow = Math.abs(dx) < 16 ? Math.max(24, Math.min(64, Math.abs(dy) * 0.24)) : 0;
    c1x = x1 + bow;
    c1y = y1 + dy * 0.45;
    c2x = x2 + bow;
    c2y = y2 - dy * 0.45;
  }
  return {
    d: `M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`,
    labelX: 0.125 * x1 + 0.375 * c1x + 0.375 * c2x + 0.125 * x2,
    labelY: 0.125 * y1 + 0.375 * c1y + 0.375 * c2y + 0.125 * y2,
    start,
    end,
  };
}

function connectorRoute(n, objects = []) {
  if (n?.type === 'line') return lineRoute(n);
  const a = objects.find((o) => o.id === n.from),
    b = objects.find((o) => o.id === n.to);
  if (!a || !b) return { d: '', labelX: 0, labelY: 0, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
  const route = routes.includes(n.route) ? n.route : 'straight';
  if (route === 'straight' && !n.fromPort && !n.toPort) {
    const ax = a.x + a.w / 2,
      ay = a.y + a.h / 2,
      bx = b.x + b.w / 2,
      by = b.y + b.h / 2,
      dx = bx - ax,
      dy = by - ay;
    if (!dx && !dy)
      return { d: '', labelX: ax, labelY: ay, start: { x: ax, y: ay }, end: { x: bx, y: by } };
    const sa = Math.min((a.w / 2 + 7) / (Math.abs(dx) || 1), (a.h / 2 + 7) / (Math.abs(dy) || 1)),
      sb = Math.min((b.w / 2 + 7) / (Math.abs(dx) || 1), (b.h / 2 + 7) / (Math.abs(dy) || 1)),
      x1 = ax + dx * sa,
      y1 = ay + dy * sa,
      x2 = bx - dx * sb,
      y2 = by - dy * sb;
    return {
      d: `M${x1},${y1} L${x2},${y2}`,
      labelX: (x1 + x2) / 2,
      labelY: (y1 + y2) / 2,
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
    };
  }
  const [p1, p2] = autoPorts(a, b, n.fromPort, n.toPort);
  const x1 = p1.x + p1.nx * 6,
    y1 = p1.y + p1.ny * 6,
    x2 = p2.x + p2.nx * 6,
    y2 = p2.y + p2.ny * 6,
    start = { x: x1, y: y1 },
    end = { x: x2, y: y2 };
  if (route === 'straight') {
    return {
      d: `M${x1},${y1} L${x2},${y2}`,
      labelX: (x1 + x2) / 2,
      labelY: (y1 + y2) / 2,
      start,
      end,
    };
  }
  if (route === 'elbow') {
    const stub = 24;
    let pts;
    if (Math.abs(p1.nx) > 0.5 && Math.abs(p2.nx) > 0.5) {
      if (Math.abs(y1 - y2) < 1 && (x2 - x1) * p1.nx >= 0) {
        pts = [
          [x1, y1],
          [x2, y2],
        ];
      } else {
        const mx =
          (x2 - x1) * p1.nx >= 0 && p1.nx * p2.nx < 0
            ? (x1 + x2) / 2
            : p1.nx > 0
              ? Math.max(x1, x2) + stub
              : Math.min(x1, x2) - stub;
        pts = [
          [x1, y1],
          [mx, y1],
          [mx, y2],
          [x2, y2],
        ];
      }
    } else if (Math.abs(p1.ny) > 0.5 && Math.abs(p2.ny) > 0.5) {
      if (Math.abs(x1 - x2) < 1 && (y2 - y1) * p1.ny >= 0) {
        pts = [
          [x1, y1],
          [x2, y2],
        ];
      } else {
        const my =
          (y2 - y1) * p1.ny >= 0 && p1.ny * p2.ny < 0
            ? (y1 + y2) / 2
            : p1.ny > 0
              ? Math.max(y1, y2) + stub
              : Math.min(y1, y2) - stub;
        pts = [
          [x1, y1],
          [x1, my],
          [x2, my],
          [x2, y2],
        ];
      }
    } else if (Math.abs(p1.nx) > 0.5) {
      pts = [
        [x1, y1],
        [x2, y1],
        [x2, y2],
      ];
    } else {
      pts = [
        [x1, y1],
        [x1, y2],
        [x2, y2],
      ];
    }
    const mid = Math.floor(pts.length / 2);
    return {
      d: pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join(' '),
      labelX: (pts[mid - 1][0] + pts[mid][0]) / 2,
      labelY: (pts[mid - 1][1] + pts[mid][1]) / 2,
      start,
      end,
    };
  }
  const dist = Math.hypot(x2 - x1, y2 - y1),
    pull = Math.max(16, Math.min(160, dist * 0.42)),
    alignedVert = Math.abs(p1.ny) > 0.5 && Math.abs(p2.ny) > 0.5 && Math.abs(x2 - x1) < 12,
    alignedHoriz = Math.abs(p1.nx) > 0.5 && Math.abs(p2.nx) > 0.5 && Math.abs(y2 - y1) < 12,
    bowX = alignedVert ? Math.max(20, Math.min(48, dist * 0.25)) : 0,
    bowY = alignedHoriz ? -Math.max(20, Math.min(48, dist * 0.25)) : 0,
    c1x = x1 + p1.nx * pull + bowX,
    c1y = y1 + p1.ny * pull + bowY,
    c2x = x2 + p2.nx * pull + bowX,
    c2y = y2 + p2.ny * pull + bowY;
  return {
    d: `M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`,
    labelX: 0.125 * x1 + 0.375 * c1x + 0.375 * c2x + 0.125 * x2,
    labelY: 0.125 * y1 + 0.375 * c1y + 0.375 * c2y + 0.125 * y2,
    start,
    end,
  };
}

function dedupeConnectors(objects = []) {
  const seenPairs = new Map();
  for (let i = objects.length - 1; i >= 0; i--) {
    const n = objects[i];
    if (n?.type !== 'connector') continue;
    const key = [n.from, n.to].sort().join('::');
    if (seenPairs.has(key)) {
      objects.splice(i, 1);
    } else {
      seenPairs.set(key, n.id);
    }
  }
  return objects;
}

function smoothPath(points = []) {
  if (!points.length) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y} L${points[0].x},${points[0].y}`;
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2,
      my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q${points[i].x},${points[i].y} ${mx},${my}`;
  }
  const last = points.at(-1);
  return `${d} L${last.x},${last.y}`;
}

function segmentDistance(p, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    lenSq = dx * dx + dy * dy;
  if (!lenSq) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function pathHitsPoint(pathNode, point, radius = 12) {
  if (!pathNode || pathNode.type !== 'path' || !Array.isArray(pathNode.points)) return false;
  const threshold = radius + (pathNode.strokeWidth || 4) / 2;
  if (pathNode.points.length === 1) {
    return Math.hypot(point.x - pathNode.points[0].x, point.y - pathNode.points[0].y) <= threshold;
  }
  for (let i = 0; i < pathNode.points.length - 1; i++) {
    if (segmentDistance(point, pathNode.points[i], pathNode.points[i + 1]) <= threshold) {
      return true;
    }
  }
  return false;
}

function bounds(n, objects = []) {
  if (n.type === 'path' || n.type === 'line') {
    const xs = n.points.map((p) => p.x),
      ys = n.points.map((p) => p.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
  }
  if (n.type === 'connector') {
    let a = objects.find((o) => o.id === n.from),
      b = objects.find((o) => o.id === n.to);
    if (!a || !b)
      return {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
      };
    return {
      x: Math.min(a.x + a.w / 2, b.x + b.w / 2),
      y: Math.min(a.y + a.h / 2, b.y + b.h / 2),
      w: Math.abs(a.x + a.w / 2 - b.x - b.w / 2),
      h: Math.abs(a.y + a.h / 2 - b.y - b.h / 2),
    };
  }
  const angle = ((n.rotation || 0) * Math.PI) / 180,
    w = Math.abs(n.w * Math.cos(angle)) + Math.abs(n.h * Math.sin(angle)),
    h = Math.abs(n.w * Math.sin(angle)) + Math.abs(n.h * Math.cos(angle));
  return {
    x: n.x + n.w / 2 - w / 2,
    y: n.y + n.h / 2 - h / 2,
    w,
    h,
  };
}

function frameChildren(objects, frameId) {
  const frame = objects.find((n) => n.id === frameId && n.type === 'frame');
  if (!frame) return [];
  return objects
    .filter((n) => n.id !== frame.id && !['connector', 'frame'].includes(n.type) && !n.locked)
    .filter((n) => {
      const b = bounds(n, objects),
        cx = b.x + b.w / 2,
        cy = b.y + b.h / 2;
      return cx >= frame.x && cx <= frame.x + frame.w && cy >= frame.y && cy <= frame.y + frame.h;
    })
    .map((n) => n.id);
}

function resizeBox(
  original,
  dir = 'se',
  dx = 0,
  dy = 0,
  { lockAspect = false, snap = false, minW = 50, minH = 40 } = {},
) {
  const east = dir.includes('e'),
    south = dir.includes('s'),
    west = dir.includes('w'),
    north = dir.includes('n');
  const anchorX = west ? original.x + original.w : original.x,
    anchorY = north ? original.y + original.h : original.y;
  let w = Math.max(minW, original.w + (east ? dx : west ? -dx : 0)),
    h = Math.max(minH, original.h + (south ? dy : north ? -dy : 0));
  if (lockAspect && original.w > 0 && original.h > 0) {
    const ratio = original.h / original.w;
    if (Math.abs(dx) >= Math.abs(dy)) h = Math.max(minH, w * ratio);
    else w = Math.max(minW, h / ratio);
  }
  if (snap) {
    w = Math.max(minW, Math.round(w / 22) * 22);
    h = Math.max(minH, Math.round(h / 22) * 22);
    if (lockAspect && original.w > 0 && original.h > 0) {
      h = Math.max(minH, w * (original.h / original.w));
    }
  }
  return {
    x: west ? anchorX - w : anchorX,
    y: north ? anchorY - h : anchorY,
    w,
    h,
  };
}

function smartGuides(box, others = [], threshold = 5) {
  let bestDx = null,
    bestDy = null,
    minAbsX = threshold + 1,
    minAbsY = threshold + 1;
  const xPoints = [box.x, box.x + box.w / 2, box.x + box.w],
    yPoints = [box.y, box.y + box.h / 2, box.y + box.h];
  const guides = [];
  for (const other of others) {
    const oxs = [other.x, other.x + other.w / 2, other.x + other.w],
      oys = [other.y, other.y + other.h / 2, other.y + other.h];
    for (const xp of xPoints) {
      for (const ox of oxs) {
        const diff = ox - xp;
        if (Math.abs(diff) <= threshold && Math.abs(diff) < minAbsX) {
          minAbsX = Math.abs(diff);
          bestDx = diff;
        }
      }
    }
    for (const yp of yPoints) {
      for (const oy of oys) {
        const diff = oy - yp;
        if (Math.abs(diff) <= threshold && Math.abs(diff) < minAbsY) {
          minAbsY = Math.abs(diff);
          bestDy = diff;
        }
      }
    }
  }
  const snapped = {
    x: box.x + (bestDx ?? 0),
    y: box.y + (bestDy ?? 0),
    w: box.w,
    h: box.h,
  };
  const sxs = [snapped.x, snapped.x + snapped.w / 2, snapped.x + snapped.w],
    sys = [snapped.y, snapped.y + snapped.h / 2, snapped.y + snapped.h];
  for (const other of others) {
    const oxs = [other.x, other.x + other.w / 2, other.x + other.w],
      oys = [other.y, other.y + other.h / 2, other.y + other.h];
    for (const sx of sxs) {
      if (oxs.some((ox) => Math.abs(ox - sx) < 0.5)) {
        guides.push({
          axis: 'x',
          pos: sx,
          from: Math.min(snapped.y, other.y) - 16,
          to: Math.max(snapped.y + snapped.h, other.y + other.h) + 16,
        });
      }
    }
    for (const sy of sys) {
      if (oys.some((oy) => Math.abs(oy - sy) < 0.5)) {
        guides.push({
          axis: 'y',
          pos: sy,
          from: Math.min(snapped.x, other.x) - 16,
          to: Math.max(snapped.x + snapped.w, other.x + other.w) + 16,
        });
      }
    }
  }
  return { dx: bestDx ?? 0, dy: bestDy ?? 0, guides };
}

function enclosing(nodes, objects = nodes) {
  if (!nodes.length)
    return {
      x: 0,
      y: 0,
      w: 800,
      h: 600,
    };
  let bs = nodes.map((n) => bounds(n, objects)),
    x = Math.min(...bs.map((b) => b.x)),
    y = Math.min(...bs.map((b) => b.y));
  return {
    x,
    y,
    w: Math.max(1, Math.max(...bs.map((b) => b.x + b.w)) - x),
    h: Math.max(1, Math.max(...bs.map((b) => b.y + b.h)) - y),
  };
}
function translate(n, dx, dy) {
  if (n.locked) return;
  if (n.type === 'path' || n.type === 'line')
    n.points = n.points.map((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    }));
  else if (n.type !== 'connector') {
    n.x += dx;
    n.y += dy;
  }
}
function expandGroups(objects, ids) {
  let selected = new Set(ids),
    groups = new Set(objects.filter((n) => selected.has(n.id) && n.group).map((n) => n.group));
  objects.forEach((n) => {
    if (groups.has(n.group)) selected.add(n.id);
  });
  return selected;
}
function align(nodes, mode) {
  const ns = nodes.filter((n) => !n.locked && !['path', 'connector'].includes(n.type));
  if (ns.length < 2) return;
  let box = enclosing(ns);
  for (const n of ns) {
    const b = bounds(n);
    let dx = 0,
      dy = 0;
    if (mode === 'left') dx = box.x - b.x;
    if (mode === 'center') dx = box.x + box.w / 2 - b.x - b.w / 2;
    if (mode === 'right') dx = box.x + box.w - b.x - b.w;
    if (mode === 'top') dy = box.y - b.y;
    if (mode === 'middle') dy = box.y + box.h / 2 - b.y - b.h / 2;
    if (mode === 'bottom') dy = box.y + box.h - b.y - b.h;
    translate(n, dx, dy);
  }
}
function distribute(nodes, axis) {
  const ns = nodes.filter((n) => !n.locked && !['path', 'connector'].includes(n.type));
  if (ns.length < 3) return;
  let dim = axis === 'x' ? 'w' : 'h';
  ns.sort((a, b) => bounds(a)[axis] - bounds(b)[axis]);
  let first = bounds(ns[0]),
    last = bounds(ns.at(-1)),
    gap =
      (last[axis] + last[dim] - first[axis] - ns.reduce((s, n) => s + bounds(n)[dim], 0)) /
      (ns.length - 1),
    cursor = first[axis];
  for (const n of ns) {
    let b = bounds(n),
      delta = cursor - b[axis];
    translate(n, axis === 'x' ? delta : 0, axis === 'y' ? delta : 0);
    cursor += b[dim] + gap;
  }
}
function duplicate(objects, ids, newId) {
  let chosen = objects.filter((n) => ids.has(n.id) && !n.locked),
    map = new Map(chosen.map((n) => [n.id, newId()])),
    groups = new Map();
  return chosen.map((n) => {
    let copy = clone(n);
    copy.id = map.get(n.id);
    if (copy.group) {
      if (!groups.has(copy.group)) groups.set(copy.group, newId());
      copy.group = groups.get(copy.group);
    }
    if (copy.type === 'connector') {
      copy.from = map.get(copy.from) || copy.from;
      copy.to = map.get(copy.to) || copy.to;
    } else translate(copy, 28, 28);
    return copy;
  });
}
function safeUrl(value) {
  try {
    let u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
function validateBoard(value) {
  if (!value || !Array.isArray(value.objects) || value.objects.length > 10000)
    throw Error('Invalid board');
  const seen = new Set();
  for (const n of value.objects) {
    if (
      !n ||
      !types.includes(n.type) ||
      typeof n.id !== 'string' ||
      !/^[a-z0-9-]+$/i.test(n.id) ||
      seen.has(n.id)
    )
      throw Error('Invalid object');
    seen.add(n.id);
    if (n.type === 'path') {
      if (
        !Array.isArray(n.points) ||
        !n.points.length ||
        n.points.length > 100000 ||
        !n.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      )
        throw Error('Invalid drawing');
    } else if (n.type === 'line') {
      if (
        !Array.isArray(n.points) ||
        n.points.length < 2 ||
        n.points.length > 4 ||
        !n.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      )
        throw Error('Invalid line');
      if (n.route !== undefined && !routes.includes(n.route)) throw Error('Invalid line route');
      if (n.text !== undefined && (typeof n.text !== 'string' || n.text.length > 500))
        throw Error('Invalid line label');
    } else if (n.type === 'connector') {
      if (typeof n.from !== 'string' || typeof n.to !== 'string') throw Error('Invalid connector');
      if (n.route !== undefined && !routes.includes(n.route))
        throw Error('Invalid connector route');
      if (n.fromPort !== undefined && !ports.includes(n.fromPort))
        throw Error('Invalid connector port');
      if (n.toPort !== undefined && !ports.includes(n.toPort))
        throw Error('Invalid connector port');
      if (n.text !== undefined && (typeof n.text !== 'string' || n.text.length > 500))
        throw Error('Invalid connector label');
    } else if (
      !['x', 'y', 'w', 'h'].every((k) => Number.isFinite(n[k])) ||
      n.w <= 0 ||
      n.h <= 0 ||
      typeof n.text !== 'string'
    )
      throw Error('Invalid geometry');
    if (n.lineStyle !== undefined && !lineStyles.includes(n.lineStyle))
      throw Error('Invalid line style');
    if (n.startArrow !== undefined && !arrowHeads.includes(n.startArrow))
      throw Error('Invalid start arrow');
    if (n.endArrow !== undefined && !arrowHeads.includes(n.endArrow))
      throw Error('Invalid end arrow');
    if (n.vertices !== undefined) {
      if (
        !shapes.includes(n.type) ||
        !Array.isArray(n.vertices) ||
        n.vertices.length < 3 ||
        n.vertices.length > 200 ||
        !n.vertices.every(
          (p) =>
            p &&
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            p.x >= -50 &&
            p.x <= 150 &&
            p.y >= -50 &&
            p.y <= 150,
        )
      )
        throw Error('Invalid shape vertices');
    }
    for (const key of ['rotation', 'fontSize', 'fontWeight', 'strokeWidth', 'z'])
      if (n[key] !== undefined && !Number.isFinite(n[key])) throw Error('Invalid formatting');
    for (const key of ['color', 'stroke', 'textColor'])
      if (n[key] !== undefined && !/^(#[a-f0-9]{3,8}|transparent)$/i.test(n[key]))
        throw Error('Invalid color');
    if (n.align !== undefined && !['left', 'center', 'right'].includes(n.align))
      throw Error('Invalid alignment');
    if (n.type === 'image' && !/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(n.src))
      throw Error('Invalid image');
    if (n.type === 'file' && !/^data:application\/pdf;base64,[a-z0-9+/=]+$/i.test(n.src))
      throw Error('Invalid PDF');
    if (n.type === 'embed' && !resolveEmbed(n.embedKind, n.url)) throw Error('Invalid embed');
    if (n.type === 'link' && !safeUrl(n.url)) throw Error('Invalid link');
  }
  for (const n of value.objects.filter((n) => n.type === 'connector'))
    if (!seen.has(n.from) || !seen.has(n.to) || n.from === n.to)
      throw Error('Missing connector endpoint');
  if (
    value.scenes !== undefined &&
    (!Array.isArray(value.scenes) ||
      !value.scenes.every(
        (s) =>
          typeof s.name === 'string' &&
          s.view &&
          ['x', 'y', 'z'].every((k) => Number.isFinite(s.view[k])) &&
          s.view.z > 0,
      ))
  )
    throw Error('Invalid scenes');
  return clone(value);
}
export {
  shapes,
  types,
  ports,
  routes,
  lineStyles,
  arrowHeads,
  polygons,
  defaultVertices,
  shapeVertices,
  verticesToPoints,
  moveVertex,
  insertVertex,
  removeVertex,
  portPoint,
  lineRoute,
  connectorRoute,
  dedupeConnectors,
  smoothPath,
  pathHitsPoint,
  frameChildren,
  resizeBox,
  smartGuides,
  clone,
  bounds,
  enclosing,
  translate,
  expandGroups,
  align,
  distribute,
  duplicate,
  safeUrl,
  validateBoard,
};
