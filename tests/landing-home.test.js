import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mobileActionMarkup, canConnectNode } from '../src/mobile-actions.js';
import { toolAvailableOnLayout } from '../src/mobile-editor-policy.js';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const canvas = readFileSync(new URL('../src/canvas.js', import.meta.url), 'utf8');
const controls = readFileSync(new URL('../src/controls.js', import.meta.url), 'utf8');

test('marketing home has original visual demonstration, features, practical use cases and authentic login controls', () => {
  for (const heading of [
    'Make room for',
    'Less juggling tabs.',
    'From blank board to',
    'Whatever you',
  ]) {
    assert.ok(index.includes(heading), 'Missing homepage section ' + heading);
  }
  for (const id of [
    'landing-top',
    'start-features',
    'start-steps',
    'start-uses',
    'start-auth',
    'start-email-form',
    'start-email',
    'start-email-submit',
    'start-providers',
    'start-guest',
    'start-unavailable',
    'start-feedback',
  ]) {
    assert.equal((index.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, 'ID ' + id);
  }
  assert.match(index, /<svg class="landing-board-svg"/);
  assert.match(index, /aria-label="Illustration of a Sparkboard canvas/);
  assert.match(index, /Account sync is optional/);
  assert.match(index, /not live multiuser collaboration/);
  assert.match(index, /<h1 id="landing-headline" tabindex="-1">/);
  assert.match(index, /<a class="landing-nav-cta" href="#start-auth"/);
  assert.match(css, /.landing-hero-art/);
  assert.match(css, /@media \(max-width: 560px\)/);
});

test('mobile connector works from a selected item without requiring its toolbar icon', () => {
  const sticky = { id: 'n1', type: 'sticky', x: 0, y: 0, w: 200, h: 200 };
  assert.equal(toolAvailableOnLayout('connector', true), true);
  assert.equal(canConnectNode(sticky), true);
  assert.match(mobileActionMarkup([sticky], null), /data-mobile-action="connect"/);
  assert.match(controls, /action === 'connect'/);
  assert.match(controls, /state\.connectorStart = source\.id/);
  assert.match(canvas, /if \(state\.tool === 'connector'\)/);
  assert.match(css, /#tools \[data-tool='connector'\] \{\s*display:\s*none !important;/);
  assert.doesNotMatch(
    mobileActionMarkup([{ ...sticky, type: 'line' }], null),
    /data-mobile-action="connect"/,
  );
  assert.doesNotMatch(
    mobileActionMarkup([{ ...sticky, locked: true }], null),
    /data-mobile-action="connect"/,
  );
});
