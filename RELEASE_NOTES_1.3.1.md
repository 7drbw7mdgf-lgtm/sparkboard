# Sparkboard v1.3.1 — Release notes

## Fixes & improvements

- **Fix critical `selectVisual()` querySelector regression**: Restored `$$('#objects .object').forEach(...)` in `src/rendering.js` so `selectVisual()` never throws `TypeError: $('#objects .object').forEach is not a function` during rendering, selection, panning, or drawing.
- **Fix panning & keyboard focus handling**:
  - Clicking the canvas automatically blurs any focused Format panel control so `Space` pan, `Backspace`/`Delete`, `⌘Z`, and tool shortcuts always respond.
  - Non-text inputs (`range`, `color`, `select`, `button`) no longer trap keyboard shortcuts in `activeEditor()`.
  - Normalized `wheel` `deltaMode` (pixel, line, page) and added `Shift + wheel` horizontal panning and `is-panning` pointer/cursor lock.
- **Fix selection, frames & marquee**:
  - Clicking or dragging inside the open interior of an unselected frame now deselects or starts a marquee selection box instead of grabbing the entire frame and its children (clicking the frame header or border still selects and moves the frame).
  - Marquee selection now selects items by bounding-box intersection (and frames/connectors when enclosed).
  - Clicking an item inside a multi-selection without dragging reduces the selection to the clicked item.
- **Fix freehand drawing, lines & connectors**:
  - Elevated `#connections` (`z-index: 2`) above canvas objects so freehand pen strokes, lines, and connectors remain visible and selectable when drawn over sticky notes, shapes, or frames, with a clear `.selection-halo` highlight when selected.
  - Added drag-to-size shape creation, direct drag-to-connect in the Connector tool, and a dedicated freehand stroke Format inspector.
  - Added fast in-place DOM updates (`renderFast()`) during drag, resize, rotate, and vertex reshape so embeds, PDFs, and inspector controls are not recreated on every frame.
- **Native macOS embeds & performance**:
  - Allow embedded video/map subframe navigation inside the macOS `WKWebView`.
  - Use structured board snapshots in `src/history.js` to avoid re-encoding media data URLs on every undo snapshot.

## Compatibility

- macOS 14+ on Apple Silicon for the desktop application (`Sparkboard-1.3.1-macOS-arm64.dmg`); Node.js 24+ for the local browser version.
- Existing board storage format remains unchanged. In-app updates from v1.3.0 are available via the signed `sparkboard-update.json` release asset.
