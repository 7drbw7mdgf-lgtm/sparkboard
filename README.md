# Sparkboard

A local-first canvas inspired by Lucidspark and Apple Freeform. MIT licensed.

[macOS release downloads](https://github.com/7drbw7mdgf-lgtm/sparkboard/releases) · Apple Silicon · macOS 14+

## Start from a fresh clone

Requires Node.js 24 or newer. There is no frontend bundler and no API key is required.

```sh
git clone https://github.com/7drbw7mdgf-lgtm/sparkboard.git
cd sparkboard
npm ci
npm run build
npm start
```

Open [localhost:3000](http://localhost:3000). `npm run build` checks the complete public-file/import graph and prepares a local sandbox update. It generates disposable sandbox signing keys under ignored `.sparkboard/`; it never needs the publisher's private key or changes `update-public-key.pem`.

```sh
npm run check         # Syntax-check all JavaScript modules
npm test              # Board model, IndexedDB, save scheduling, updater and clean-build tests
npm run format:check  # Check source formatting
npm run format        # Format JavaScript, CSS, HTML and documentation
```

The dev dependencies are a formatter and `fake-indexeddb` for storage tests. The running web app uses browser APIs and Node built-ins only.

## Code map

| Area                                                                         | Location                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Startup and event registration                                               | `app.js`                                                                  |
| Board lifecycle and save coordinator                                         | `src/boards.js`                                                           |
| IndexedDB schema, migration, transactions, media encoding and debounce queue | `src/storage/`                                                            |
| Canvas interaction, text editing, selection and commands                     | `src/canvas.js`, `src/editor.js`, `src/selection.js`, `src/commands.js`   |
| Rendering, inspector, tools and viewport                                     | `src/rendering.js`, `src/inspector.js`, `src/tools.js`, `src/viewport.js` |
| Media, clipboard, import/export, scenes and dialogs                          | The corresponding modules in `src/`                                       |
| Session state and shared helpers                                             | `src/state.js`, `src/core.js`                                             |
| Board geometry and portable-backup validation                                | `board-model.js`                                                          |
| Update lifecycle                                                             | `updater.cjs`                                                             |
| Signed package validation, GitHub transport and atomic files                 | `lib/updates/`                                                            |
| Public asset manifest used by web builds, releases and desktop packaging     | `lib/public-files.cjs`                                                    |
| Native macOS wrapper                                                         | `desktop/`                                                                |

UI modules share session state and named operations; they do not open database transactions. The repository and save scheduler have no DOM dependency and are tested independently. The starter image lives in `assets/`, rather than as an encoded string inside the application source.

## Create and collect

- Sticky notes and editable text
- One searchable Shapes menu: rectangle, circle, triangle, diamond, hexagon, star, arrow, speech bubble and frame
- Object-to-object connectors and freehand drawing with color and width controls
- Images and PDF cards using the media button, clipboard or drag and drop
- Images resize to at most 1400 pixels on the longest side; GIFs become still images
- PDF cards retain the original document for download; there is no inline PDF viewer
- Web link cards; paste a URL to create one

Shift-click or drag empty canvas to select multiple items. **Style & arrange** provides text formatting, rotation, grouping, layer order, locking, alignment and distribution. Frames are visual containers; group a frame with its contents to move them together. Scenes save named camera positions. Find searches the active board; the board library searches board titles.

## Storage and autosave

IndexedDB database `sparkboard-workspace`, schema version 2, contains:

| Store       | Entry                                                                      |
| ----------- | -------------------------------------------------------------------------- |
| `boards`    | One board keyed by ID, with media references instead of embedded file data |
| `summaries` | One lightweight library row per board, without objects or attachments      |
| `media`     | One binary Blob per unique file content and MIME type                      |
| `mediaRefs` | Indexed board-to-media references for shared-file lifetime tracking        |
| `settings`  | Individual active-board and migration settings                             |

Opening the library reads summaries only. Opening a board loads its media on demand. Editing one board never rewrites another board or its unchanged attachments. Removing an attachment deletes its Blob only after its last board reference is removed. Undo can restore a removed attachment from the active session cache.

Typing saves after **300 ms of inactivity**, with a **2-second maximum wait** during continuous typing. Structural edits save immediately. Switching boards, importing, closing the native app, or installing an update flushes outstanding writes. Failed writes remain pending and can be retried; “saved” is shown only after the transaction commits.

Existing v1 IndexedDB and localStorage workspaces migrate automatically. Sources are merged per board using their timestamps. The migration commits all boards, media, references and its completion marker in one transaction before removing the legacy aggregate. An interrupted migration retains the original data and can be retried. The now-empty v1 object store may remain as a compatibility artifact; no workspace blob is written to it.

A small **per-board metadata journal** is written to localStorage only when leaving a page with pending edits. It contains media IDs, never attachment bytes. Newer journals are replayed once on startup; an older completed save cannot erase a newer journal. If storage is unavailable or legacy data cannot be parsed, the app reports the problem rather than silently creating a replacement workspace.

Boards stay in the current browser or desktop app on this device. JSON export/import includes media and is the portable backup format. SVG, PNG and print/PDF exports are also available. There are no accounts, cloud sync or live collaboration.

## macOS build from a fresh clone

Requires an Apple Silicon Mac, macOS 14+, Python 3, and Xcode Command Line Tools. No publisher signing key or pre-existing sandbox file is needed.

```sh
npm ci
npm run build:mac
```

The helper downloads a checksum-pinned official Node runtime, prepares its own sandbox fixture, and builds `build/macos/Sparkboard.app`. The app bundles the runtime, all frontend modules/assets, backend helper modules and both software licenses. Private keys and user boards are excluded.

To supply an already-downloaded **official self-contained** Node runtime and optionally make a DMG:

```sh
python3 scripts/build-macos.py \
  --node /absolute/path/to/node-v24.22.1-darwin-arm64/bin/node \
  --work /absolute/path/to/build \
  --dmg /absolute/path/to/Sparkboard.dmg
```

A Homebrew binary with external dylib dependencies is rejected. Development builds are locally signed, not Apple-notarized.

The app serves its private window from `localhost:43871`; its updater writes to `~/Library/Application Support/Sparkboard/updates`, outside the signed bundle. Browser and desktop workspaces are separate: use editable JSON export/import to move boards between them.

## Updates and release signing

**App updates → Local sandbox** exercises check, download, verified install and rollback without contacting GitHub. Prepare or refresh the local fixture with `npm run build` or `npm run sandbox:prepare`. The fixture uses an isolated local key and cannot be installed as a publisher-signed GitHub release. The tracked publisher public key is never replaced by a development build.

Public releases use Ed25519 signatures plus SHA-256 file hashes. The updater stages a complete public-file manifest, activates it with an atomic pointer, and retains the previous version. A newer bundled desktop app takes precedence over an older staged web version. Node/updater bootstrap changes require a new desktop/server build; modular web releases declare updater protocol 2 so older installers reject incompatible bundles safely.

Publisher workflow:

```sh
npm run release:build -- \
  --version 1.2.1 \
  --key /secure/path/to/publisher-private.pem \
  --notes /absolute/path/to/release-notes.md
```

The private key must match `update-public-key.pem`. Missing or mismatched publisher keys fail with an actionable message, without changing the trust anchor. The original maintainer can also use the ignored `.sparkboard/keys/release-private.pem` location. Keep signing keys private and backed up.

Publish a public GitHub release tagged with the matching version and attach the generated `sparkboard-update.json` under that exact filename. Then select **GitHub releases** in the app, save the repository URL and check for updates. Private repositories are not supported by this updater. Sandbox remains the default source.

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
| Copy / Paste               | Cmd/Ctrl + C / V                |
| Duplicate                  | Cmd/Ctrl + D                    |
| Group / Ungroup            | Cmd/Ctrl + G / Shift + G        |
| Undo / Redo                | Cmd/Ctrl + Z / Shift + Z        |
| Find                       | Cmd/Ctrl + F                    |
| Nudge                      | Arrow keys; Shift for 10 px     |
| Delete                     | Backspace / Delete              |
| Zoom                       | Pinch or Ctrl + scroll          |

Google Fonts are optional; system fonts are used when unavailable.

## License

[MIT](LICENSE), copyright 2026 Sparkboard contributors. The desktop bundle includes Node.js's separate license.
