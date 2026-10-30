# Sparkboard 1.3.2 — Panning and interaction fixes

- Hand-tool, Space-drag, and middle-button panning can start over media-card controls.
- Interrupted drags release pointer capture and reset the panning cursor. A second pointer cannot move or end another pointer’s drag.
- Switching boards finishes the previous drag and clears temporary connector and reshape state.
- Double-clicking while panning or drawing no longer opens text editing.
- Copy and paste no longer affect the last board after all tabs are closed.

## Install and update

Download **Sparkboard-1.3.2-macOS-arm64.dmg** for Apple Silicon running macOS 14 or later. The app includes its runtime. Existing boards and attachments remain on this device.

Compatible installations can use the signed **sparkboard-update.json** through the in-app GitHub updater. From version 1.1.0, use the full installer instead.

The Mac app is ad-hoc signed and is **not Apple-notarized**.

## Validation

- All 62 automated tests pass, including regression tests for media-control panning, pointer cancellation and ownership, and closed-board clipboard handling.
- Build, syntax, and formatting checks pass.
- Canvas panning verified in the browser with no console errors.
- Mac app signature, disk-image integrity, and packaged update/install/rollback verified.
- SHA-256 checksums and a build report are attached.
