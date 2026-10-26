# Sparkboard

A local-first canvas inspired by Lucidspark and Apple Freeform.

[Download the macOS installer](https://github.com/7drbw7mdgf-lgtm/sparkboard/releases/tag/v1.1.0) · Apple Silicon · macOS 14+

## Run

Run `npm start` from this folder, then open http://localhost:3000. Requires Node.js; no dependencies or API key are needed.

Run `npm run check` for JavaScript syntax checks and `npm test` for the board-operation tests.

## Create and collect

- Sticky notes and editable text
- One searchable Shapes menu: rectangle, circle, triangle, diamond, hexagon, star, arrow, speech bubble and frame
- Object-to-object connectors and freehand drawing with color and width controls
- Images and PDF attachment cards using the media button or drag and drop
- Images are resized to at most 1400 pixels on the longest side before saving; GIFs become still images
- PDF cards retain the original document for download; there is no inline PDF viewer
- Web link cards; paste a URL to create one
- Paste text to create a note, or paste images from the clipboard

## Organize and format

Shift-click to add or remove items from a selection, or drag empty canvas to select a region. Select an item and open **Style & arrange** in the floating toolbar for text size, bold, alignment, colors, rotation, border width, grouping, layer order and alignment/distribution. Locked items stay selected but cannot be edited or moved until unlocked. All members of a group are selected and moved together. Frames are visual containers; group a frame with its contents to move them together.

Use the grid and snap buttons at bottom left, and zoom/fit controls at bottom right. Scene views save the current pan and zoom, giving you named places to return to on a board. Find searches note text, files and link addresses. The board library searches board titles.

## Save and export

Boards and media save in IndexedDB in the current browser on this device. Earlier localStorage boards are migrated automatically. A small synchronous recovery copy is also kept when the workspace fits in localStorage. Wait for “All changes saved” before closing a board with large attachments. JSON exports include assets, grouping, formatting and scenes and can be imported from the board library. Export PNG or SVG for images; choose Print / Save as PDF to use the browser print dialog. This is a local app; it does not provide iCloud sync, accounts or live collaboration.

## Shortcuts

| Action | Shortcut |
| --- | --- |
| Select / Pan | V / H |
| Pan temporarily | Space + drag |
| Sticky / Text / Link | N / T / L |
| Rectangle / Circle / Frame | R / O / F |
| Connector / Draw | C / P |
| Multi-select | Shift-click / drag empty canvas |
| Select all | Cmd/Ctrl + A |
| Edit | Enter or double-click |
| Copy / Paste | Cmd/Ctrl + C / V |
| Duplicate | Cmd/Ctrl + D |
| Group / Ungroup | Cmd/Ctrl + G / Shift + G |
| Undo / Redo | Cmd/Ctrl + Z / Shift + Z |
| Find | Cmd/Ctrl + F |
| Nudge | Arrow keys; Shift for 10 px |
| Delete | Backspace / Delete |
| Zoom | Pinch or Ctrl + scroll |

Google Fonts are optional; system fonts are used when unavailable.

## Updates (sandbox enabled)

Open **App updates** in the header. The default **Local sandbox** source makes no GitHub requests. A signed local v1.1.1 test release is included in this workspace. Try **Check for updates → Download update → Install & reload**. Use **Restore** to return to the previous version, or **Reset sandbox** to return to the bundled app and repeat the exercise. Boards, images, PDFs and scenes remain in the same browser storage. Pending edits are saved before an install or rollback.

The updater verifies an Ed25519 publisher signature and SHA-256 hashes before staging files. Activation changes an atomic local pointer; bundled source files are retained. An incomplete installed release restores the bundled app on server startup. Runtime state, downloaded versions and signing secrets live in the ignored `.sparkboard/` directory and cannot be fetched through the web server.

This updater installs the web app files. The Node server and updater bootstrap are retained separately and require a normal source update when those components change.

### Prepare a sandbox release

Run `npm run sandbox:prepare` after editing the bundled app. This signs a test release one patch version above `package.json` using the local publisher key. Rebuild or reset the sandbox to test new source changes; an activated release serves its staged files until reset or rollback.

### Connect GitHub later

No live update repository is configured by default; the app stays in sandbox mode. To connect a public release repository later:

1. Keep `.sparkboard/keys/release-private.pem` private and backed up. Keep `update-public-key.pem` with the app. The public key must remain stable for existing installations to trust your releases.
2. Prepare release notes in a text file and run `npm run release:build -- --version 1.2.0 --notes /absolute/path/to/release-notes.txt`.
3. Publish a public GitHub release tagged `v1.2.0` and attach the generated `.sparkboard/releases/1.2.0/sparkboard-update.json` asset under the exact filename `sparkboard-update.json`. The payload version and release tag must agree.
4. Open App updates, select **GitHub releases**, enter that repository's URL, and choose **Save update source**.
5. Check, download and install. Releases signed by a different key, incompatible packages and files with invalid hashes are rejected. Private repositories are not supported by this local updater.

Release discovery uses GitHub's latest stable release API; release assets are downloaded over HTTPS from GitHub's asset servers. The sandbox uses the same package verifier, staging, activation and rollback code with a local source.

## macOS app / DMG

The Apple Silicon desktop wrapper lives in `desktop/Launcher.swift`. It uses a native WKWebView with persistent app storage and launches the bundled Node runtime on `localhost:43871`. Update staging lives in `~/Library/Application Support/Sparkboard/updates`, leaving the signed app bundle unchanged. JSON import/export is the supported way to move boards between a browser and the desktop app.

The build helper `scripts/build-macos.py` accepts `--node /absolute/path/to/an/official/Node/bin/node --work /absolute/build/folder`. It produces a locally signed `.app`, bundles the public update-verification key and the signed sandbox release, and excludes private signing keys. Create a compressed disk image from a staging folder containing `Sparkboard.app`, an `Applications` shortcut, and installation instructions. The current DMG requires an Apple Silicon Mac running macOS 14 or later. It is not Apple-notarized.
