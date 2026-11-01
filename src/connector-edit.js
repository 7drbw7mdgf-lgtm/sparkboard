import { $, esc, M } from './core.js';
import { state } from './state.js';
import { commit } from './history.js';
import { modal } from './dialogs.js';
import { toast } from './notifications.js';

const option = (values, active) =>
  values
    .map(
      ([value, label]) =>
        `<option value="${value}"${String(active) === value ? ' selected' : ''}>${label}</option>`,
    )
    .join('');
const capOptions = ['none', 'arrow', 'filled', 'circle', 'diamond'].map((x) => [x, x]);
const portOptions = [
  ['', 'Automatic'],
  ['n', 'Top'],
  ['e', 'Right'],
  ['s', 'Bottom'],
  ['w', 'Left'],
];

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
    <p>Choose the path and endpoints, then drag blue waypoint handles directly on the canvas.</p>
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
      <label>Source port<select id="ca-from">${option(portOptions, edge.fromPort || '')}</select></label>
      <label>Target port<select id="ca-to">${option(portOptions, edge.toPort || '')}</select></label>
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
          ['auto', 'Avoid shapes'],
          ['direct', 'Direct / manual'],
        ],
        edge.avoidObstacles === false ? 'direct' : 'auto',
      )}</select></label>
    </div>
    <button type="submit" class="ca-primary">Apply connector style</button>
    <div class="ca-buttons"><button type="button" data-ca-tool="waypoint">＋ Add bend point</button>
    <button type="button" data-ca-tool="clear">Reset bends</button>
    <button type="button" data-ca-tool="reverse">⇄ Reverse direction</button></div>
    <small>Drag the blue dots to shape the path. Alt-click a dot to remove it. The connected ends still follow their nodes.</small>
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
      next.avoidObstacles = $('#ca-auto').value === 'auto';
      for (const [field, selector] of [
        ['fromPort', '#ca-from'],
        ['toPort', '#ca-to'],
      ]) {
        const value = $(selector).value;
        if (value) next[field] = value;
        else delete next[field];
        delete next[field.replace('Port', 'Anchor')];
      }
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
      }
      if (action === 'clear') delete next.waypoints;
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
          : 'Connector reversed',
    );
  });
}

export function setupConnectorEdit() {
  document.addEventListener('sparkboard:connector-edit', (event) =>
    openConnectorControls(event.detail?.id),
  );
}
