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

const center = (item) => ({
  x: (Number(item.x) || 0) + (Number(item.w) || 0) / 2,
  y: (Number(item.y) || 0) + (Number(item.h) || 0) / 2,
});

/**
 * Which way each topic grows: 'left' or 'right' of its root. A first-level topic's side is
 * read from where it sits relative to the root (so dragging it across switches sides);
 * deeper topics inherit their branch's side. Roots report 'right'.
 */
export function mindSides(objects = [], index = indexMindmap(objects)) {
  const { nodes, byId, children } = index;
  const sides = new Map();
  function assign(item, side, visited) {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    sides.set(item.id, side);
    for (const child of children.get(item.id) || []) assign(child, side, visited);
  }
  for (const item of nodes) {
    if (sides.has(item.id)) continue;
    // Walk up to this topic's root (cycle-safe), then label the whole tree.
    let top = item;
    const seen = new Set([item.id]);
    while (top.mindParent && byId.has(top.mindParent) && !seen.has(top.mindParent)) {
      top = byId.get(top.mindParent);
      seen.add(top.id);
    }
    sides.set(top.id, 'right');
    const visited = new Set([top.id]);
    const rootX = center(top).x;
    for (const child of children.get(top.id) || [])
      assign(child, center(child).x < rootX ? 'left' : 'right', visited);
  }
  return sides;
}

/** Number of topics below a topic (at any depth). */
export function descendantCount(objects = [], id, index = indexMindmap(objects)) {
  const seen = new Set([id]);
  const stack = [...(index.children.get(id) || [])];
  while (stack.length) {
    const item = stack.pop();
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    stack.push(...(index.children.get(item.id) || []));
  }
  return seen.size - 1;
}

/**
 * Layout only tagged mind-map items. Other whiteboard objects never move.
 * Roots keep their position; first-level branches stay on the side of the root they are on,
 * so a two-sided (radial) map remains two-sided.
 */
export function layoutMindmap(objects = [], options = {}) {
  const index = indexMindmap(objects);
  const { nodes, roots, children } = index;
  if (!nodes.length) return 0;
  const hgap = options.horizontalGap ?? 105;
  const vgap = options.verticalGap ?? 34;
  const rootGap = options.rootGap ?? 90;
  const sides = mindSides(objects, index);
  const heightCache = new Map();
  const visiting = new Set();
  const stackHeight = (list) =>
    list.reduce((acc, child) => acc + height(child), 0) + Math.max(0, list.length - 1) * vgap;
  function height(item) {
    if (heightCache.has(item.id)) return heightCache.get(item.id);
    if (visiting.has(item.id)) return Math.max(64, Number(item.h) || 70);
    visiting.add(item.id);
    const descendants = item.mindCollapsed ? [] : children.get(item.id) || [];
    const result = Math.max(Number(item.h) || 70, stackHeight(descendants));
    visiting.delete(item.id);
    heightCache.set(item.id, result);
    return result;
  }
  const placed = new Set();
  // Stack `list` vertically, centred on `middle`, growing away from `anchorX` towards `side`.
  function placeStack(list, anchorX, middle, side) {
    let cursor = middle - stackHeight(list) / 2;
    for (const child of list) {
      place(child, anchorX, cursor, side);
      cursor += height(child) + vgap;
    }
  }
  // `anchorX` is the edge facing the parent: left edge on the right side, right edge on the left.
  function place(item, anchorX, top, side) {
    if (placed.has(item.id)) return;
    placed.add(item.id);
    const span = height(item);
    if (!item.locked) {
      item.x = Math.round(side === 'left' ? anchorX - item.w : anchorX);
      item.y = Math.round(top + (span - item.h) / 2);
    }
    if (item.mindCollapsed) return;
    const descendants = (children.get(item.id) || []).filter((child) => !placed.has(child.id));
    const nextAnchor = side === 'left' ? item.x - hgap : item.x + item.w + hgap;
    placeStack(descendants, nextAnchor, item.y + item.h / 2, side);
  }
  function placeRoot(root, lastBottom) {
    placed.add(root.id);
    const kids = root.mindCollapsed
      ? []
      : (children.get(root.id) || []).filter((child) => !placed.has(child.id));
    const left = kids.filter((child) => sides.get(child.id) === 'left');
    const right = kids.filter((child) => sides.get(child.id) !== 'left');
    const span = Math.max(Number(root.h) || 70, stackHeight(left), stackHeight(right));
    const start = Math.max(root.y - (span - root.h) / 2, lastBottom + rootGap);
    if (!root.locked) root.y = Math.round(start + (span - root.h) / 2);
    const middle = root.y + root.h / 2;
    placeStack(right, root.x + root.w + hgap, middle, 'right');
    placeStack(left, root.x - hgap, middle, 'left');
    return start + span;
  }
  let lastBottom = -Infinity;
  for (const root of roots) lastBottom = placeRoot(root, lastBottom);
  // Imported cycles and damaged references are recovered as additional roots.
  for (const item of nodes) if (!placed.has(item.id)) lastBottom = placeRoot(item, lastBottom);
  return placed.size;
}

