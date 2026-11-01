import { resolveEmbed } from './src/embed-model.js';
import {
  edgePoint,
  anchorToward,
  shapeContains,
  obstacleBoxes,
  routeSamples,
  pathBlocked,
  avoidObstacles,
  routedPath,
} from './src/connector-model.js';
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
  'chevron',
  'double-arrow',
  'left-arrow',
  'up-arrow',
  'down-arrow',
  'lightning',
  'house',
  'shield',
  'ribbon',
  'bookmark',
  'document',
  'flow-data',
  'gear',
  'burst',
  'right-triangle',
  'corner-cut',
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
  chevron: '2,4 65,4 99,50 65,96 2,96 36,50',
  'double-arrow': '2,50 28,5 28,30 72,30 72,5 98,50 72,95 72,70 28,70 28,95',
  'left-arrow': '1,50 39,3 39,28 99,28 99,72 39,72 39,97',
  'up-arrow': '50,1 97,39 72,39 72,99 28,99 28,39 3,39',
  'down-arrow': '28,1 72,1 72,61 97,61 50,99 3,61 28,61',
  lightning: '57,1 12,55 45,55 33,99 89,42 54,42',
  house: '2,43 50,2 98,43 88,43 88,98 63,98 63,64 37,64 37,98 12,98 12,43',
  shield: '50,2 96,20 92,59 78,83 50,99 22,83 8,59 4,20',
  ribbon: '5,2 95,2 95,98 50,72 5,98',
  bookmark: '18,2 82,2 82,98 50,77 18,98',
  document: '4,2 96,2 96,75 75,84 50,76 26,86 4,75',
  'flow-data': '22,3 99,3 78,97 1,97',
  gear: '41,1 59,1 63,14 74,19 86,11 98,24 89,36 94,45 99,45 99,59 85,63 80,74 89,86 76,99 64,89 56,94 56,99 42,99 38,85 26,80 14,89 1,76 11,64 6,56 1,56 1,42 15,38 20,26 11,14 24,1 36,11',
  burst:
    '50,1 60,20 81,9 78,32 99,40 82,53 94,75 70,76 63,99 48,83 28,97 27,73 4,73 18,54 1,39 25,35 20,12 42,22',
  'right-triangle': '3,2 97,98 3,98',
  'corner-cut': '3,2 70,2 98,30 98,98 3,98',
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

function defaultShapeSize(type) {
  if (type === 'frame') return { w: 420, h: 320 };
  if (
    [
      'circle',
      'triangle',
      'pentagon',
      'hexagon',
      'octagon',
      'star',
      'burst',
      'heart',
      'gear',
      'shield',
      'house',
      'diamond',
      'right-triangle',
    ].includes(type)
  )
    return { w: 174, h: 174 };
  if (
    [
      'arrow',
      'left-arrow',
      'double-arrow',
      'chevron',
      'flow-data',
      'parallelogram',
      'trapezoid',
      'ribbon',
    ].includes(type)
  )
    return { w: 210, h: 134 };
  if (['up-arrow', 'down-arrow', 'bookmark'].includes(type)) return { w: 138, h: 198 };
  return { w: 190, h: 170 };
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
  if (Array.isArray(n.curves) && n.curves.length === verts.length - 1)
    n.curves.splice(i, 1, null, null);
  n.vertices = verts;
  return verts;
}

function removeVertex(n, index) {
  const verts = shapeVertices(n);
  if (verts.length <= 3 || index < 0 || index >= verts.length) return verts;
  verts.splice(index, 1);
  if (Array.isArray(n.curves) && n.curves.length === verts.length + 1) {
    const previousEdge = (index - 1 + n.curves.length) % n.curves.length;
    n.curves.splice(index, 1);
    n.curves[previousEdge >= index ? previousEdge - 1 : previousEdge] = null;
  }
  n.vertices = verts;
  return verts;
}

