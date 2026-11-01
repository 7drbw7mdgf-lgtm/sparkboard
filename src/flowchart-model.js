/**
 * Flowcharts reuse Sparkboard shapes and ordinary connectors. No new storage or export format.
 */
export const FLOW_STEPS = Object.freeze({
  start: { type: 'pill', label: 'Start', color: '#dcf2e8', stroke: '#409476', w: 166, h: 76 },
  process: { type: 'shape', label: 'New step', color: '#e7edff', stroke: '#687cc2', w: 204, h: 96 },
  decision: {
    type: 'diamond',
    label: 'Decision?',
    color: '#fff0d3',
    stroke: '#c9963e',
    w: 214,
    h: 122,
  },
  data: {
    type: 'parallelogram',
    label: 'Input / output',
    color: '#e8e6ff',
    stroke: '#8470ba',
    w: 204,
    h: 96,
  },
  end: { type: 'pill', label: 'End', color: '#fce7e8', stroke: '#ce7a86', w: 166, h: 76 },
});

export function isFlowNode(item) {
  return (
    item && !['connector', 'line', 'path', 'frame', 'image', 'file', 'embed'].includes(item.type)
  );
}

function intersects(a, b, padding = 24) {
  return (
    a.x < b.x + b.w + padding &&
    a.x + a.w + padding > b.x &&
    a.y < b.y + b.h + padding &&
    a.y + a.h + padding > b.y
  );
}

/** Place successors next to the source and avoid collisions with existing canvas art. */
export function flowPosition(objects, source, dimensions, center = { x: 420, y: 280 }) {
  const originX = source ? source.x + source.w + 112 : center.x - dimensions.w / 2;
  const originY = source ? source.y + (source.h - dimensions.h) / 2 : center.y - dimensions.h / 2;
  const occupied = objects.filter(
    (o) => o?.w > 0 && o?.h > 0 && !['connector', 'line', 'path', 'frame'].includes(o.type),
  );
  for (let attempt = 0; attempt < 80; attempt++) {
    const col = Math.floor(attempt / 8);
    const row = attempt % 8;
    const yOffset = row ? Math.ceil(row / 2) * (dimensions.h + 48) * (row % 2 ? 1 : -1) : 0;
    const candidate = {
      x: Math.round(originX + col * (dimensions.w + 112)),
      y: Math.round(originY + yOffset),
      w: dimensions.w,
      h: dimensions.h,
    };
    if (!occupied.some((other) => intersects(candidate, other))) return candidate;
  }
  return { x: originX + 220, y: originY + occupied.length * 24, ...dimensions };
}

export function connectFlowNodes(objects, fromId, toId, makeId) {
  if (fromId === toId) throw Error('Choose two different nodes to link.');
  const source = objects.find((o) => o.id === fromId && isFlowNode(o));
  const target = objects.find((o) => o.id === toId && isFlowNode(o));
  if (!source || !target) throw Error('Select two shapes to create a link.');
  const existing = objects.find(
    (o) =>
      o.type === 'connector' &&
      ((o.from === fromId && o.to === toId) || (o.from === toId && o.to === fromId)),
  );
  if (existing) return existing;
  const dx = target.x + target.w / 2 - (source.x + source.w / 2);
  const dy = target.y + target.h / 2 - (source.y + source.h / 2);
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const fromPort = horizontal ? (dx >= 0 ? 'e' : 'w') : dy >= 0 ? 's' : 'n';
  const toPort = horizontal ? (dx >= 0 ? 'w' : 'e') : dy >= 0 ? 'n' : 's';
  const edge = {
    id: makeId(),
    type: 'connector',
    from: fromId,
    to: toId,
    route: 'elbow',
    fromPort,
    toPort,
    color: '#64748b',
    strokeWidth: 2.5,
    endArrow: 'filled',
    flowEdge: true,
  };
  if (source.flowRole === 'decision') {
    const outgoing = objects.filter((item) => item.type === 'connector' && item.from === source.id);
    if (outgoing.length === 0) edge.text = 'Yes';
    else if (outgoing.length === 1) edge.text = 'No';
  }
  objects.push(edge);
  return edge;
}

export function createFlowStep(objects, { role = 'process', fromId = null, makeId, center } = {}) {
  const style = FLOW_STEPS[role];
  if (!style || typeof makeId !== 'function') throw Error('Invalid flowchart step.');
  const source = objects.find((o) => o.id === fromId && isFlowNode(o));
  const position = flowPosition(objects, source, style, center);
  const created = {
    id: makeId(),
    type: style.type,
    text: style.label,
    x: position.x,
    y: position.y,
    w: style.w,
    h: style.h,
    color: style.color,
    stroke: style.stroke,
    strokeWidth: 2,
    cornerRadius: 15,
    fontSize: 17,
    fontWeight: 650,
    flowRole: role,
  };
  if (objects.some((o) => o.id === created.id)) throw Error('Duplicate shape ID.');
  objects.push(created);
  if (source) connectFlowNodes(objects, source.id, created.id, makeId);
  return created;
}
