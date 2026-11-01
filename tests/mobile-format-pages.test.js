import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveFormatPage, stepFormatPage, showFormatPage, stepVisibleFormatPage } from '../src/mobile-format-pages.js';

const pageNames = ['Appearance', 'Text', 'Layout', 'Arrange', 'Actions'];

test('Format page navigation clamps at ends and falls back for missing sections', () => {
  assert.equal(resolveFormatPage(pageNames, 'Layout'), 'Layout');
  assert.equal(resolveFormatPage(pageNames, 'Missing'), 'Appearance');
  assert.equal(resolveFormatPage(['Text', 'Actions'], 'Appearance'), 'Text');
  assert.equal(stepFormatPage(pageNames, 'Layout', 1), 'Arrange');
  assert.equal(stepFormatPage(pageNames, 'Appearance', -1), 'Appearance');
  assert.equal(stepFormatPage(pageNames, 'Actions', 1), 'Actions');
});

test('Format switches visible pages without rebuilding input fields', () => {
  const panels = pageNames.map((name) => ({
    dataset: { formatSection: name },
    hidden: name !== 'Appearance',
  }));
  const tabs = pageNames.map((name) => ({
    dataset: { formatPage: name },
    attributes: {},
    tabIndex: -1,
    setAttribute(k, v) { this.attributes[k] = v; },
    classList: { toggle() {} },
    scrollIntoView() {},
  }));
  const counter = { textContent: '' };
  const back = { disabled: true };
  const forward = { disabled: false };
  const root = {
    dataset: { activePage: 'Appearance' },
    querySelectorAll(selector) {
      if (selector === '[data-format-section]') return panels;
      if (selector === '[data-format-page]') return tabs;
      throw Error(selector);
    },
    querySelector(selector) {
      return selector === '[data-format-counter]' ? counter
        : selector === '[data-format-step="-1"]' ? back
        : selector === '[data-format-step="1"]' ? forward
        : null;
    },
  };
  assert.equal(showFormatPage(root, 'Text'), 'Text');
  assert.deepEqual(panels.filter((p) => !p.hidden).map((p) => p.dataset.formatSection), ['Text']);
  assert.equal(root.dataset.activePage, 'Text');
  assert.equal(tabs[1].attributes['aria-selected'], 'true');
  assert.equal(tabs[0].attributes['aria-selected'], 'false');
  assert.equal(counter.textContent, '2 / 5');
  assert.equal(back.disabled, false);
  assert.equal(stepVisibleFormatPage(root, 1), 'Layout');
  assert.equal(showFormatPage(root, 'Actions'), 'Actions');
  assert.equal(forward.disabled, true);
});

test('Line gesture starts before connector ports or object resize handles', () => {
  const canvas = readFileSync(new URL('../src/canvas.js', import.meta.url), 'utf8');
  const start = canvas.indexOf('export function setupCanvas()');
  const line = canvas.indexOf("if (state.tool === 'line')", start);
  const port = canvas.indexOf("const portEl = e.target.closest('.port')", start);
  const vertex = canvas.indexOf("const vertexEl = e.target.closest('.vertex-handle')", start);
  assert.ok(start >= 0 && line > start && port > line && vertex > line,
    'Line must draw before any object edit or connector handler');
  const tools = readFileSync(new URL('../src/tools.js', import.meta.url), 'utf8');
  assert.match(tools, /lineOpts\.hidden = compact \|\|/);
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(css, /#tools \[data-tool='connector'\]/);
});
