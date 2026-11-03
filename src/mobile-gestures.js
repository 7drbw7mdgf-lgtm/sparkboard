import { endPointer } from './canvas.js';
import { snapshot } from './history.js';
import { save } from './boards.js';
import { render, renderFast, selectVisual } from './rendering.js';
import { state } from './state.js';
import { applyView } from './viewport.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const NOT_TURNABLE = new Set(['connector', 'line', 'path']);

export function touchAngle(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Signed degrees from the starting finger angle, wrapped to [-180, 180]. */
export function twistDegrees(startTouches, currentTouches) {
  let delta = ((touchAngle(...currentTouches) - touchAngle(...startTouches)) * 180) / Math.PI;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

export function rotationAfterTwist(startRotation, deltaDegrees) {
  let deg = Math.round(((Number(startRotation) || 0) + deltaDegrees) * 10) / 10;
  while (deg > 180) deg -= 360;
  while (deg < -180) deg += 360;
  return deg;
}

export function canTurn(object) {
  return Boolean(object) && !object.locked && !NOT_TURNABLE.has(object.type);
}

export function objectFromTarget(target, objects) {
  const id = target?.closest?.('[data-id]')?.dataset.id;
  return objects?.find((item) => item.id === id) || null;
}

/** Rotate only when both fingers are on the same editable object.
 * A finger on empty canvas must never rotate the previously selected shape.
 */
export function twistTarget(targets, objects) {
  const [first, second] = targets.map((target) => objectFromTarget(target, objects));
  return first && second && first.id === second.id && canTurn(first) ? first : null;
}

/**
 * A twist on a turnable object rotates it. A pinch or a two-finger slide still
 * pans and zooms. The first clear motion wins so a zoom does not spin a shape.
 */
export function classifyTwoFingerGesture({
  mode,
  targetId,
  deltaDegrees,
  startDistance,
  currentDistance,
  panDistance,
}) {
  if (mode) return mode;
  const angle = Math.abs(deltaDegrees);
  const scaleDelta = Math.abs(currentDistance / Math.max(1, startDistance) - 1);
  if (targetId && angle >= 8 && scaleDelta <= 0.12) return 'twist';
  if (scaleDelta >= 0.08 || panDistance >= 18) return 'navigate';
  if (!targetId && (scaleDelta >= 0.05 || panDistance >= 6)) return 'navigate';
  return null;
}

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

/** Single-finger gestures remain owned by the canvas editor. Two fingers navigate, or twist a shape. */
export function setupMobileGestures() {
  const canvas = document.querySelector('#canvas');
  const pointers = new Map();
  let gesture = null;

  const currentTouches = () => [...pointers.values()].slice(0, 2).map(({ x, y }) => ({ x, y }));

  canvas.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType !== 'touch' || event.target.closest('.pdf-viewer, [data-open]')) return;

      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, target: event.target });
      if (pointers.size === 2 && !state.editing) {
        // End any pending one-finger drag before taking ownership of both touches.
        endPointer();
        const active = [...pointers.values()];
        const target = twistTarget(
          active.map((pointer) => pointer.target),
          state.board?.objects,
        );
        gesture = {
          view: { ...state.view },
          touches: currentTouches(),
          targetId: target?.id || null,
          startRotation: target?.rotation || 0,
          mode: null,
          rotated: false,
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
      const pointer = pointers.get(event.pointerId);
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!gesture || pointers.size < 2) return;
      const touches = currentTouches();
      const delta = twistDegrees(gesture.touches, touches);
      const mode = classifyTwoFingerGesture({
        mode: gesture.mode,
        targetId: gesture.targetId,
        deltaDegrees: delta,
        startDistance: distance(...gesture.touches),
        currentDistance: distance(...touches),
        panDistance: distance(midpoint(...gesture.touches), midpoint(...touches)),
      });
      gesture.mode = mode;
      if (mode === 'twist') {
        const node = state.board?.objects.find((item) => item.id === gesture.targetId);
        if (node && canTurn(node)) {
          if (!gesture.rotated) {
            snapshot();
            gesture.rotated = true;
            if (!state.selected.has(node.id) || state.selected.size !== 1) {
              state.selected = new Set([node.id]);
              selectVisual();
            }
          }
          Object.assign(state.view, gesture.view);
          node.rotation = rotationAfterTwist(gesture.startRotation, delta);
          renderFast();
          applyView();
        }
      } else if (mode === 'navigate' || !gesture.targetId) {
        Object.assign(
          state.view,
          calculatePinchView(
            gesture.view,
            gesture.touches,
            touches,
            canvas.getBoundingClientRect(),
          ),
        );
        applyView();
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );

  const release = (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (gesture) {
      if (pointers.size < 2) {
        if (gesture.rotated) {
          render();
          save();
        }
        gesture = null;
      }
      // A released pinch must not accidentally finish a canvas edit.
      event.stopImmediatePropagation();
    }
  };
  canvas.addEventListener('pointerup', release, true);
  canvas.addEventListener('pointercancel', release, true);
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
}
