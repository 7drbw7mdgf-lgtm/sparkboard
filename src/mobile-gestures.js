import { endPointer } from './canvas.js';
import { state } from './state.js';
import { applyView } from './viewport.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Keep the same board point beneath the fingers as they pinch or move together. */
export function calculatePinchView(startView, startTouches, currentTouches, rect) {
  const before = midpoint(...startTouches);
  const after = midpoint(...currentTouches);
  const ratio = distance(...currentTouches) / Math.max(1, distance(...startTouches));
  const z = Math.max(0.1, Math.min(3, startView.z * ratio));
  const worldX = (before.x - rect.left - startView.x) / startView.z;
  const worldY = (before.y - rect.top - startView.y) / startView.z;
  return {
    x: after.x - rect.left - worldX * z,
    y: after.y - rect.top - worldY * z,
    z,
  };
}

/** Single-finger gestures remain owned by the canvas editor. Two fingers pan/zoom. */
export function setupMobileGestures() {
  const canvas = document.querySelector('#canvas');
  const pointers = new Map();
  let gesture = null;

  canvas.addEventListener(
    'pointerdown',
    (event) => {
      if (
        event.pointerType !== 'touch' ||
        event.target.closest('.pdf-viewer, [data-open]')
      )
        return;

      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        // End any pending one-finger drag before taking ownership of both touches.
        endPointer();
        gesture = {
          view: { ...state.view },
          touches: [...pointers.values()],
        };
      }
      if (gesture) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  canvas.addEventListener(
    'pointermove',
    (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (!gesture || pointers.size < 2) return;
      const next = calculatePinchView(
        gesture.view,
        gesture.touches,
        [...pointers.values()].slice(0, 2),
        canvas.getBoundingClientRect(),
      );
      Object.assign(state.view, next);
      applyView();
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );

  const release = (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (gesture) {
      if (pointers.size < 2) gesture = null;
      // A released pinch must not accidentally finish a canvas edit.
      event.stopImmediatePropagation();
    }
  };
  canvas.addEventListener('pointerup', release, true);
  canvas.addEventListener('pointercancel', release, true);
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
}