/** One topic and one standard Sparkboard connector: export/sync stays compatible. */
export function appendMindNode(
  objects,
  { id, connectorId, parentId = null, text = 'New topic', x = 280, y = 220, color = '#dce7cc' },
) {
  if (!id || objects.some((item) => item.id === id)) throw Error('A unique topic ID is required.');
  const parent = objects.find((item) => item.id === parentId && isMindNode(item));
  if (
    parent &&
    (!connectorId || connectorId === id || objects.some((item) => item.id === connectorId))
  )
    throw Error('A unique connector ID is required.');
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

const branchStyleKeys = ['route', 'endArrow', 'startArrow', 'color', 'strokeWidth', 'lineStyle'];
const incomingBranch = (objects, id) =>
  objects.find((item) => item.type === 'connector' && item.to === id);

/** Give `topicId` position `afterId + 1` among its siblings and renumber them 0..n-1. */
function orderAfter(objects, topicId, afterId) {
  const topic = objects.find((item) => item.id === topicId);
  const { children } = indexMindmap(objects);
  const siblings = (children.get(topic.mindParent) || []).filter((item) => item.id !== topicId);
  const at = afterId ? siblings.findIndex((item) => item.id === afterId) + 1 : siblings.length;
  siblings.splice(at > 0 ? at : siblings.length, 0, topic);
  siblings.forEach((item, i) => (item.mindOrder = i));
}

/**
 * Add a child topic. A child of a root goes to whichever side has fewer branches (ties go
 * right); deeper children grow on their parent's side and reuse its branch style.
 */
export function addMindChild(objects, { id, connectorId, parentId, text, hgap = 105 }) {
  const parent = objects.find((item) => item.id === parentId && isMindNode(item));
  if (!parent) throw Error('A mind-map parent topic is required.');
  const index = indexMindmap(objects);
  const sides = mindSides(objects, index);
  const kids = index.children.get(parent.id) || [];
  let side;
  if (!parent.mindParent || !index.byId.has(parent.mindParent)) {
    const leftCount = kids.filter((item) => sides.get(item.id) === 'left').length;
    side = leftCount < kids.length - leftCount ? 'left' : 'right';
  } else side = sides.get(parent.id) || 'right';
  const topic = appendMindNode(objects, { id, connectorId, parentId, text });
  topic.x = side === 'left' ? parent.x - hgap - topic.w : parent.x + parent.w + hgap;
  const inherited = incomingBranch(objects, parent.id);
  const edge = objects.find((item) => item.id === connectorId);
  if (inherited?.mindBranch && edge)
    for (const key of branchStyleKeys) if (key in inherited) edge[key] = inherited[key];
  orderAfter(objects, topic.id, null);
  return topic;
}

/**
 * Add a topic directly after `siblingId` (same parent, same side, same look). A root has no
 * siblings, so for a root this adds a child instead; `asChild` reports which happened.
 */
export function insertMindSibling(objects, { id, connectorId, siblingId, text }) {
  const sibling = objects.find((item) => item.id === siblingId && isMindNode(item));
  if (!sibling) throw Error('A mind-map topic is required.');
  const parent = objects.find((item) => item.id === sibling.mindParent && isMindNode(item));
  if (!parent) {
    return {
      topic: addMindChild(objects, { id, connectorId, parentId: sibling.id, text }),
      asChild: true,
    };
  }
  const topic = appendMindNode(objects, { id, connectorId, parentId: parent.id, text });
  Object.assign(topic, {
    type: sibling.type,
    w: sibling.w,
    h: sibling.h,
    color: sibling.color,
    // Same column and just below the sibling, so it lands on the same side before layout.
    x: sibling.x,
    y: sibling.y + sibling.h + 1,
  });
  const siblingEdge = incomingBranch(objects, sibling.id);
  const edge = objects.find((item) => item.id === connectorId);
  if (siblingEdge && edge)
    for (const key of branchStyleKeys) {
      if (key in siblingEdge) edge[key] = siblingEdge[key];
      else delete edge[key];
    }
  orderAfter(objects, topic.id, sibling.id);
  return { topic, asChild: false };
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
