const EPS = 0.0001;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const center = (n) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function rotate(p, angle) {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

/** Intersect the actual local outline, then transform the point and outward normal to world space. */
export function edgePoint(n, toward, vertices) {
  const c = center(n),
    angle = ((n.rotation || 0) * Math.PI) / 180;
  let ray = rotate({ x: toward.x - c.x, y: toward.y - c.y }, -angle);
  if (Math.hypot(ray.x, ray.y) < EPS) ray = { x: 1, y: 0 };
  let point, normal;
  if (n.type === 'circle' && !n.vertices) {
    const scale = 1 / Math.hypot(ray.x / (n.w * 0.48), ray.y / (n.h * 0.48));
    point = { x: ray.x * scale, y: ray.y * scale };
    normal = { x: point.x / (n.w * n.w), y: point.y / (n.h * n.h) };
  } else {
    const polygon = vertices.map((p) => ({
      x: (p.x / 100 - 0.5) * n.w,
      y: (p.y / 100 - 0.5) * n.h,
    }));
    let nearest = Infinity;
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i],
        b = polygon[(i + 1) % polygon.length];
      const edge = { x: b.x - a.x, y: b.y - a.y },
        denominator = cross(ray, edge);
      if (Math.abs(denominator) < EPS) continue;
      const t = cross(a, edge) / denominator,
        u = cross(a, ray) / denominator;
      if (t >= 0 && u >= -EPS && u <= 1 + EPS && t < nearest) {
        nearest = t;
        point = { x: ray.x * t, y: ray.y * t };
        normal = { x: edge.y, y: -edge.x };
        if (normal.x * ray.x + normal.y * ray.y < 0) normal = { x: -normal.x, y: -normal.y };
      }
    }
    if (!point) {
      // Degenerate imported outlines still get a finite binding.
      const scale = Math.min(
        n.w / 2 / (Math.abs(ray.x) || EPS),
        n.h / 2 / (Math.abs(ray.y) || EPS),
      );
      point = { x: ray.x * scale, y: ray.y * scale };
      normal = ray;
    }
  }
  const length = Math.hypot(normal.x, normal.y) || 1;
  const outward = rotate({ x: normal.x / length, y: normal.y / length }, angle);
  const world = rotate(point, angle);
  return {
    x: c.x + world.x,
    y: c.y + world.y,
    nx: outward.x,
    ny: outward.y,
    anchor: { x: point.x / n.w + 0.5, y: point.y / n.h + 0.5 },
  };
}

export function anchorToward(n, anchor) {
  const c = center(n),
    local = rotate(
      { x: (anchor.x - 0.5) * n.w, y: (anchor.y - 0.5) * n.h },
      ((n.rotation || 0) * Math.PI) / 180,
    );
  return { x: c.x + local.x, y: c.y + local.y };
}

export function shapeContains(n, p, vertices) {
  const c = center(n),
    local = rotate({ x: p.x - c.x, y: p.y - c.y }, (-(n.rotation || 0) * Math.PI) / 180);
  if (n.type === 'circle' && !n.vertices)
    return (local.x / (n.w * 0.48)) ** 2 + (local.y / (n.h * 0.48)) ** 2 <= 1;
  const x = (local.x / n.w + 0.5) * 100,
    y = (local.y / n.h + 0.5) * 100;
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i],
      b = vertices[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function obstacleBoxes(objects, padding = 16) {
  return objects
    .filter((n) => !['connector', 'line', 'path', 'frame'].includes(n.type) && n.w > 0 && n.h > 0)
    .map((n) => {
      const angle = ((n.rotation || 0) * Math.PI) / 180,
        c = center(n);
      const w = Math.abs(n.w * Math.cos(angle)) + Math.abs(n.h * Math.sin(angle));
      const h = Math.abs(n.w * Math.sin(angle)) + Math.abs(n.h * Math.cos(angle));
      return {
        id: n.id,
        left: c.x - w / 2 - padding,
        right: c.x + w / 2 + padding,
        top: c.y - h / 2 - padding,
        bottom: c.y + h / 2 + padding,
      };
    });
}

/** Segment intersection with the open rectangle; routes may run along clearance boundaries. */
export function segmentHitsBox(a, b, box) {
  let low = 0,
    high = 1;
  for (const [coordinate, min, max] of [
    ['x', box.left + EPS, box.right - EPS],
    ['y', box.top + EPS, box.bottom - EPS],
  ]) {
    const delta = b[coordinate] - a[coordinate];
    if (Math.abs(delta) < EPS) {
      if (a[coordinate] <= min || a[coordinate] >= max) return false;
    } else {
      let first = (min - a[coordinate]) / delta,
        last = (max - a[coordinate]) / delta;
      if (first > last) [first, last] = [last, first];
      low = Math.max(low, first);
      high = Math.min(high, last);
      if (low >= high) return false;
    }
  }
  return high > 0 && low < 1;
}

export function routeSamples(route) {
  const numbers = route.d.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi)?.map(Number) || [];
  if (route.d.includes('C')) {
    const [x, y, ax, ay, bx, by, ex, ey] = numbers;
    return Array.from({ length: 33 }, (_, i) => {
      const t = i / 32,
        s = 1 - t;
      return {
        x: s * s * s * x + 3 * s * s * t * ax + 3 * s * t * t * bx + t * t * t * ex,
        y: s * s * s * y + 3 * s * s * t * ay + 3 * s * t * t * by + t * t * t * ey,
      };
    });
  }
  return Array.from({ length: numbers.length / 2 }, (_, i) => ({
    x: numbers[i * 2],
    y: numbers[i * 2 + 1],
  }));
}

