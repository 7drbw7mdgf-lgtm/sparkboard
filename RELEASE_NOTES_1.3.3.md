# Sparkboard 1.3.3 — Curve handles and audit fixes

## New

- New lines automatically include two curve handles. Drag either orange handle to bend the line; drag endpoint handles to move its ends.
- Curve geometry is preserved through moving, copying, Undo/Redo, editable backups, and SVG/PNG/PDF exports.

## Fixed

- Concurrent windows cannot silently overwrite a newer board or recreate a deleted board. Conflicting edits can be saved as a separate board or downloaded as an editable backup.
- Recovery drafts from conflicting windows are preserved as separate boards.
- Arrow and space keys in native Format controls no longer move selected drawings.
- Switching tabs preserves each board’s Undo/Redo history and zoom/pan view for the session.
- Copying a frame includes its contents, nested frames, and internal connectors.
- Exports follow the canvas stacking order so notes do not unexpectedly hide visible strokes.

## Install and compatibility

Download **Sparkboard-1.3.3-macOS-arm64.dmg** for Apple Silicon running macOS 14 or later. The app includes its runtime. Compatible installations can use the signed **sparkboard-update.json** through the in-app updater; version 1.1.0 requires the full installer.

This release upgrades workspace storage to version 3 to prevent older editor windows from bypassing save protection. **Refresh other open Sparkboard windows after updating. Older releases cannot open an upgraded workspace.** Editable JSON exports remain portable backups. Undo history and views persist while boards stay open within the same app session; closing a tab releases its editing history.

The Mac app is ad-hoc signed and is **not Apple-notarized**.

## Validation

- All 72 automated tests pass, including new storage-conflict, recovery, copying, export, session-state, and curve tests.
- Build, syntax, and formatting checks pass.
- Curve dragging, Format keyboard controls, tab state restoration, and two-window conflict recovery verified in the browser.
- Mac signature, disk-image integrity, and packaged launch/update/install/rollback verified.
- SHA-256 checksums and a build report are attached.