function shapePath(n) {
  const verts = shapeVertices(n);
  if (!verts.length) return '';
  const curves = Array.isArray(n.curves) && n.curves.length === verts.length ? n.curves : [];
  const coord = (p) => `${clampCoord(p.x)},${clampCoord(p.y)}`;
  const parts = ['M' + coord(verts[0])];
  for (let i = 0; i < verts.length; i++) {
    const next = verts[(i + 1) % verts.length];
    const control = curves[i];
    parts.push(control ? 'Q' + coord(control) + ' ' + coord(next) : 'L' + coord(next));
  }
  return parts.join(' ') + ' Z';
}

function moveCurve(n, index, point) {
  const verts = shapeVertices(n);
  if (index < 0 || index >= verts.length) return;
  if (!Array.isArray(n.curves) || n.curves.length !== verts.length)
    n.curves = Array(verts.length).fill(null);
  n.curves[index] = { x: clampCoord(point.x), y: clampCoord(point.y) };
}

function resetCurves(n) {
  delete n.curves;
}

function portPoint(n, port = 'e') {
  const anchor = {
    n: { x: 0.5, y: 0 },
    e: { x: 1, y: 0.5 },
    s: { x: 0.5, y: 1 },
    w: { x: 0, y: 0.5 },
  }[port] || { x: 1, y: 0.5 };
  return { ...bindingPoint(n, anchor), port };
}

function roundedBindingVertices(x, y, w, h, r) {
  return [
    [x + w - r, y + r, -90],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, 90],
    [x + r, y + r, 180],
  ].flatMap(([cx, cy, start]) =>
    Array.from({ length: 9 }, (_, i) => {
      const angle = ((start + (i * 90) / 8) * Math.PI) / 180;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    }),
  );
}
const roundedShapeBinding = roundedBindingVertices(1, 1, 98, 98, 6);
const pillBinding = roundedBindingVertices(2, 8, 96, 84, 42);
const cylinderBinding = [
  ...Array.from({ length: 17 }, (_, i) => {
    const t = i / 16,
      s = 1 - t;
    return {
      x: 4 * s * s * s + 12 * s * s * t + 288 * s * t * t + 96 * t * t * t,
      y: 18 * s * s * s + 18 * s * s * t + 18 * s * t * t + 18 * t * t * t,
    };
  }),
  ...Array.from({ length: 17 }, (_, i) => {
    const t = i / 16,
      s = 1 - t;
    return {
      x: 96 * s * s * s + 288 * s * s * t + 12 * s * t * t + 4 * t * t * t,
      y: 82 * s * s * s + 282 * s * s * t + 282 * s * t * t + 82 * t * t * t,
    };
  }),
];

function bindingVertices(n) {
  if (n.vertices || polygons[n.type]) return shapeVertices(n);
  if (n.type === 'pill') return pillBinding;
  if (n.type === 'cylinder') return cylinderBinding;
  return shapes.includes(n.type)
    ? roundedShapeBinding
    : [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];
}

function bindingPoint(n, anchor) {
  return edgePoint(n, anchorToward(n, anchor), bindingVertices(n));
}