export function pathBlocked(points, boxes) {
  return points.some((p, i) => i > 0 && boxes.some((box) => segmentHitsBox(points[i - 1], p, box)));
}

class Queue {
  heap = [];
  push(value) {
    let i = this.heap.length;
    this.heap.push(value);
    while (i) {
      const p = (i - 1) >> 1;
      if (this.heap[p].priority <= value.priority) break;
      this.heap[i] = this.heap[p];
      i = p;
    }
    this.heap[i] = value;
  }
  pop() {
    const first = this.heap[0],
      last = this.heap.pop();
    if (this.heap.length) {
      let i = 0;
      while (i * 2 + 1 < this.heap.length) {
        let child = i * 2 + 1;
        if (
          child + 1 < this.heap.length &&
          this.heap[child + 1].priority < this.heap[child].priority
        )
          child++;
        if (this.heap[child].priority >= last.priority) break;
        this.heap[i] = this.heap[child];
        i = child;
      }
      this.heap[i] = last;
    }
    return first;
  }
}

function exitStub(point, normal, box) {
  let length = 28;
  if (box) {
    const tx =
      normal.nx > EPS
        ? (box.right - point.x) / normal.nx
        : normal.nx < -EPS
          ? (box.left - point.x) / normal.nx
          : Infinity;
    const ty =
      normal.ny > EPS
        ? (box.bottom - point.y) / normal.ny
        : normal.ny < -EPS
          ? (box.top - point.y) / normal.ny
          : Infinity;
    length = Math.max(length, Math.min(tx, ty) + 1);
  }
  return { x: point.x + normal.nx * length, y: point.y + normal.ny * length };
}

function simplify(points) {
  const result = [];
  for (const point of points) {
    if (result.length && distance(result.at(-1), point) < EPS) continue;
    while (result.length > 1) {
      const a = result.at(-2),
        b = result.at(-1);
      if (
        Math.abs(cross({ x: b.x - a.x, y: b.y - a.y }, { x: point.x - b.x, y: point.y - b.y })) >
          EPS ||
        (b.x - a.x) * (point.x - b.x) + (b.y - a.y) * (point.y - b.y) < 0
      )
        break;
      result.pop();
    }
    result.push(point);
  }
  return result;
}

