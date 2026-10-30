# Sparkboard

A simple, local-first visual whiteboard inspired by Lucidspark and Apple Freeform. Sketch ideas, organize sticky notes, connect shapes, and drop in images, PDFs, maps, and videos—all stored locally on your device with no accounts or cloud setup.

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

- **Notes, shapes & drawing:** Sticky notes, editable text, object-to-object connectors, freehand drawing, and a searchable shape menu (rectangle, circle, triangle, diamond, hexagon, star, arrow, speech bubble, and frame).
- **PDFs, videos & maps:** Drop in images and local PDFs (rendered right on the board with page navigation), or use the **Embed** menu to add YouTube/Vimeo videos, Google Maps, and PDF links.
- **Floating workspace:** Switch between open boards in the top tab bar, close tabs without deleting boards, reopen saved boards from the library, and double-click any tab (or press `F2`) to rename it.
- **Arrange & style:** Multi-select, group, lock, rotate, align, and reorder layers from **Style & arrange**. Toggle grid and snapping together with a single button, and save named camera positions with **Scenes**.
- **Local storage & backups:** Boards autosave locally on your device. Export or import full editable JSON backups (including attachments) to back up your work or move boards between the browser and Mac app, or export to PNG, SVG, and PDF.

## Shortcuts

| Action                     | Shortcut                        |
| -------------------------- | ------------------------------- |
| Select / Pan               | V / H                           |
| Pan temporarily            | Space + drag                    |
| Sticky / Text / Link       | N / T / L                       |
| Rectangle / Circle / Frame | R / O / F                       |
| Connector / Draw           | C / P                           |
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
