/** Session state only. Persistent data belongs to BoardRepository. */
export const state = {
  boards: [], // Lightweight library summaries; media is loaded for the active board only.
  board: null,
  tool: 'select',
  selected: new Set(),
  view: { x: 0, y: 0, z: 1 },
  drag: null,
  space: false,
  editing: null,
  reshapeId: null,
  reshapeMode: 'points',
  selectedVertex: null,
  guides: [],
  connectorDraft: null,
  history: [],
  future: [],
  connectorStart: null,
  inspectorOpen: true,
  scenePanelOpen: false,
  toastTimer: null,
  clipboard: [],
  ready: false,
};
