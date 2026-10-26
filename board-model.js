const shapes = [
  'shape',
  'circle',
  'triangle',
  'diamond',
  'hexagon',
  'star',
  'arrow',
  'bubble',
  'frame',
];
const types = ['sticky', 'text', ...shapes, 'path', 'connector', 'image', 'link', 'file'];
const polygons = {
  triangle: '50,3 98,97 2,97',
  diamond: '50,1 99,50 50,99 1,50',
  hexagon: '25,2 75,2 99,50 75,98 25,98 1,50',
  star: '50,1 62,34 98,35 70,57 79,94 50,73 21,94 30,57 2,35 38,34',
  arrow: '0,28 63,28 63,3 100,50 63,97 63,72 0,72',
  bubble: '5,3 95,3 99,8 99,76 94,81 40,81 19,100 19,81 5,81 1,76 1,8',
};
const clone = (value) => JSON.parse(JSON.stringify(value));
function bounds(n, objects = []) {
  if (n.type === 'path') {
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
  if (n.type === 'path')
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
    } else if (n.type === 'connector') {
      if (typeof n.from !== 'string' || typeof n.to !== 'string') throw Error('Invalid connector');
    } else if (
      !['x', 'y', 'w', 'h'].every((k) => Number.isFinite(n[k])) ||
      n.w <= 0 ||
      n.h <= 0 ||
      typeof n.text !== 'string'
    )
      throw Error('Invalid geometry');
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
  polygons,
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
