/** Mobile dock menus. Add creates objects. Tools operates on the board. They do not share actions. */
const tools = [
  { label: 'Draw', action: 'tool', value: 'pen' },
  { label: 'Line', action: 'tool', value: 'line' },
  { label: 'Erase', action: 'tool', value: 'eraser' },
  { label: 'Find', action: 'header', value: 'search-board' },
  { label: 'Fit to board', action: 'header', value: 'fit' },
  { label: 'Undo', action: 'header', value: 'undo' },
  { label: 'Redo', action: 'header', value: 'redo' },
  { label: 'Templates', action: 'header', value: 'templates' },
  { label: 'Export', action: 'header', value: 'export' },
  { label: 'Scenes', action: 'header', value: 'scenes' },
  { label: 'Benchline', action: 'link', value: '/sai/' },
];

const menus = {
  canvas: {
    hint: 'Freeform board. Draw here, or use Add for notes and shapes.',
    addNote: 'Places an object in the centre of the view.',
    context: [
      { label: 'Draw', action: 'tool', value: 'pen' },
      { label: 'Line', action: 'tool', value: 'line' },
      { label: 'Erase', action: 'tool', value: 'eraser' },
    ],
    add: [
      { label: 'Sticky note', action: 'tool', value: 'sticky' },
      { label: 'Text', action: 'tool', value: 'text' },
      { label: 'Shape', action: 'picker', value: 'shapes' },
      { label: 'Photo or PDF', action: 'picker', value: 'media' },
      { label: 'Embed', action: 'picker', value: 'embed' },
      { label: 'Web link', action: 'picker', value: 'link' },
      { label: 'Swimlane', action: 'swimlane', value: 'swimlane' },
      { label: 'Task', action: 'task', value: '' },
    ],
  },
  mindmap: {
    hint: 'Mind map. Add a root, then branch from a selected topic.',
    addNote: 'Extra objects. Root, arrange, and convert are on the bar.',
    context: [
      { label: 'Root', action: 'map', value: 'root' },
      { label: 'Arrange', action: 'map', value: 'layout' },
      { label: 'Convert', action: 'map', value: 'adopt' },
    ],
    add: [
      { label: 'Shape', action: 'picker', value: 'shapes' },
      { label: 'Swimlane', action: 'swimlane', value: 'swimlane' },
      { label: 'Branch styles', action: 'map-style', value: '' },
      { label: 'Task', action: 'task', value: '' },
    ],
  },
  flowchart: {
    hint: 'Flowchart. A new step links to the selected step.',
    addNote: 'Steps are on the bar. These add other objects.',
    context: [
      { label: 'Start', action: 'flow', value: 'start' },
      { label: 'Process', action: 'flow', value: 'process' },
      { label: 'Decision', action: 'flow', value: 'decision' },
      { label: 'Data', action: 'flow', value: 'data' },
      { label: 'End', action: 'flow', value: 'end' },
    ],
    add: [
      { label: 'Shape', action: 'picker', value: 'shapes' },
      { label: 'Sticky note', action: 'tool', value: 'sticky' },
      { label: 'Swimlane', action: 'swimlane', value: 'swimlane' },
      { label: 'Task', action: 'task', value: '' },
    ],
  },
  outline: {
    hint: 'Outline. Edit topics in the list. Close the list to return to the map.',
    addNote: 'Adds a topic without leaving the list.',
    context: [],
    add: [
      { label: 'Root topic', action: 'map', value: 'root' },
      { label: 'Arrange topics', action: 'map', value: 'layout' },
      { label: 'Task', action: 'task', value: '' },
    ],
  },
};

export function mobileWorkspaceMenus(mode = 'canvas') {
  const menu = menus[mode] || menus.canvas;
  return {
    hint: menu.hint,
    addNote: menu.addNote,
    toolsNote: 'Draw, find, and export. New objects stay under Add.',
    context: menu.context,
    add: menu.add,
    tools,
  };
}