/** A sparse-coordinate Manhattan visibility grid, with a bend penalty and directional exits. */
export function avoidObstacles(start, end, firstNormal, lastNormal, boxes, from, to) {
  const a = exitStub(
    start,
    firstNormal,
    boxes.find((b) => b.id === from),
  );
  const b = exitStub(
    end,
    lastNormal,
    boxes.find((b) => b.id === to),
  );
  if (
    pathBlocked(
      [start, a],
      boxes.filter((box) => box.id !== from),
    ) ||
    pathBlocked(
      [end, b],
      boxes.filter((box) => box.id !== to),
    )
  )
    return null;
  // Bound graph size on very large boards; validate against every obstacle before returning.
  const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const selected = [...boxes]
    .sort(
      (x, y) =>
        Math.hypot((x.left + x.right) / 2 - midpoint.x, (x.top + x.bottom) / 2 - midpoint.y) -
        Math.hypot((y.left + y.right) / 2 - midpoint.x, (y.top + y.bottom) / 2 - midpoint.y),
    )
    .slice(0, 80);
  for (const id of [from, to]) {
    const box = boxes.find((box) => box.id === id);
    if (box && !selected.includes(box)) selected.push(box);
  }
  const xs = [...new Set([a.x, b.x, ...selected.flatMap((box) => [box.left, box.right])])].sort(
    (x, y) => x - y,
  );
  const ys = [...new Set([a.y, b.y, ...selected.flatMap((box) => [box.top, box.bottom])])].sort(
    (x, y) => x - y,
  );
  const size = ys.length,
    point = (index) => ({ x: xs[Math.floor(index / size)], y: ys[index % size] });
  const source = xs.indexOf(a.x) * size + ys.indexOf(a.y),
    target = xs.indexOf(b.x) * size + ys.indexOf(b.y);
  const inside = (p) =>
    selected.some(
      (box) =>
        p.x > box.left + EPS &&
        p.x < box.right - EPS &&
        p.y > box.top + EPS &&
        p.y < box.bottom - EPS,
    );
  if (inside(a) || inside(b)) return null;
  const queue = new Queue(),
    costs = new Map([[source * 3, 0]]),
    previous = new Map(),
    edges = new Map();
  queue.push({ key: source * 3, cost: 0, priority: distance(a, b) });
  let found;
  while (queue.heap.length) {
    const current = queue.pop();
    if (current.cost !== costs.get(current.key)) continue;
    const index = Math.floor(current.key / 3),
      direction = current.key % 3,
      p = point(index);
    if (index === target) {
      found = current.key;
      break;
    }
    const x = Math.floor(index / size),
      y = index % size;
    for (const [next, nextDirection] of [
      [x > 0 ? index - size : -1, 1],
      [x + 1 < xs.length ? index + size : -1, 1],
      [y > 0 ? index - 1 : -1, 2],
      [y + 1 < size ? index + 1 : -1, 2],
    ]) {
      if (next < 0) continue;
      const q = point(next),
        edgeKey = index < next ? index + ':' + next : next + ':' + index;
      if (!edges.has(edgeKey)) edges.set(edgeKey, !inside(q) && !pathBlocked([p, q], selected));
      if (!edges.get(edgeKey)) continue;
      const cost =
          current.cost + distance(p, q) + (direction && direction !== nextDirection ? 20 : 0),
        key = next * 3 + nextDirection;
      if (cost >= (costs.get(key) ?? Infinity)) continue;
      costs.set(key, cost);
      previous.set(key, current.key);
      queue.push({ key, cost, priority: cost + Math.abs(q.x - b.x) + Math.abs(q.y - b.y) });
    }
  }
  if (found === undefined) return null;
  const points = [];
  for (let key = found; key !== undefined; key = previous.get(key))
    points.push(point(Math.floor(key / 3)));
  points.reverse();
  if (pathBlocked(points, boxes)) return null;
  return simplify([start, ...points, end]);
}

export function routedPath(points, rounded = false) {
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const point = points[i],
      next = points[i + 1],
      previous = points[i - 1];
    const radius =
      rounded && next ? Math.min(8, distance(previous, point) / 3, distance(point, next) / 3) : 0;
    if (!radius) {
      d += ` L${point.x},${point.y}`;
      continue;
    }
    const before = {
      x: point.x + ((previous.x - point.x) * radius) / distance(previous, point),
      y: point.y + ((previous.y - point.y) * radius) / distance(previous, point),
    };
    const after = {
      x: point.x + ((next.x - point.x) * radius) / distance(point, next),
      y: point.y + ((next.y - point.y) * radius) / distance(point, next),
    };
    d += ` L${before.x},${before.y} Q${point.x},${point.y} ${after.x},${after.y}`;
  }
  const total = points.slice(1).reduce((sum, p, i) => sum + distance(points[i], p), 0);
  let remaining = total / 2,
    label = points[0];
  for (let i = 1; i < points.length; i++) {
    const length = distance(points[i - 1], points[i]);
    if (remaining <= length) {
      const t = length ? remaining / length : 0;
      label = {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
      };
      break;
    }
    remaining -= length;
  }
  return { d, labelX: label.x, labelY: label.y, start: points[0], end: points.at(-1), points };
}
