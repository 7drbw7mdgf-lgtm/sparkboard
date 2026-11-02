import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Benchline phone shell follows the Sparkboard dock', () => {
  const shell = fs.readFileSync('integration/sai/HostedMobileShell.tsx', 'utf8');
  const build = fs.readFileSync('scripts/build-sai.cjs', 'utf8');
  const manifest = JSON.parse(fs.readFileSync('integration/sai/manifest.webmanifest', 'utf8'));
  assert.match(shell, /\(max-width: 650px\), \(max-height: 500px\) and \(pointer: coarse\)/);
  for (const label of [
    'Home',
    'Tasks',
    'New task',
    'Views',
    'Kanban',
    'Gantt',
    'Calendar',
    'More',
    'Settings',
    'Help',
  ]) {
    assert.match(shell, new RegExp(`aria-label="${label}"`));
  }
  assert.match(shell, /id="benchline-mobile-dock"/);
  assert.match(shell, /benchline-sidebar\{display:none/);
  assert.match(shell, /#benchline-sparkboard/);
  assert.match(build, /import HostedMobileShell from '\.\/HostedMobileShell'/);
  assert.match(build, /benchline-sidebar h-full w-40/);
  assert.match(build, /id="benchline-sparkboard" href="\/"/);
  assert.match(build, /aria-label="Back to Sparkboard"/);
  assert.match(build, /apple-mobile-web-app-capable/);
  assert.match(build, /manifest\.webmanifest/);
  assert.match(build, /benchline-mobile-dock/);
  assert.equal(manifest.name, 'Benchline');
  assert.equal(manifest.short_name, 'Benchline');
  assert.equal(manifest.start_url, '/sai/');
  assert.equal(manifest.scope, '/sai/');
  assert.equal(manifest.display, 'standalone');
});
