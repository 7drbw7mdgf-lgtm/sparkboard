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
    ? [
        portOptions[0],
        ['glued', 'Glued to outline · drag endpoint to move'],
        ...portOptions.slice(1),
      ]
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
    <fieldset class="ca-bend-editor" id="ca-bend-editor">
      <legend>Elbow bend points</legend>
      <p>Precisely position each bend, or nudge it by 10 canvas units. Manual points keep the chosen route fixed until you restore auto-routing.</p>
      <div class="ca-grid">
        <label>Choose bend<select id="ca-bend-index">${(edge.waypoints || []).map((point, index) => '<option value="' + index + '">Bend ' + (index + 1) + '</option>').join('') || '<option value="">No manual bends yet</option>'}</select></label>
        <label>Step size<select id="ca-bend-step"><option value="1">1 unit</option><option value="5">5 units</option><option value="10" selected>10 units</option><option value="25">25 units</option><option value="50">50 units</option></select></label>
        <label>X position<input id="ca-bend-x" type="number" step="1" value="${edge.waypoints?.[0]?.x ?? ''}" placeholder="Canvas X"></label>
        <label>Y position<input id="ca-bend-y" type="number" step="1" value="${edge.waypoints?.[0]?.y ?? ''}" placeholder="Canvas Y"></label>
      </div>
      <div class="ca-buttons">
        <button type="button" data-ca-tool="left">← Left</button>
        <button type="button" data-ca-tool="right">Right →</button>
        <button type="button" data-ca-tool="up">↑ Up</button>
        <button type="button" data-ca-tool="down">↓ Down</button>
        <button type="button" data-ca-tool="set">Set X / Y</button>
        <button type="button" data-ca-tool="remove">Remove bend</button>
      </div>
    </fieldset>
    <button type="submit" class="ca-primary">Apply connector style</button>
    <div class="ca-buttons"><button type="button" data-ca-tool="waypoint">＋ Add bend point</button>
    <button type="button" data-ca-tool="clear">Reset bends</button>
    <button type="button" data-ca-tool="elbow-h">Elbow · horizontal first</button>
    <button type="button" data-ca-tool="elbow-v">Elbow · vertical first</button>
    <button type="button" data-ca-tool="straighten">Straighten manual bends</button>
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
      // Coordinate editing is optional: only update a bend when numbers are explicitly supplied.
      if (next.route === 'elbow' && $('#ca-auto').value === 'manual') {
        const selected = Number($('#ca-bend-index').value);
        const rawX = $('#ca-bend-x').value;
        const rawY = $('#ca-bend-y').value;
        if (next.waypoints?.[selected] && rawX !== '' && rawY !== '') {
          const x = Number(rawX);
          const y = Number(rawY);
          if (Number.isFinite(x) && Number.isFinite(y)) {
            next.waypoints[selected] = { x: Math.round(x), y: Math.round(y) };
          }
        }
      }
    });
    $('#dialog').close();
    toast('Connector updated');
  };
  const bendSelector = $('#ca-bend-index');
  const refreshBendPosition = () => {
    const value = liveConnector(id)?.waypoints?.[Number(bendSelector.value)];
    $('#ca-bend-x').value = value ? String(Math.round(value.x)) : '';
    $('#ca-bend-y').value = value ? String(Math.round(value.y)) : '';
  };
  bendSelector.addEventListener('change', refreshBendPosition);
  const hasBends = Boolean(edge.waypoints?.length);
  $('#ca-bend-editor').disabled = !hasBends;
  // Route and pattern editing remain available for non-elbow connectors.
  element.addEventListener('change', (event) => {
    if (event.target.id === 'ca-route')
      $('#ca-bend-editor').disabled = event.target.value !== 'elbow' || !liveConnector(id)?.waypoints?.length;
  });
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
      if (['left', 'right', 'up', 'down', 'set', 'remove', 'straighten'].includes(action)) {
        const points = next.waypoints || [];
        const selected = Number($('#ca-bend-index').value);
        const step = Number($('#ca-bend-step').value) || 10;
        if (action === 'straighten') {
          if (points.length && points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) {
            const start = M.connectorRoute({ ...next, waypoints: [] }, state.board.objects).start;
            const end = M.connectorRoute({ ...next, waypoints: [] }, state.board.objects).end;
            const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
            next.waypoints = points.map((point) => horizontal ? { x: point.x, y: Math.round(start.y) } : { x: Math.round(start.x), y: point.y });
            next.avoidObstacles = false;
          }
        } else if (Number.isInteger(selected) && selected >= 0 && points[selected]) {
          const point = points[selected];
          if (action === 'remove') points.splice(selected, 1);
          else if (action === 'set') {
            const x = Number($('#ca-bend-x').value);
            const y = Number($('#ca-bend-y').value);
            if ($('#ca-bend-x').value !== '' && $('#ca-bend-y').value !== '' && Number.isFinite(x) && Number.isFinite(y)) {
              points[selected] = { x: Math.round(x), y: Math.round(y) };
            }
          } else {
            const dx = action === 'right' ? step : action === 'left' ? -step : 0;
            const dy = action === 'down' ? step : action === 'up' ? -step : 0;
            points[selected] = { x: Math.round(point.x + dx), y: Math.round(point.y + dy) };
          }
          next.avoidObstacles = false;
        }
      }
      if (action === 'elbow-h' || action === 'elbow-v') {
        const automatic = M.connectorRoute({ ...next, waypoints: [] }, state.board.objects);
        if (automatic.start && automatic.end) {
          const p = action === 'elbow-h'
            ? { x: Math.round(automatic.end.x), y: Math.round(automatic.start.y) }
            : { x: Math.round(automatic.start.x), y: Math.round(automatic.end.y) };
          next.route = 'elbow';
          next.waypoints = [p];
          next.avoidObstacles = false;
        }
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
        : ['left', 'right', 'up', 'down', 'set', 'remove', 'straighten'].includes(action)
          ? 'Elbow bend adjusted'
        : action === 'elbow-h' || action === 'elbow-v'
          ? 'Elbow orientation updated; drag the blue bend for fine adjustment'
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