/** Screen-scaled proximity and an existing-target bias avoid snapping flicker between nearby notes. */
function nearestBinding(objects, p, excludeId, radius = 24, previousId, fromPoint = p) {
  let best = null,
    score = Infinity;
  for (const n of [...objects].reverse()) {
    if (n.id === excludeId || ['line', 'path', 'connector', 'frame'].includes(n.type)) continue;
    const vertices = bindingVertices(n),
      inside = shapeContains(n, p, vertices);
    const toward = Math.hypot(p.x - n.x - n.w / 2, p.y - n.y - n.h / 2) < 1 ? fromPoint : p;
    let point = edgePoint(n, toward, vertices),
      port;
    let distance = Math.hypot(p.x - point.x, p.y - point.y);
    if (!inside && distance > radius * (n.id === previousId ? 1.3 : 1)) continue;
    let portDistance = radius * 0.45;
    for (const candidate of ports) {
      const fixed = portPoint(n, candidate),
        d = Math.hypot(p.x - fixed.x, p.y - fixed.y);
      if (d < portDistance) {
        point = fixed;
        port = candidate;
        portDistance = d;
      }
    }
    const candidateScore = (inside ? -radius : distance) - (n.id === previousId ? radius * 0.2 : 0);
    if (candidateScore < score) {
      score = candidateScore;
      best = {
        node: n,
        port,
        anchor: port || (inside && distance > radius) ? undefined : point.anchor,
        x: point.x,
        y: point.y,
      };
    }
  }
  return best;
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

function lineControls(n) {
  if (Array.isArray(n.controls) && n.controls.length === 2)
    return n.controls.map((p) => ({ ...p }));
  const start = n.points[0],
    end = n.points.at(-1),
    dx = end.x - start.x,
    dy = end.y - start.y;
  if (n.route !== 'curved')
    return [
      { x: start.x + dx / 3, y: start.y + dy / 3 },
      { x: end.x - dx / 3, y: end.y - dy / 3 },
    ];
  if (Math.abs(dx) >= Math.abs(dy)) {
    const bow = Math.abs(dy) < 16 ? -Math.max(24, Math.min(64, Math.abs(dx) * 0.24)) : 0;
    return [
      { x: start.x + dx * 0.45, y: start.y + bow },
      { x: end.x - dx * 0.45, y: end.y + bow },
    ];
  }
  const bow = Math.abs(dx) < 16 ? Math.max(24, Math.min(64, Math.abs(dy) * 0.24)) : 0;
  return [
    { x: start.x + bow, y: start.y + dy * 0.45 },
    { x: end.x + bow, y: end.y - dy * 0.45 },
  ];
}
function setLineRoute(n, route) {
  if (n.type === 'line' && route === 'curved' && !n.curveEdited) {
    const start = n.points[0],
      end = n.points.at(-1),
      dx = end.x - start.x,
      dy = end.y - start.y;
    const collinear =
      !n.controls ||
      n.controls.every((p) => Math.abs((p.x - start.x) * dy - (p.y - start.y) * dx) < 0.001);
    if (collinear) n.controls = lineControls({ ...n, route: 'curved', controls: undefined });
  }
  n.route = route;
}
function moveLineEndpoint(n, index, target) {
  const before = n.points[index];
  if (n.controls) {
    const control =
      index === 0 ? n.controls[0] : index === n.points.length - 1 ? n.controls[1] : null;
    if (control) {
      control.x += target.x - before.x;
      control.y += target.y - before.y;
    }
  }
  n.points[index] = { ...target };
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
  const [first, second] = lineControls(n);
  const c1x = first.x,
    c1y = first.y,
    c2x = second.x,
    c2y = second.y;
  return {
    d: `M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`,
    labelX: 0.125 * x1 + 0.375 * c1x + 0.375 * c2x + 0.125 * x2,
    labelY: 0.125 * y1 + 0.375 * c1y + 0.375 * c2y + 0.125 * y2,
    start,
    end,
  };
}

function basicConnectorRoute(n, objects = [], endpoints) {
  if (n?.type === 'line') return lineRoute(n);
  const a = objects.find((o) => o.id === n.from),
    b = objects.find((o) => o.id === n.to);
  if (!a || !b) return { d: '', labelX: 0, labelY: 0, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
  const route = routes.includes(n.route) ? n.route : 'straight';
  if (route === 'straight' && !n.fromPort && !n.toPort && !endpoints) {
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
  const [p1, p2] = endpoints || autoPorts(a, b, n.fromPort, n.toPort);
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

function connectorRoute(n, objects = [], context) {
  if (n?.type === 'line') return lineRoute(n);
  const a = objects.find((o) => o.id === n.from),
    b = objects.find((o) => o.id === n.to);
  if (!a || !b) return basicConnectorRoute(n, objects);
  const resolve = (node, other, side) =>
    n[side + 'Anchor']
      ? bindingPoint(node, n[side + 'Anchor'])
      : n[side + 'Port']
        ? portPoint(node, n[side + 'Port'])
        : edgePoint(
            node,
            { x: other.x + other.w / 2, y: other.y + other.h / 2 },
            bindingVertices(node),
          );
  const first = resolve(a, b, 'from'),
    last = resolve(b, a, 'to');
  const candidate = basicConnectorRoute(n, objects, [first, last]);
  // Explicit waypoints deliberately override automatic obstacle routing.
  // Endpoints remain bound to nodes and update as those nodes move.
  if (Array.isArray(n.waypoints) && n.waypoints.length) {
    const waypoints = n.waypoints
      .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
      .slice(0, 12);
    if (waypoints.length) {
      const anchors = [candidate.start, ...waypoints, candidate.end];
      const path =
        n.route === 'elbow'
          ? anchors.slice(1).reduce(
              (points, to) => {
                const from = points.at(-1);
                if (from.x !== to.x && from.y !== to.y) points.push({ x: to.x, y: from.y });
                points.push(to);
                return points;
              },
              [anchors[0]],
            )
          : anchors;
      return { ...routedPath(path, n.route === 'curved'), manual: true };
    }
  }
  if (n.avoidObstacles === false) return candidate;
  const boxes = context || obstacleBoxes(objects),
    others = boxes.filter((box) => box.id !== a.id && box.id !== b.id);
  const samples = routeSamples(candidate);
  const endpointPenetration = samples
    .slice(1, -1)
    .some(
      (point) =>
        shapeContains(a, point, bindingVertices(a)) || shapeContains(b, point, bindingVertices(b)),
    );
  const exitsOutward =
    samples.length > 1 &&
    (samples[1].x - samples[0].x) * first.nx + (samples[1].y - samples[0].y) * first.ny >= -0.01;
  const entersInward =
    samples.length > 1 &&
    (samples.at(-2).x - samples.at(-1).x) * last.nx +
      (samples.at(-2).y - samples.at(-1).y) * last.ny >=
      -0.01;
  if (!endpointPenetration && !pathBlocked(samples, others) && exitsOutward && entersInward)
    return candidate;
  const points = avoidObstacles(candidate.start, candidate.end, first, last, boxes, a.id, b.id);
  return points
    ? { ...routedPath(points, n.route === 'curved'), rerouted: true }
    : { ...candidate, obstructed: true };
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
    const points =
      n.type === 'line' && n.route === 'curved' ? [...n.points, ...lineControls(n)] : n.points;
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
  }
  if (n.type === 'connector') {
    const route = connectorRoute(n, objects),
      points = route.points || routeSamples(route);
    if (!points.length) return { x: 0, y: 0, w: 0, h: 0 };
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    if (n.text) {
      const halfWidth = Math.max(44, Math.min(240, n.text.length * 7.4 + 20)) / 2;
      xs.push(route.labelX - halfWidth, route.labelX + halfWidth);
      ys.push(route.labelY - 12, route.labelY + 12);
    }
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
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
  if (n.type === 'path' || n.type === 'line') {
    n.points = n.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    if (n.type === 'line' && n.controls)
      n.controls = n.controls.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  } else if (n.type !== 'connector') {
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
function copySelection(objects, ids) {
  const expanded = new Set(ids);
  const frames = objects.filter((n) => n.type === 'frame' && expanded.has(n.id));
  const visited = new Set();
  while (frames.length) {
    const frame = frames.pop();
    if (visited.has(frame.id)) continue;
    visited.add(frame.id);
    for (const item of objects) {
      if (item.id === frame.id || item.type === 'connector') continue;
      const b = bounds(item, objects),
        x = b.x + b.w / 2,
        y = b.y + b.h / 2;
      const contained =
        item.type === 'frame'
          ? b.x >= frame.x &&
            b.y >= frame.y &&
            b.x + b.w <= frame.x + frame.w &&
            b.y + b.h <= frame.y + frame.h
          : x >= frame.x && x <= frame.x + frame.w && y >= frame.y && y <= frame.y + frame.h;
      if (contained) {
        expanded.add(item.id);
        if (item.type === 'frame' && !visited.has(item.id)) frames.push(item);
      }
    }
  }
  for (const item of objects)
    if (item.type === 'connector' && expanded.has(item.from) && expanded.has(item.to))
      expanded.add(item.id);
  return objects.filter(
    (n) =>
      expanded.has(n.id) &&
      (n.type !== 'connector' || (expanded.has(n.from) && expanded.has(n.to))),
  );
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
      for (const field of ['fromAnchor', 'toAnchor']) {
        const anchor = n[field];
        if (
          anchor !== undefined &&
          (!anchor ||
            !Number.isFinite(anchor.x) ||
            !Number.isFinite(anchor.y) ||
            anchor.x < -0.25 ||
            anchor.x > 1.25 ||
            anchor.y < -0.25 ||
            anchor.y > 1.25)
        )
          throw Error('Invalid connector anchor');
      }
      if (
        n.waypoints !== undefined &&
        (!Array.isArray(n.waypoints) ||
          n.waypoints.length > 12 ||
          !n.waypoints.every(
            (p) =>
              p &&
              Number.isFinite(p.x) &&
              Number.isFinite(p.y) &&
              Math.abs(p.x) <= 1000000 &&
              Math.abs(p.y) <= 1000000,
          ))
      )
        throw Error('Invalid connector waypoints');
      if (n.avoidObstacles !== undefined && typeof n.avoidObstacles !== 'boolean')
        throw Error('Invalid connector routing');
      if (n.text !== undefined && (typeof n.text !== 'string' || n.text.length > 500))
        throw Error('Invalid connector label');
    } else if (
      !['x', 'y', 'w', 'h'].every((k) => Number.isFinite(n[k])) ||
      n.w <= 0 ||
      n.h <= 0 ||
      typeof n.text !== 'string'
    )
      throw Error('Invalid geometry');
    if (
      n.controls !== undefined &&
      (n.type !== 'line' ||
        !Array.isArray(n.controls) ||
        n.controls.length !== 2 ||
        !n.controls.every((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y)))
    )
      throw Error('Invalid line controls');
    if (n.lineStyle !== undefined && !lineStyles.includes(n.lineStyle))
      throw Error('Invalid line style');
    if (n.startArrow !== undefined && !arrowHeads.includes(n.startArrow))
      throw Error('Invalid start arrow');
    if (n.endArrow !== undefined && !arrowHeads.includes(n.endArrow))
      throw Error('Invalid end arrow');
    if (n.lockAspect !== undefined && typeof n.lockAspect !== 'boolean')
      throw Error('Invalid aspect lock');
    if (n.curves !== undefined) {
      if (
        !shapes.includes(n.type) ||
        !Array.isArray(n.curves) ||
        n.curves.length !== shapeVertices(n).length ||
        !n.curves.every(
          (point) =>
            point === null ||
            (point &&
              Number.isFinite(point.x) &&
              Number.isFinite(point.y) &&
              point.x >= -50 &&
              point.x <= 150 &&
              point.y >= -50 &&
              point.y <= 150),
        )
      )
        throw Error('Invalid curve controls');
    }
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
  defaultShapeSize,
  shapeVertices,
  verticesToPoints,
  shapePath,
  moveCurve,
  resetCurves,
  moveVertex,
  insertVertex,
  removeVertex,
  portPoint,
  bindingPoint,
  nearestBinding,
  obstacleBoxes,
  lineRoute,
  lineControls,
  setLineRoute,
  moveLineEndpoint,
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
  copySelection,
  safeUrl,
  validateBoard,
};
