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

The same hosted editor at [sparkboard.co.uk](https://sparkboard.co.uk/) uses a mobile layout on narrow/touch screens. Swipe sideways through the bottom tool dock, tap a tool and then the canvas to add an item, use two fingers to pinch/zoom or move around the board, twist two fingers on a shape to turn it, and use **Fit** to recenter. The board library, formatting, templates and export actions remain available from the top controls. Work is still saved locally in that browser unless optional account board sync has been configured; it does not cover Benchline tasks.

The source website is deployed from `main` when the Fasthosts GitHub Actions environment is configured. For deployment details see [DEPLOYMENT.md](DEPLOYMENT.md).

## Visual workspace modes

The workspace mode bar keeps four views on the **same board**, with the same saved objects:

- **Canvas:** Your existing freeform whiteboard and advanced shape editor, unchanged.
- **Mind map:** Add a root from the mode bar, then hover or select a topic. A **+** beside it adds a daughter topic; a **+** under it adds a sibling. Tab and Enter do the same. Branches on the left of the centre stay on the left when the map is arranged. A **−** / **+N** badge above a topic folds its branches; collapsed topics show how many topics are hidden. Topic controls also expose a **Style** master for colour, connector route, arrows, thickness and stroke pattern. New child topics inherit the nearest ancestor's master style. Double-click a topic to edit its label.
- **Flowchart:** Create colour-coded **Start**, **Process**, **Decision**, **Input/output** and **End** nodes. Hover or select a shape and drag one of its nodes onto another shape to connect them, or into empty space to drop a linked step. New links use elbow routing and directional arrows. Select a connector and double-click it (or use **Route** on mobile) for advanced controls: source/target ports, route, arrows, colour, thickness, routing mode and labels. You can add, drag and clear manual bend points; Alt-click a blue waypoint handle to remove it. Manual waypoints intentionally override automatic obstacle routing until reset.
- **Outline:** Browse and edit mind-map topic labels in a structured sidebar. Expand/fold branches or select a topic on the canvas without duplicating objects. Parent topics remain visible when a branch is folded; leaf details are concealed.

Use **Convert** in Mind map mode to turn an existing selected shape and its outgoing connections into a hierarchy. The conversion is explicit: other whiteboard artwork stays freeform, and arranging a mind map does not move unrelated objects. All modes use ordinary Sparkboard JSON/board storage and work with the existing undo/redo and backup systems. On a wide screen the mode bar sits in the same top band as the board tabs. On compact screens the canvas fills the entire viewport, and **Canvas / Map / Flow / Outline** sit in the bottom dock with **Add / Tools**. **One finger selects and moves objects**; use **two fingers to pan or pinch-to-zoom**, or twist them to turn the shape under your fingers. Tap a shape to reveal its connection nodes, then drag one onto another shape. Deleting a topic removes that branch and every wire attached to it. Tap **Add** to insert a flowchart or mind-map step; in **Tools**, choosing a sticky, text item or a shape creates it directly in view. When drawing or erasing, tap the floating **Done** button to return to selection. Undo, redo and fit are available under **Tools**. Formatting remains in a compact bottom sheet.

## Benchline's focused hosted interface

Benchline at **/sai/** now opens to a minimal overview: outstanding tasks, deadlines, the next meeting and project dates. Desktop has four primary destinations (Overview, Tasks, Timeline and Calendar); Kanban lives under **More views**. Mobile uses the same four primary tabs and puts Kanban, settings and help under the overflow menu. Search and project tools (backup, project dates, undo/redo and sample import) remain available in the header. Full task editing and advanced Gantt functionality remain in their respective views. This is a presentation-only simplification: it does not migrate or delete saved project data. Benchline project data is still local to the browser, not part of Sparkboard account board sync.

In the hosted Benchline Gantt timeline, the **Time scale** dropdown offers **Days, Weeks, Months, Quarters, and Years**, with matching two-row date headings and a remembered selection. **Zoom −/+**, **Today**, and fractional **Fit** work independently of the scale. Drag a task bar to move it or its left/right grips to resize start/end dates on mouse or touch; keyboard **←/→** moves by a day, **Shift+←/→** adjusts the end, and **Alt+←/→** adjusts the start. Tap/select a task and choose **Edit task** for precise date controls; date changes are only committed at pointer release.

Benchline's **Kanban board** now uses cleaner task cards without assignee avatars, with an expandable **Filters** menu and mobile-friendly swipeable status columns. Use the visible arrows on each card to move it between statuses when dragging is awkward on a phone. The **Gantt chart** uses a narrower task list on desktop and opens as a full-width timeline on mobile; **Show tasks / Hide tasks**, **Fit** and **Today** provide simple navigation without losing date editing or dependencies. Task creation, task details, task lists and Gantt rows no longer expose assignee selection or avatar clutter in the hosted planner. Existing assignee fields are retained in saved data for compatibility, not deleted. These hosted changes do not automatically update the standalone Sai repository.

## Task handoff to Sai / Benchline

Use **✓ Task** in the desktop board mode bar, or **Add → New task** on mobile, to create a task card on the current board (under the selected mind-map topic where applicable). Enter a title, optional due date, priority and notes. The task is saved with the board and added to Benchline at **/sai/** in this browser: it shows on the home list and in the task list, including when Benchline is already open. On a phone, Benchline keeps a labelled view bar under the title, in the manner of a calendar app, rather than a row of buttons along the bottom. Sparkboard in the header returns to the open board, not the marketing page. Benchline can also be added to the home screen from that address. Stable task IDs prevent duplicate imports. The bridge is **one-way on creation**, not a shared task-editing system. Benchline project data and Sparkboard boards are saved separately; Sparkboard account board sync **does not** sync Benchline projects or the handoff queue across devices.

## Features

- **Notes, 18 shapes & vector reshaping:** Sticky notes, editable text, and a searchable 18-shape library. Press `A` or click **Reshape points** (`◇`) to drag, add, or remove vector anchor points on any shape or stroke just like Illustrator.
- **Line tool & smart connectors:** Draw standalone lines (`L`). Hover or select a shape and drag a port node to another shape. Routes can be **Straight**, **Curved**, or **Elbow**, with **Solid / Dashed / Dotted** strokes, custom start/end arrowheads (`None`, `Open`, `Filled`, `Circle`, `Diamond`), and inline labels.
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
| Line / Draw                | L / P                           |
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

Connectors snap to shape edges as well as the four port nodes that appear when you hover or select a shape. Drag a port to another shape; the highlighted target and magnetic marker show the binding. Edge anchors follow notes through movement, resizing and rotation. Select a connector and drag either blue endpoint to reattach it to a different shape. Undo/Redo and editable backups preserve these bindings.

Connectors avoid intervening objects by default. Straight and elbow routes use clear segments; curved routes round their detours. **Format → Smart routing → Direct route** turns avoidance off for a selected connector. Routing uses shape outlines for attachment and padded rotated bounds for clearance, with a bounded search on dense boards. Overlapping or completely blocked anchors may need the shapes moved apart. Exports and Fit include the routed path and its label.

Concurrent windows use revision-protected saves. If a board has changed elsewhere, Sparkboard keeps the local edits and offers to save a separate board or download an editable backup. Conflicting recovery drafts become separate boards. Storage version 3 closes older editor connections before enabling this protection; refresh any older open Sparkboard windows. Older releases cannot open an upgraded workspace until updated.
