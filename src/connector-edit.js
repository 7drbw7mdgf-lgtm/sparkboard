import { $, esc, M } from './core.js';
import { state } from './state.js';
import { commit } from './history.js';
import { modal } from './dialogs.js';
import { toast } from './notifications.js';
import {
  endpointChoice,
  restoreAutoRouting,
  setConnectorRouting,
  setEndpointChoice,
} from './connector-interaction.js';

const option = (values, active) =>
  values
    .map(
      ([value, label]) =>
        `<option value="${value}"${String(active) === value ? ' selected' : ''}>${label}</option>`,
    )
    .join('');
const capOptions = ['none', 'arrow', 'filled', 'circle', 'diamond'].map((x) => [x, x]);
const portOptions = [
  ['', 'Automatic · follows outline'],
  ['n', 'Top'],
  ['e', 'Right'],
  ['s', 'Bottom'],
  ['w', 'Left'],
];
const endpointOptions = (edge, side) =>
  edge[side + 'Anchor']
    ? [portOptions[0], ['glued', 'Glued to outline · drag endpoint to move'], ...portOptions.slice(1)]
    : portOptions;

function liveConnector(id) {
  return state.board?.objects.find((n) => n.id === id && n.type === 'connector');
}

/** Advanced connector controls reuse the existing standard connector objects. */
export function openConnectorControls(target) {
  const id = typeof target === 'string' ? target : target?.id;
  const edge = liveConnector(id);
  if (!edge || edge.locked) return;
  modal(
    'Edit connector',
    `<form id="connector-advanced" class="connector-advanced">
    <p>Glue endpoints to shape outlines, pin them to cardinal ports, or keep them automatic. Elbow routes recalculate during dragging, resizing and rotation until you add a manual bend.</p>
    <p class="ca-routing-status" role="status">${edge.waypoints?.length ? 'Manual route · automatic avoidance is paused' : edge.avoidObstacles === false ? 'Direct route · obstacle avoidance is off' : 'Auto-route · avoids other shapes'}</p>
    <label>Label<input id="ca-label" maxlength="160" value="${esc(edge.text || '')}" placeholder="e.g. Yes, No, next"></label>
    <div class="ca-grid">
      <label>Route<select id="ca-route">${option(
        [
          ['straight', 'Straight'],
          ['elbow', 'Elbow / orthogonal'],
          ['curved', 'Curved'],
        ],
        edge.route || 'straight',
      )}</select></label>
      <label>Pattern<select id="ca-pattern">${option(
        [
          ['solid', 'Solid'],
          ['dashed', 'Dashed'],
          ['dotted', 'Dotted'],
        ],
        edge.lineStyle || 'solid',
      )}</select></label>
      <label>Source port<select id="ca-from">${option(endpointOptions(edge, 'from'), endpointChoice(edge, 'from'))}</select></label>
      <label>Target port<select id="ca-to">${option(endpointOptions(edge, 'to'), endpointChoice(edge, 'to'))}</select></label>
      <label>Start arrow<select id="ca-start">${option(capOptions, edge.startArrow || 'none')}</select></label>
      <label>End arrow<select id="ca-end">${option(capOptions, edge.endArrow || 'arrow')}</select></label>
      <label>Thickness<select id="ca-width">${option(
        [
          ['1', '1px'],
          ['2', '2px'],
          ['3', '3px'],
          ['4', '4px'],
          ['6', '6px'],
          ['8', '8px'],
        ],
        String(edge.strokeWidth || 2),
      )}</select></label>
      <label>Line colour<input id="ca-color" type="color" value="${/^#[a-f0-9]{6}$/i.test(edge.color || '') ? edge.color : '#64748b'}"></label>
      <label>Routing<select id="ca-auto">${option(
        [
          ['auto', 'Auto · avoid shapes'],
          ['manual', 'Manual · fixed bends'],
          ['direct', 'Direct · no obstacle avoidance'],
        ],
        edge.waypoints?.length ? 'manual' : edge.avoidObstacles === false ? 'direct' : 'auto',
      )}</select></label>
    </div>
    <button type="submit" class="ca-primary">Apply connector style</button>
    <div class="ca-buttons"><button type="button" data-ca-tool="waypoint">＋ Add bend point</button>
    <button type="button" data-ca-tool="clear">Reset bends</button>
    <button type="button" data-ca-tool="auto">↻ Restore auto-route</button>
    <button type="button" data-ca-tool="reverse">⇄ Reverse direction</button>
    ${edge.relationship ? '<button type="button" data-ca-tool="unpin">Unpin relationship ends</button>' : ''}</div>
    <small>Drag an end onto an outline to glue it, or onto an anchor cross to pin it. Drag the line to add a manual bend. Reset bends to restore auto-routing.</small>
  </form>`,
    'ADVANCED CONNECTIONS',
  );
  const element = $('#connector-advanced');
  element.onsubmit = (event) => {
    event.preventDefault();
    const next = liveConnector(id);
    if (!next) return;
    commit(() => {
      next.text = $('#ca-label').value.trim();
      next.route = $('#ca-route').value;
      next.lineStyle = $('#ca-pattern').value;
      next.startArrow = $('#ca-start').value;
      next.endArrow = $('#ca-end').value;
      next.strokeWidth = Number($('#ca-width').value);
      next.color = $('#ca-color').value;
      setEndpointChoice(next, 'from', $('#ca-from').value);
      setEndpointChoice(next, 'to', $('#ca-to').value);
      setConnectorRouting(next, $('#ca-auto').value, state.board.objects);
    });
    $('#dialog').close();
    toast('Connector updated');
  };
  element.addEventListener('click', (event) => {
    const action = event.target.closest('[data-ca-tool]')?.dataset.caTool;
    if (!action) return;
    const next = liveConnector(id);
    if (!next) return;
    commit(() => {
      if (action === 'waypoint') {
        const route = M.connectorRoute(next, state.board.objects);
        if (next.waypoints?.length >= 12) return;
        next.waypoints ??= [];
        next.waypoints.push({ x: Math.round(route.labelX), y: Math.round(route.labelY + 55) });
        next.avoidObstacles = false;
      }
      if (action === 'clear' || action === 'auto') restoreAutoRouting(next);
      if (action === 'unpin' && next.relationship) {
        delete next.fromPort;
        delete next.toPort;
        delete next.fromAnchor;
        delete next.toAnchor;
      }
      if (action === 'reverse') {
        [next.from, next.to] = [next.to, next.from];
        [next.fromPort, next.toPort] = [next.toPort, next.fromPort];
        [next.fromAnchor, next.toAnchor] = [next.toAnchor, next.fromAnchor];
        [next.startArrow, next.endArrow] = [next.endArrow, next.startArrow];
        if (next.waypoints) next.waypoints.reverse();
      }
    });
    $('#dialog').close();
    toast(
      action === 'waypoint'
        ? 'Drag the blue bend point on the canvas'
        : action === 'clear'
          ? 'Bend points reset'
          : action === 'auto'
            ? 'Automatic obstacle routing restored'
            : action === 'unpin'
              ? 'Relationship ends now slide along topic outlines'
              : 'Connector reversed',
    );
  });
}

export function setupConnectorEdit() {
  document.addEventListener('sparkboard:connector-edit', (event) =>
    openConnectorControls(event.detail?.id),
  );
}
