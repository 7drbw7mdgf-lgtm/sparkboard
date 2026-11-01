/**
 * Mind-map hierarchy over Sparkboard's existing objects and connector model.
 * All functions operate on ordinary board objects; no parallel document format.
 */
export const isMindNode = (object) =>
  object?.mindmap === true && !['connector', 'line', 'path'].includes(object.type);

export function indexMindmap(objects = []) {
  const nodes = objects.filter(isMindNode);
  const byId = new Map(nodes.map((item) => [item.id, item]));
  const children = new Map(nodes.map((item) => [item.id, []]));
  const roots = [];
  for (const item of nodes) {
    if (item.mindParent && item.mindParent !== item.id && byId.has(item.mindParent))
      children.get(item.mindParent).push(item);
    else roots.push(item);
  }
  const order = (a, b) =>
    (Number(a.mindOrder) || 0) - (Number(b.mindOrder) || 0) ||
    (Number(a.y) || 0) - (Number(b.y) || 0) ||
    String(a.id).localeCompare(String(b.id));
  roots.sort(order);
  for (const list of children.values()) list.sort(order);
  return { nodes, byId, children, roots };
}

export function hiddenMindmapIds(objects = []) {
  const { nodes, byId } = indexMindmap(objects);
  const hidden = new Set();
  for (const item of nodes) {
    const visited = new Set([item.id]);
    let current = item;
    while (current.mindParent && byId.has(current.mindParent)) {
      const parent = byId.get(current.mindParent);
      if (visited.has(parent.id)) break; // Malformed imported hierarchies must not hang.
      visited.add(parent.id);
      if (parent.mindCollapsed) {
        hidden.add(item.id);
        break;
      }
      current = parent;
    }
  }
  return hidden;
}

export function outlineMindmap(objects = []) {
  const { nodes, roots, children } = indexMindmap(objects);
  const rows = [];
  const seen = new Set();
  function visit(item, depth, concealed) {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    rows.push({
      id: item.id,
      depth,
      node: item,
      concealed,
      childCount: children.get(item.id).length,
    });
    for (const child of children.get(item.id))
      visit(child, depth + 1, concealed || !!item.mindCollapsed);
  }
  roots.forEach((item) => visit(item, 0, false));
  nodes.forEach((item) => visit(item, 0, false)); // Also recover malformed cycles.
  return rows;
}

/** Layout only tagged mind-map items. Other whiteboard objects never move. */
export function layoutMindmap(objects = [], options = {}) {
  const { nodes, roots, children } = indexMindmap(objects);
  if (!nodes.length) return 0;
  const hgap = options.horizontalGap ?? 105;
  const vgap = options.verticalGap ?? 34;
  const rootGap = options.rootGap ?? 90;
  const heightCache = new Map();
  const visiting = new Set();
  function height(item) {
    if (heightCache.has(item.id)) return heightCache.get(item.id);
    if (visiting.has(item.id)) return Math.max(64, Number(item.h) || 70);
    visiting.add(item.id);
    const descendants = item.mindCollapsed ? [] : children.get(item.id) || [];
    const sum = descendants.reduce((acc, child) => acc + height(child), 0);
    const result = Math.max(Number(item.h) || 70, sum + Math.max(0, descendants.length - 1) * vgap);
    visiting.delete(item.id);
    heightCache.set(item.id, result);
    return result;
  }
  const placed = new Set();
  function place(item, x, top) {
    if (placed.has(item.id)) return;
    placed.add(item.id);
    const span = height(item);
    if (!item.locked) {
      item.x = Math.round(x);
      item.y = Math.round(top + (span - item.h) / 2);
    }
    if (item.mindCollapsed) return;
    const descendants = (children.get(item.id) || []).filter((child) => !placed.has(child.id));
    const total =
      descendants.reduce((acc, child) => acc + height(child), 0) +
      Math.max(0, descendants.length - 1) * vgap;
    let cursor = top + (span - total) / 2;
    for (const child of descendants) {
      place(child, item.x + item.w + hgap, cursor);
      cursor += height(child) + vgap;
    }
  }
  let lastBottom = -Infinity;
  for (const root of roots) {
    const span = height(root);
    const start = Math.max(root.y - (span - root.h) / 2, lastBottom + rootGap);
    place(root, root.x, start);
    lastBottom = start + span;
  }
  // Imported cycles and damaged references are recovered as additional roots.
  for (const item of nodes) {
    if (placed.has(item.id)) continue;
    const span = height(item);
    const start = Math.max(item.y - (span - item.h) / 2, lastBottom + rootGap);
    place(item, item.x, start);
    lastBottom = start + span;
  }
  return placed.size;
}

/** One topic and one standard Sparkboard connector: export/sync stays compatible. */
export function appendMindNode(
  objects,
  { id, connectorId, parentId = null, text = 'New topic', x = 280, y = 220, color = '#dce7cc' },
) {
  if (!id || objects.some((item) => item.id === id)) throw Error('A unique topic ID is required.');
  const parent = objects.find((item) => item.id === parentId && isMindNode(item));
  const topic = {
    id,
    type: 'shape',
    text,
    x: parent ? parent.x + parent.w + 105 : x,
    y: parent ? parent.y : y,
    w: 190,
    h: 74,
    color,
    mindmap: true,
    mindParent: parent?.id || null,
    mindCollapsed: false,
    mindOrder: parent ? objects.filter((item) => item.mindParent === parent.id).length : 0,
  };
  objects.push(topic);
  if (parent) {
    if (!connectorId || objects.some((item) => item.id === connectorId))
      throw Error('A unique connector ID is required.');
    objects.push({
      id: connectorId,
      type: 'connector',
      from: parent.id,
      to: id,
      route: 'curved',
      endArrow: 'none',
      mindBranch: true,
      color: '#7a8e81',
      strokeWidth: 2,
    });
  }
  return topic;
}

/** Convert an existing node and its existing connector descendants, without cloning art. */
export function adoptMindTree(objects, rootId) {
  const byId = new Map(
    objects
      .filter((item) => !['connector', 'line', 'path'].includes(item.type))
      .map((item) => [item.id, item]),
  );
  const root = byId.get(rootId);
  if (!root) return 0;
  const visited = new Set();
  function visit(item, parentId = null) {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    item.mindmap = true;
    item.mindParent = parentId;
    const outgoing = objects.filter(
      (edge) => edge.type === 'connector' && edge.from === item.id && byId.has(edge.to),
    );
    outgoing.forEach((edge, index) => {
      const child = byId.get(edge.to);
      if (visited.has(child.id)) return;
      child.mindOrder = index;
      edge.mindBranch = true;
      visit(child, item.id);
    });
  }
  visit(root);
  return visited.size;
}
