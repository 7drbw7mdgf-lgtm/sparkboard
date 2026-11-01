import { $, uid } from './core.js';
import { state } from './state.js';
import { commit } from './history.js';
import { centerPoint } from './viewport.js';
import { setTool } from './tools.js';
import { toast } from './notifications.js';
import { createFlowStep, connectFlowNodes, isFlowNode } from './flowchart-model.js';

function selectedFlowSource() {
  if (state.selected.size !== 1) return null;
  return state.board?.objects.find((item) => item.id === [...state.selected][0] && isFlowNode(item) && !item.locked);
}

export function addFlowStep(role = 'process', fromId) {
  if (!state.board) return;
  const sourceId = fromId === undefined ? selectedFlowSource()?.id : fromId;
  const center = centerPoint();
  commit(() => {
    const next = createFlowStep(state.board.objects, {
      role, fromId: sourceId || null, center, makeId: uid,
    });
    state.selected = new Set([next.id]);
  });
  // New shapes are immediately selectable and editable, including on phones.
  setTool('select');
  toast(sourceId ? 'Linked step added · choose another to continue' : 'Flowchart step added');
}

export function startFlowLink() {
  if (!state.board) return;
  const selected = [...state.selected]
    .map((id) => state.board.objects.find((item) => item.id === id && isFlowNode(item) && !item.locked))
    .filter(Boolean);
  if (selected.length === 2 && state.selected.size === 2) {
    commit(() => {
      const edge = connectFlowNodes(state.board.objects, selected[0].id, selected[1].id, uid);
      state.selected = new Set([edge.id]);
    });
    toast('Nodes linked · select the line to change route or label');
    return;
  }
  const source = selected.length === 1 && state.selected.size === 1 ? selected[0] : null;
  setTool('connector');
  if (source) state.connectorStart = source.id;
  toast(source ? 'Tap the destination node · Select cancels linking' : 'Tap a start node, then a destination');
}

export function syncFlowchartDecorations() {
  const canvas = $('#canvas');
  if (!canvas) return;
  const mode = state.board?.diagramView || (state.board?.kind === 'mindmap' ? 'mindmap' : 'canvas');
  canvas.dataset.diagramView = mode;
  const host = $('#objects');
  if (!host) return;
  host.querySelectorAll('.flow-quick-add').forEach((button) => button.remove());
  const nodes = new Map((state.board?.objects || []).map((item) => [item.id, item]));
  host.querySelectorAll('.object[data-id]').forEach((el) => {
    const item = nodes.get(el.dataset.id);
    el.classList.toggle('flow-node', !!item?.flowRole);
    if (item?.flowRole) el.dataset.flowRole = item.flowRole;
    else delete el.dataset.flowRole;
  });
  if (mode !== 'flowchart' || state.selected.size !== 1 || state.reshapeId || state.editing) return;
  const source = selectedFlowSource();
  if (!source) return;
  const selectedElement = [...host.querySelectorAll('.object[data-id]')].find((el) => el.dataset.id === source.id);
  if (!selectedElement) return;
  const quick = document.createElement('button');
  quick.type = 'button';
  quick.className = 'flow-quick-add';
  quick.dataset.flowQuick = source.id;
  quick.title = 'Add a connected process step';
  quick.setAttribute('aria-label', 'Add connected step');
  quick.textContent = '+';
  selectedElement.append(quick);
}

export function setupFlowchart() {
  const style = document.createElement('style');
  style.textContent = `
#canvas[data-diagram-view="flowchart"]{background-color:#f8fafc;background-image:radial-gradient(#cbd5e1 0.8px,transparent 0.8px)}
#canvas[data-diagram-view="flowchart"] .object.flow-node{--flow-shadow:0 11px 24px #344a5c16;filter:drop-shadow(var(--flow-shadow))}
#canvas[data-diagram-view="flowchart"] .object.flow-node .object-text{font-family:Manrope,sans-serif;line-height:1.28;letter-spacing:-.18px;overflow-wrap:anywhere}
#canvas[data-diagram-view="flowchart"] .object.flow-node[data-flow-role="decision"] .object-text{max-width:68%;font-size:.9em}
#canvas[data-diagram-view="flowchart"] .object.flow-node[data-flow-role="start"] .object-text,
#canvas[data-diagram-view="flowchart"] .object.flow-node[data-flow-role="end"] .object-text{font-weight:750}
#canvas[data-diagram-view="flowchart"] .object.flow-node.selected{filter:drop-shadow(0 8px 19px #396aa339)}
#canvas[data-diagram-view="flowchart"] .object.flow-node .port{width:13px;height:13px;border:2px solid #5f83b2;box-shadow:0 1px 4px #172b4540}
#canvas[data-diagram-view="flowchart"] .object.flow-node.selected .port{opacity:1}
#canvas[data-diagram-view="flowchart"] .flow-quick-add{position:absolute;left:calc(100% + 30px);top:50%;translate:-50% -50%;height:32px;width:32px;display:grid;place-items:center;padding:0;background:#345f99;color:#fff;border:3px solid #fff;border-radius:50%;font:800 20px/1 Manrope,sans-serif;box-shadow:0 4px 14px #213d663b;z-index:15;cursor:pointer;touch-action:manipulation}
#canvas[data-diagram-view="flowchart"] .flow-quick-add:hover{background:#214a7d;scale:1.1}
#canvas[data-diagram-view="flowchart"] .flow-quick-add:focus-visible{outline:3px solid #ed7959}
#mindmap-toolbar[data-view="flowchart"]{border-color:#dce5f2;background:#fff;box-shadow:0 9px 28px #354a6d17}
#mindmap-toolbar[data-view="flowchart"] .mmw-modes{background:#eef2f9}
#mindmap-toolbar[data-view="flowchart"] button[aria-pressed="true"]{color:#2c578d}
#mindmap-toolbar[data-view="flowchart"] .mmw-actions button{background:#eef3fb;color:#2f5588}
#mindmap-toolbar[data-view="flowchart"] .mmw-actions button:hover{background:#dfeafb}
#canvas[data-diagram-view="flowchart"] #connections .connector-hit{stroke-width:20}
@media(max-width:650px),(max-height:500px) and (pointer:coarse){#canvas[data-diagram-view="flowchart"] .flow-quick-add{height:42px;width:42px;font-size:23px;left:calc(100% + 29px)}}
`;
  document.head.append(style);
  document.addEventListener('sparkboard:render', syncFlowchartDecorations);
  document.addEventListener('sparkboard:mode', syncFlowchartDecorations);
  // Selection can change without a full repaint.
  document.addEventListener('sparkboard:selection', syncFlowchartDecorations);
  const host = $('#objects');
  // Capture phase stops the canvas drag handler from interpreting a quick-add button as a shape drag.
  for (const type of ['pointerdown', 'mousedown', 'dblclick']) {
    host.addEventListener(type, (event) => {
      if (!event.target.closest?.('[data-flow-quick]')) return;
      event.stopPropagation();
      event.preventDefault();
    }, true);
  }
  host.addEventListener('click', (event) => {
    const control = event.target.closest?.('[data-flow-quick]');
    if (!control) return;
    event.preventDefault();
    event.stopPropagation();
    addFlowStep('process', control.dataset.flowQuick);
  });
  syncFlowchartDecorations();
}
