import { M, esc } from './core.js';
import { shapeNames } from './icons.js';

/** One contextual mobile row: the rest of the canvas stays clear for dragging. */
export function mobileActionMarkup(nodes, reshapeId, reshapeMode = 'points') {
  if (!nodes.length) return '';
  const single = nodes.length === 1 ? nodes[0] : null;
  const shape = single && M.shapes.includes(single.type) && !single.locked;
  const reshaping = shape && reshapeId === single.id;
  const button = (text, action, active = false) =>
    '<button type="button" data-mobile-action="' + action + '"' +
    (active ? ' class="active" aria-pressed="true"' : '') +
    ' aria-label="' + esc(text) + '">' + esc(text) + '</button>';
  let actions = '';
  if (reshaping) {
    actions += button('Points', 'points', reshapeMode === 'points');
    actions += button('Bend', 'bend', reshapeMode === 'bend');
    actions += button('Done', 'done');
  } else if (shape) {
    actions += button('◈ Nodes', 'nodes');
  } else if (single && ['text', 'sticky'].includes(single.type) && !single.locked) {
    actions += button('✎ Text', 'edit');
  }
  actions += button('⚙ Format', 'format');
  if (!reshaping && nodes.some((n) => !n.locked)) actions += button('⧉ Copy', 'duplicate');
  return '<div class="mobile-actions-inner" role="group" aria-label="' +
    esc(single ? (shapeNames[single.type] || single.type) + ' quick actions' : 'Selected items quick actions') +
    '">' + actions + '</div>';
}
