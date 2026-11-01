import { indexMindmap, isMindNode } from './mindmap-model.js';

export const MIND_PALETTES = Object.freeze({
  forest: { label: 'Forest', nodes: ['#dcebdc', '#cde7e2', '#e9e3c8', '#e1e9cf'], edge: '#6e927c', text: '#233b30' },
  ocean: { label: 'Ocean', nodes: ['#dbeafe', '#d6e8ff', '#c7e5ee', '#e4e4fa'], edge: '#547da8', text: '#1e3c60' },
  sunset: { label: 'Sunset', nodes: ['#ffe0cd', '#ffead0', '#f9d4da', '#f9e2ed'], edge: '#bd7772', text: '#693f39' },
  violet: { label: 'Violet', nodes: ['#e7defc', '#dddffd', '#efdef1', '#e6e2ff'], edge: '#8473b4', text: '#42315c' },
  slate: { label: 'Slate', nodes: ['#e2e8f0', '#e5ebef', '#dde5e9', '#edf0f2'], edge: '#64748b', text: '#334155' },
});
export const MIND_ROUTES = ['curved', 'elbow', 'straight'];
export const MIND_PATTERNS = ['solid', 'dashed', 'dotted'];

function memberIds(objects, topicId) {
  const index = indexMindmap(objects);
  if (!index.byId.has(topicId)) return [];
  const seen = new Set();
  const todo = [{ id: topicId, depth: 0 }];
  const found = [];
  while (todo.length) {
    const current = todo.pop();
    if (seen.has(current.id)) continue;
    seen.add(current.id);
    found.push(current);
    for (const child of index.children.get(current.id) || [])
      todo.push({ id: child.id, depth: current.depth + 1 });
  }
  return found;
}

/** Apply a theme to one topic subtree, not to unrelated whiteboard objects. */
export function applyMindMaster(objects, topicId, style) {
  const palette = MIND_PALETTES[style.palette];
  if (!palette || !MIND_ROUTES.includes(style.route) ||
      !MIND_PATTERNS.includes(style.lineStyle) ||
      !['none', 'arrow', 'filled', 'circle', 'diamond'].includes(style.endArrow))
    throw Error('Invalid branch style');
  const width = Number(style.strokeWidth);
  if (!Number.isFinite(width) || width < 1 || width > 8) throw Error('Invalid branch width');
  const members = memberIds(objects, topicId);
  if (!members.length) throw Error('Mind-map topic not found');
  const nodeMap = new Map(objects.map((n) => [n.id, n]));
  const ids = new Set(members.map((m) => m.id));
  const master = nodeMap.get(topicId);
  master.mindMaster = {
    palette: style.palette, route: style.route,
    lineStyle: style.lineStyle, endArrow: style.endArrow, strokeWidth: width,
  };
  for (const { id, depth } of members) {
    const topic = nodeMap.get(id);
    if (!isMindNode(topic) || topic.locked) continue;
    topic.color = palette.nodes[depth % palette.nodes.length];
    topic.textColor = palette.text;
    topic.stroke = palette.edge;
    topic.strokeWidth = 1.8;
  }
  for (const edge of objects) {
    if (edge.type !== 'connector' || !edge.mindBranch ||
        !ids.has(edge.from) || !ids.has(edge.to) || edge.locked) continue;
    Object.assign(edge, {
      route: style.route, lineStyle: style.lineStyle,
      endArrow: style.endArrow, startArrow: 'none',
      strokeWidth: width, color: palette.edge,
    });
    delete edge.waypoints;
  }
  return members.length;
}

export function inheritedMindMaster(objects, topicId) {
  const index = indexMindmap(objects);
  const seen = new Set();
  let topic = index.byId.get(topicId);
  while (topic && !seen.has(topic.id)) {
    seen.add(topic.id);
    if (topic.mindMaster && MIND_PALETTES[topic.mindMaster.palette]) return topic.mindMaster;
    topic = index.byId.get(topic.mindParent);
  }
  return null;
}

export function themeNewMindTopic(objects, topicId) {
  const index = indexMindmap(objects);
  const topic = index.byId.get(topicId);
  if (!topic) return false;
  const ancestor = index.byId.get(topic.mindParent);
  const scheme = inheritedMindMaster(objects, ancestor?.id);
  if (!scheme) return false;
  const palette = MIND_PALETTES[scheme.palette];
  topic.color = palette.nodes[1];
  topic.textColor = palette.text;
  topic.stroke = palette.edge;
  const connector = objects.find((edge) => edge.type === 'connector' &&
    edge.from === ancestor.id && edge.to === topicId);
  if (connector) Object.assign(connector, {
    route: scheme.route, lineStyle: scheme.lineStyle,
    endArrow: scheme.endArrow, strokeWidth: scheme.strokeWidth, color: palette.edge,
  });
  return true;
}
