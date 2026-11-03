import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mobileActionMarkup, canConnectNode } from '../src/mobile-actions.js';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const canvas = readFileSync(new URL('../src/canvas.js', import.meta.url), 'utf8');

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
  assert.match(index, /<svg\s+class="landing-board-svg"/);
  assert.match(index, /aria-label="Illustration of a Sparkboard canvas/);
  assert.match(index, /Account sync is optional/);
  assert.match(index, /not live multiuser collaboration/);
  assert.match(index, /<h1 id="landing-headline" tabindex="-1">/);
  assert.match(index, /<a class="landing-nav-cta" href="#start-auth"/);
  assert.match(index, /class="landing-nav-benchline" href="\/sai\/"/);
  assert.match(index, /id="start-benchline"/);
  assert.match(index, /class="landing-menu"/);
  assert.match(index, /aria-label="Primary destinations"/);
  const menu = index.slice(
    index.indexOf('class="landing-menu"'),
    index.indexOf('class="landing-thumb"'),
  );
  for (const label of [
    'Start a board',
    'Features',
    'How it works',
    'Use cases',
    'Planner',
    'Benchline',
    'Pulse literature',
  ]) {
    assert.ok(menu.includes(label), 'Mobile menu missing ' + label);
  }
  const thumb = index.slice(
    index.indexOf('class="landing-thumb"'),
    index.indexOf('</nav>', index.indexOf('class="landing-thumb"')),
  );
  assert.equal((thumb.match(/<a /g) || []).length, 3);
  assert.match(css, /\.landing-thumb a \{[\s\S]*min-height: 44px/);
  assert.match(css, /\.landing-menu summary \{[\s\S]*min-height: 44px/);
  assert.match(index, /class="landing-feature-grid"/);
  assert.match(index, /Scroll across/);
  assert.match(css, /.landing-hero-art/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(css, /@media \(max-width: 560px\)/);
});

test('shapes connect by dragging the nodes that appear on hover or selection', () => {
  const sticky = { id: 'n1', type: 'sticky', x: 0, y: 0, w: 200, h: 200 };
  assert.equal(canConnectNode(sticky), true);
  assert.doesNotMatch(mobileActionMarkup([sticky], null), /data-mobile-action="connect"/);
  const controls = readFileSync(new URL('../src/controls.js', import.meta.url), 'utf8');
  assert.doesNotMatch(controls, /action === 'connect'/);
  assert.match(canvas, /e\.target\.closest\('\.port'\)/);
  assert.doesNotMatch(canvas, /portEl &&\s*\n\s*!isCompactEditor\(\)/);
  assert.match(css, /\.object:hover \.port/);
  assert.match(css, /\.object\.selected \.port/);
  assert.match(css, /#objects \.object\.selected:not\(\.locked\) \.port/);
  const tools = readFileSync(new URL('../src/tools.js', import.meta.url), 'utf8');
  const palette = tools.slice(
    tools.indexOf('export function setupTools'),
    tools.indexOf('export function setTool'),
  );
  assert.doesNotMatch(palette, /'connector'/);
});
