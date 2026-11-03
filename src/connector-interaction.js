/**
 * Shared connector interaction policy for the desktop and compact/touch editors.
 * Board data stays in the standard connector format for sync and exports.
 */
import * as M from '../board-model.js';

const fixedPorts = new Set(['n', 'e', 's', 'w']);

export function connectorPreviewPolicy(fromPort) {
  const fixed = fixedPorts.has(fromPort);
  return { fixed, avoidObstacles: !fixed };
}

export function connectionProperties(drag, draft, options = {}, bothMind = false) {
  const base = { from: drag.from, to: draft.to, ...options };
  const fixed = connectorPreviewPolicy(drag.fromPort).fixed;
  if (bothMind) {
    // A relationship is not a hierarchy edge. Centre dots glide around
    // outlines; side dots pin both ends and deliberately allow crossings.
    return {
      ...base,
      relationship: true,
      route: 'curved',
      endArrow: 'arrow',
      ...(fixed ? { fromPort: drag.fromPort, toPort: draft.toPort, avoidObstacles: false } : {}),
    };
  }
  if (drag.fromPort === 'c') return base;
  if (fixed)
    return {
      ...base,
      fromPort: drag.fromPort,
      toPort: draft.toPort,
      avoidObstacles: false,
    };
  return {
    ...base,
    fromAnchor: drag.fromAnchor,
    toPort: draft.toPort,
    toAnchor: draft.toAnchor,
  };
}

export function endpointChoice(edge, side) {
  if (side !== 'from' && side !== 'to') throw new Error('Invalid connector endpoint');
  return edge[side + 'Anchor'] ? 'glued' : edge[side + 'Port'] || '';
}

/** Styling a connector must not silently remove its outline glue. */
export function setEndpointChoice(edge, side, choice) {
  if (side !== 'from' && side !== 'to') throw new Error('Invalid connector endpoint');
  if (choice === 'glued') {
    // A glued location is set by dragging the endpoint onto an outline.
    // Preserve that exact normalized anchor while editing other properties.
    return Boolean(edge[side + 'Anchor']);
  }
  if (choice && !fixedPorts.has(choice)) throw new Error('Invalid connector port');
  delete edge[side + 'Anchor'];
  if (choice) edge[side + 'Port'] = choice;
  else delete edge[side + 'Port'];
  return true;
}

/** Manual bends suspend avoidance; auto and direct modes clear their bends. */
export function setConnectorRouting(edge, mode, objects) {
  if (!['auto', 'direct', 'manual'].includes(mode))
    throw new Error('Invalid connector routing mode');
  if (mode === 'manual') {
    if (!edge.waypoints?.length) {
      const route = M.connectorRoute(edge, objects);
      if (route.d && Number.isFinite(route.labelX) && Number.isFinite(route.labelY))
        edge.waypoints = [{ x: Math.round(route.labelX), y: Math.round(route.labelY) }];
    }
    edge.avoidObstacles = false;
    return;
  }
  delete edge.waypoints;
  edge.avoidObstacles = mode === 'auto';
}

export function restoreAutoRouting(edge) {
  delete edge.waypoints;
  edge.avoidObstacles = true;
}
