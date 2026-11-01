/** Share one breakpoint across mobile canvas, inspector and gesture guards. */
export const COMPACT_EDITOR_QUERY = '(max-width: 650px), (max-height: 500px) and (pointer: coarse)';

export function isCompactEditor(target = globalThis) {
  return typeof target.matchMedia === 'function' && target.matchMedia(COMPACT_EDITOR_QUERY).matches;
}

/** Selecting a board item must never summon the format sheet over a touch drag. */
export function inspectorOpenAfterSelection({ changed, hasSelection, compact, open }) {
  return changed && hasSelection ? !compact : open;
}

/** Mobile Safari synthesizes a mouse dblclick after quick touch taps. */
export function allowDoubleClickEdit({ pointerType, firesTouchEvents, lastTouchAt, now }) {
  if (pointerType === 'touch' || firesTouchEvents) return false;
  return !lastTouchAt || now - lastTouchAt > 900;
}
