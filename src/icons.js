export const icons = {
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
  media: 'Images & PDFs',
  link: 'Link card · L',
};
export const svgIcon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[k]}</svg>`;
