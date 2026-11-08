import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mobileActionMarkup, canConnectNode } from '../src/mobile-actions.js';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const canvas = readFileSync(new URL('../src/canvas.js', import.meta.url), 'utf8');

test('swipe-first homepage has working previews and preserves access to the real editor', () => {
  for (const heading of [
    'Make room for',
    'Less reading. More doing.',
    'Move your ideas around.',
    'Watch a thought branch out.',
    'Make the connections clear.',
    'Give your ideas a timeline.',
  ]) {
    assert.ok(index.includes(heading), 'Missing homepage content ' + heading);
  }
  for (const id of [
    'landing-top',
    'start-features',
    'start-steps',
    'start-uses',
    'start-benchline',
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
  assert.match(index, /Account sync is optional/);
  assert.match(index, /not live multiuser collaboration/);
  assert.match(index, /<h1 id="landing-headline" tabindex="-1">/);
  assert.match(index, /<a class="landing-nav-cta" href="#start-auth"/);
  assert.match(index, /class="landing-nav-benchline" href="\/sai\/"/);
  assert.match(index, /class="landing-menu"/);
  assert.match(index, /aria-label="Primary destinations"/);
  assert.match(index, /class="tour-track"/);
  assert.equal((index.match(/class="tour-slide"/g) || []).length, 4);
  assert.match(index, /data-tour-prev/);
  assert.match(index, /data-tour-next/);
  assert.match(index, /data-demo-sticky/);
  assert.match(index, /data-demo-branch-add/);
  assert.match(index, /data-demo-route/);
  assert.match(index, /data-demo-plan-reset/);
  assert.match(index, /src="src\/landing-tour\.js"/);
  assert.match(css, /scroll-snap-type:\s*x mandatory/);
  assert.match(css, /@media\s*\(max-width:\s*740px\)/);
  const script = readFileSync(new URL('../src/landing-tour.js', import.meta.url), 'utf8');
  assert.match(script, /rail\.addEventListener\(\s*['\"]scroll['\"]/);
  assert.match(script, /pointermove/);
  assert.match(script, /aria-current/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(script, /if \(tour\)/);
  assert.doesNotMatch(index, /class="landing-feature-grid"/);
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
