# Sparkboard

A simple, local-first visual whiteboard. Sketch ideas, organize sticky notes, connect shapes, and drop in images, PDFs, maps, and videos—all stored locally on your device with no accounts or cloud setup.

**[Download Sparkboard 1.2.0 for Mac (Apple Silicon · macOS 14+)](https://github.com/7drbw7mdgf-lgtm/sparkboard/releases/download/v1.2.0/Sparkboard-1.2.0-macOS-arm64.dmg)** · [Release notes](https://github.com/7drbw7mdgf-lgtm/sparkboard/releases/tag/v1.2.0) · [MIT License](LICENSE)

## Install or run

### macOS app

Download **[Sparkboard-1.2.0-macOS-arm64.dmg](https://github.com/7drbw7mdgf-lgtm/sparkboard/releases/download/v1.2.0/Sparkboard-1.2.0-macOS-arm64.dmg)**, open it, and drag **Sparkboard** to **Applications**. Everything needed to run the app is bundled inside.

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

## Features

- **Notes, shapes & vector reshaping:** Sticky notes, editable text, and a searchable 9-shape library. Press `A` or click **Reshape points** (`◇`) to drag, add, or remove vector anchor points on any shape or stroke just like Illustrator.
- **Smart connectors & ports:** Drag from any object's `N / E / S / W` connection ports, switch between **Straight**, **Curved**, and **Elbow** routing, and add inline connector labels.
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
| Sticky / Text / Link       | N / T / L                       |
| Rectangle / Circle / Frame | R / O / F                       |
| Connector / Draw / Eraser  | C / P / E                       |
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

[MIT](LICENSE), copyright 2026 Sparkboard contributors. The macOS bundle includes the Node.js runtime license, and the local PDF viewer uses bundled Mozilla PDF.js (Apache-2.0) in `assets/pdfjs/`.
