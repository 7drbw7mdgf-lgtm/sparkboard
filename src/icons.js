export const icons = {
  close: '<path d="m7 7 10 10M17 7 7 17"/>',
  undo: '<path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 6 6v3"/>',
  redo: '<path d="m15 5 5 5-5 5m5-5H10a6 6 0 0 0-6 6v3"/>',
  grid: '<circle cx="5" cy="5" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="19" cy="5" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="19" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="19" cy="19" r="1"/>',
  snap: '<path d="M8 3v18M16 3v18M3 8h18M3 16h18"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 3m0 3h.01"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  scenes: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14m5-10 4 3-4 3Z"/>',
  templates:
    '<rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  export: '<path d="M12 16V3m-5 5 5-5 5 5M4 14v7h16v-7"/>',
  embed: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m10 8 6 4-6 4Z"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Zm6-3v15m6-12v15"/>',
  pdf: '<path d="M5 3h9l5 5v13H5Zm9 0v6h5M8 13h8m-8 4h6"/>',

  select: '<path d="m5 3 14 10-7 1-4 7Z"/>',
  hand: '<path d="M8 11V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-3l2 2"/>',
  sticky: '<path d="M4 4h16v11l-5 5H4Z M15 20v-5h5"/>',
  text: '<path d="M4 5h16M12 5v15M8 20h8"/>',
  shape: '<rect x="3" y="5" width="18" height="14" rx="2"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  triangle: '<path d="m12 3 10 18H2Z"/>',
  diamond: '<path d="m12 2 10 10-10 10L2 12Z"/>',
  hexagon: '<path d="m7 3 10 0 5 9-5 9H7l-5-9Z"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>',
  arrow: '<path d="M2 8h12V3l8 9-8 9v-5H2Z"/>',
  bubble: '<path d="M4 3h16a2 2 0 0 1 2 2v12H10l-6 5v-5H2V5a2 2 0 0 1 2-2Z"/>',
  frame: '<path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5"/>',
  connector: '<path d="M4 19 20 4m-7 0h7v7"/>',
  pen: '<path d="m5 16-1 5 5-1L21 8l-4-4ZM14 7l4 4"/>',
  eraser:
    '<path d="m7 21-4.3-4.3a2 2 0 0 1 0-2.8L14.6 2a2 2 0 0 1 2.8 0l4.3 4.3a2 2 0 0 1 0 2.8L11 21H7Zm14 0h-9M9 9l6 6"/>',
  reshape:
    '<rect x="3" y="3" width="4" height="4" rx="1"/><rect x="17" y="3" width="4" height="4" rx="1"/><rect x="17" y="17" width="4" height="4" rx="1"/><rect x="3" y="17" width="4" height="4" rx="1"/><path d="M7 5h10M19 7v10M17 19H7M5 17V7"/>',
  media:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m3 18 6-6 4 4 3-3 5 5"/>',
  link: '<path d="m10 14 4-4M9 16l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 5 0m0 0 2-2a4 4 0 0 1 5 5l-5 5a4 4 0 0 1-5 0"/>',
};
export const shapeNames = {
  shape: 'Rectangle',
  circle: 'Circle',
  triangle: 'Triangle',
  diamond: 'Diamond',
  hexagon: 'Hexagon',
  star: 'Star',
  arrow: 'Arrow',
  bubble: 'Speech bubble',
  frame: 'Frame',
};
export const labels = {
  select: 'Select · V',
  hand: 'Pan · H',
  sticky: 'Sticky note · N',
  text: 'Text · T',
  connector: 'Connector · C',
  pen: 'Draw · P',
  eraser: 'Stroke eraser · E',
  media: 'Images & PDFs',
  link: 'Link card · L',
  embed: 'Embed PDF, map or video',
};
export const svgIcon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[k]}</svg>`;
