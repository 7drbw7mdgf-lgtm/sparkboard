# Sparkboard

A simple, local-first visual whiteboard. Sketch ideas, organize sticky notes, connect shapes, and drop in images, PDFs, maps, and videos—all stored locally on your device with no accounts or cloud setup.

**[Download Sparkboard 1.3.1 for Mac (Apple Silicon · macOS 14+)](https://github.com/7drbw7mdgf-lgtm/sparkboard/releases/download/v1.3.1/Sparkboard-1.3.1-macOS-arm64.dmg)** · [Release notes](https://github.com/7drbw7mdgf-lgtm/sparkboard/releases/tag/v1.3.1) · [MIT License](LICENSE)

## Install or run

### macOS app

Download **[Sparkboard-1.3.1-macOS-arm64.dmg](https://github.com/7drbw7mdgf-lgtm/sparkboard/releases/download/v1.3.1/Sparkboard-1.3.1-macOS-arm64.dmg)**, open it, and drag **Sparkboard** to **Applications**. Everything needed to run the app is bundled inside.

### Run in your browser

Requires Node.js 24 or newer (no external API keys or frontend bundler required):

```sh
git clone https://github.com/7drbw7mdgf-lgtm/sparkboard.git
cd sparkboard
npm ci
npm run build
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

### Use Sparkboard on a phone

The same hosted editor at [sparkboard.co.uk](https://sparkboard.co.uk/) uses a mobile layout on narrow/touch screens. Swipe sideways through the bottom tool dock, tap a tool and then the canvas to add an item, use two fingers to pinch/zoom or move around the board, and use **Fit** to recenter. The board library, formatting, templates and export actions remain available from the top controls. Work is still saved locally in that browser; signing in does not yet sync boards between devices.

The source website is deployed from `main` when the Fasthosts GitHub Actions environment is configured. For deployment details see [DEPLOYMENT.md](DEPLOYMENT.md).

## Visual workspace modes

The workspace mode bar keeps four views on the **same board**, with the same saved objects:

- **Canvas:** Your existing freeform whiteboard and advanced shape editor, unchanged.
- **Mind map:** Add root topics or child/sibling branches, automatically arrange the hierarchy, and collapse or expand descendants. Select a topic and press **Tab** for a child or **Enter** for a sibling: a sibling is inserted right after the selected topic, on the same side of the central topic and in the same style. Branches on the left of the centre stay on the left when the map is arranged. Click the **−** / **+N** badge beside a topic (or **Collapse** in the toolbar) to fold its branches; collapsed topics show how many topics are hidden. Double-click a topic to edit its label.
- **Flowchart:** Create colour-coded **Start**, **Process**, **Decision**, **Input/output** and **End** nodes. Select an existing shape first to add a connected successor; click the **+** beside a selected step for another connected process. **Link nodes** starts source→destination linking (or connects two selected shapes). New links use elbow routing and directional arrows, and can be formatted or rebound with the existing diagram tools.
- **Outline:** Browse and edit mind-map topic labels in a structured sidebar. Expand/fold branches or select a topic on the canvas without duplicating objects.

Use **Convert** in Mind map mode to turn an existing selected shape and its outgoing connections into a hierarchy. The conversion is explicit: other whiteboard artwork stays freeform, and arranging a mind map does not move unrelated objects. All modes use ordinary Sparkboard JSON/board storage and work with the existing undo/redo and backup systems. On compact screens the mode strip becomes a **View** selector, and the long tool strip becomes a five-action **Pan / Select / Add / Link / Tools** dock. **Add** offers context-aware flowchart and mind-map actions; **Tools** holds shapes, draw, media, export and other less-used controls. Formatting opens in a compact bottom sheet. Pan remains the default on mobile; choose Select to edit an object. Two fingers still pan/zoom.

## Features

- **Notes, 18 shapes & vector reshaping:** Sticky notes, editable text, and a searchable 18-shape library. Press `A` or click **Reshape points** (`◇`) to drag, add, or remove vector anchor points on any shape or stroke just like Illustrator.
- **Line tool & smart connectors:** Draw standalone lines (`L`) or connect objects via `N / E / S / W` ports (`C`), with selectable **Straight**, **Curved**, and **Elbow** routing, **Solid / Dashed / Dotted** strokes, custom start/end arrowheads (`None`, `Open`, `Filled`, `Circle`, `Diamond`), and inline labels.
- **Unified Format panel & built-in updates:** Customize appearance, line styles, shape types, and alignment in the **Format** panel, with automatic background update checks and verified one-click updates from GitHub releases.
- **Smooth drawing & eraser:** Freehand strokes use quadratic Bezier smoothing, with a dedicated **Stroke Eraser (`E`)** tool.
- **PDFs, videos & maps:** Drop in images and local PDFs (rendered right on the board with page navigation), or use the **Embed** menu to add YouTube/Vimeo videos, Google Maps, and PDF links.
- **Floating workspace & smart frames:** Switch between open boards in the top tab bar, close tabs without deleting boards, and drag **Frames** to automatically move items inside them.
- **4-corner resize, rotation & smart guides:** Resize from any corner (`Shift` to lock aspect ratio), rotate directly on the canvas (`Shift` to snap 15°), and snap to orange smart-alignment guides.
- **Local storage & backups:** Boards autosave locally on your device. Export or import full editable JSON backups (including attachments), or export to PNG, SVG, and PDF.

## Shortcuts

| Action                     | Shortcut                        |
| -------------------------- | ------------------------------- |
| Select / Pan               | V / H                           |
| Pan temporarily            | Space + drag                    |
| Sticky / Text / Link       | N / T / K                       |
| Rectangle / Circle / Frame | R / O / F                       |
| Line / Connect / Draw      | L / C / P                       |
| Stroke eraser              | E                               |
| Reshape anchor points      | A                               |
| Multi-select               | Shift-click / drag empty canvas |
| Select all                 | Cmd/Ctrl + A                    |
| Edit                       | Enter or double-click           |
| Rename board tab           | Double-click tab or F2          |
| Copy / Paste               | Cmd/Ctrl + C / V                |
| Duplicate                  | Cmd/Ctrl + D                    |
| Group / Ungroup            | Cmd/Ctrl + G / Shift + G        |
| Undo / Redo                | Cmd/Ctrl + Z / Shift + Z        |
| Find                       | Cmd/Ctrl + F                    |
| Nudge                      | Arrow keys; Shift for 10 px     |
| Delete                     | Backspace / Delete              |
| Zoom                       | Pinch or Ctrl + scroll          |

## Development & packaging

```sh
npm run check         # Syntax-check all JavaScript modules
npm test              # Run automated tests
npm run format        # Format JavaScript, CSS, HTML and Markdown
npm run build:mac     # Build build/macos/Sparkboard.app (Apple Silicon, macOS 14+)
```

## License

Website publishing: [DEPLOYMENT.md](DEPLOYMENT.md). Pushes to `main` can deploy automatically to Fasthosts once its GitHub Actions environment secret is configured.

Optional Google, Facebook, Apple and Microsoft account setup: [AUTH-SETUP.md](AUTH-SETUP.md). Accounts identify users; boards remain stored on this browser until cloud sync is implemented.

[MIT](LICENSE), copyright 2026 Sparkboard contributors. The macOS bundle includes the Node.js runtime license, and the local PDF viewer uses bundled Mozilla PDF.js (Apache-2.0) in `assets/pdfjs/`.

## Editing and recovery

Each open board keeps its own Undo/Redo history and zoom/pan view for the current session. Closing a tab releases its session history. Copying a frame includes its nested contents and internal connectors; exports preserve the canvas’s stacking order.

New lines show two curve handles automatically when selected. Drag either handle to bend the line; endpoint handles move the ends. Curves are preserved in backups, copied lines, Undo/Redo, and exports.

Connectors snap to shape edges as well as the four visible ports. Use **Connector (C)** or drag a shape's port to another shape; the highlighted target and magnetic marker show the binding. Edge anchors follow notes through movement, resizing and rotation. Select a connector and drag either blue endpoint to reattach it to a different shape. Undo/Redo and editable backups preserve these bindings.

Connectors avoid intervening objects by default. Straight and elbow routes use clear segments; curved routes round their detours. **Format → Smart routing → Direct route** turns avoidance off for a selected connector. Routing uses shape outlines for attachment and padded rotated bounds for clearance, with a bounded search on dense boards. Overlapping or completely blocked anchors may need the shapes moved apart. Exports and Fit include the routed path and its label.

Concurrent windows use revision-protected saves. If a board has changed elsewhere, Sparkboard keeps the local edits and offers to save a separate board or download an editable backup. Conflicting recovery drafts become separate boards. Storage version 3 closes older editor connections before enabling this protection; refresh any older open Sparkboard windows. Older releases cannot open an upgraded workspace until updated.
