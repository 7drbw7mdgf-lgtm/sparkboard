import { M, esc } from './core.js';
import { shapeNames } from './icons.js';

/** Connectors can originate from spatial objects, not existing paths or lines. */
export function canConnectNode(node) {
  return (
    !!node &&
    !node.locked &&
    !['path', 'line', 'connector', 'frame', 'file', 'image', 'embed'].includes(node.type)
  );
}

/** One contextual mobile row: the rest of the canvas stays clear for dragging. */
export function mobileActionMarkup(
  nodes,
  reshapeId,
  reshapeMode = 'points',
  selectedVertex = null,
  diagramMode = 'canvas',
) {
  if (!nodes.length) return '';
  const single = nodes.length === 1 ? nodes[0] : null;
  const shape = single && M.shapes.includes(single.type) && !single.locked;
  const reshaping = shape && reshapeId === single.id;
  const button = (text, action, active = false) =>
    '<button type="button" data-mobile-action="' +
    action +
    '"' +
    (active ? ' class="active" aria-pressed="true"' : '') +
    ' aria-label="' +
    esc(text) +
    '">' +
    esc(text) +
    '</button>';
  let actions = '';
  if (reshaping) {
    actions += reshapeMode === 'points' ? button('⌁ Bend', 'bend') : button('◈ Points', 'points');
    if (
      reshapeMode === 'points' &&
      Number.isInteger(selectedVertex) &&
      selectedVertex >= 0 &&
      selectedVertex < M.shapeVertices(single).length &&
      M.shapeVertices(single).length > 3
    ) {
      actions += button('− Point', 'remove-point');
    }
    actions += button('✓ Done', 'done');
  } else if (shape) {
    actions += button('◈ Nodes', 'nodes');
  } else if (single && ['text', 'sticky'].includes(single.type) && !single.locked) {
    actions += button('✎ Text', 'edit');
  }
  if (!reshaping && diagramMode === 'flowchart' && canConnectNode(single))
    actions += button('＋ Next', 'flow-next');
  if (!reshaping && canConnectNode(single)) actions += button('↗ Connect', 'connect');
  if (single?.type === 'connector' && !single.locked)
    actions += button('↝ Route', 'connector-style');
  actions += button('⚙ Format', 'format');
  if (!reshaping && nodes.some((n) => !n.locked)) actions += button('⧉ Copy', 'duplicate');
  return (
    '<div class="mobile-actions-inner" role="group" aria-label="' +
    esc(
      single
        ? (shapeNames[single.type] || single.type) + ' quick actions'
        : 'Selected items quick actions',
    ) +
    '">' +
    actions +
    '</div>'
  );
}
