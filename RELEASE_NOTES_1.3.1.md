# Sparkboard v1.3.1 — Source release notes

## Improvements

- Fix embedded video/map subframe navigation in the macOS WKWebView so external embedded content is not automatically redirected to the browser.
- Reduce undo/redo overhead by using structured board snapshots instead of repeatedly JSON-serialising large media data URLs.
- Improve canvas selection performance by indexing board objects once per visual update.
- Introduce GitHub Actions CI that runs JavaScript checks, tests, and a production build on pushes and pull requests.

## Compatibility

- macOS 14+ on Apple Silicon for the desktop application; Node.js 24+ for the local browser version.
- Existing board storage format remains unchanged. No manual migration is required by these fixes.

## Release status

This document records the **1.3.1 source version**, not a published downloadable installer. The public macOS DMG currently linked in the README is version 1.3.0. To distribute v1.3.1, build and test its macOS app, publish a matching DMG, and build and upload the publisher-signed `sparkboard-update.json` asset for in-app updates. The release signing private key is required and must **not** be committed to Git. Do not announce in-app update availability until the signed asset is actually published.

## Validation still required

- Verify that YouTube, Vimeo, Google Maps and linked PDFs work inside the macOS app without sending subframe navigation to the external browser.
- Check that opening external top-level links still opens the default browser.
- Exercise undo/redo with large local PDFs/images and measure memory usage.
- Confirm GitHub Actions is green and perform a fresh-install/saved-board regression test on macOS.
