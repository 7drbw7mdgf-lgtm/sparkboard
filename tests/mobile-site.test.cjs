'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { collectPublicFiles } = require('../lib/public-files.cjs');

const root = path.resolve(__dirname, '..');

test('mobile editor dependencies are included in hosted and desktop bundles', () => {
  const files = collectPublicFiles(root);
  assert.ok(files.includes('src/mobile-gestures.js'));
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /setupMobileGestures\(\)/);
});

test('mobile viewport and controls are present on the single hosted app', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.match(html, /viewport-fit=cover/);
  assert.match(css, /Mobile editor: full-width touch controls/);
  assert.match(css, /touch-action: pan-x/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /#shape-menu/);
});
