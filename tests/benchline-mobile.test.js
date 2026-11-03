import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { removeFeedbackButton } from '../scripts/build-sai.cjs';

test('Benchline phone shell is a labelled view bar, not a bottom dock', () => {
  const shell = fs.readFileSync('integration/sai/HostedMobileShell.tsx', 'utf8');
  const build = fs.readFileSync('scripts/build-sai.cjs', 'utf8');
  const manifest = JSON.parse(fs.readFileSync('integration/sai/manifest.webmanifest', 'utf8'));
  assert.match(shell, /\(max-width: 650px\), \(max-height: 500px\) and \(pointer: coarse\)/);
  assert.match(shell, /id="benchline-phone-chrome"/);
  assert.match(shell, /aria-label="Planner views"/);
  for (const label of ['Home', 'Tasks', 'Calendar', 'Kanban', 'Gantt', 'New', 'Settings', 'Help']) {
    assert.match(shell, new RegExp(label));
  }
  assert.doesNotMatch(shell, /benchline-mobile-dock/);
  assert.match(shell, /#4262ff/);
  assert.match(shell, /\/\?workspace=1/);
  assert.match(shell, /#feedback-trigger-btn\{display:none/);
  assert.match(build, /import HostedMobileShell from '\.\/HostedMobileShell'/);
  assert.match(build, /id="benchline-sparkboard" href="\/\?workspace=1"/);
  assert.match(build, /aria-label="Back to Sparkboard"/);
  assert.match(build, /removeFeedbackButton/);
  assert.match(build, /gantt-timeline/);
  assert.match(build, /pan-x pan-y/);
  assert.match(build, /handleSidebarTouchMove/);
  assert.match(build, /gantt-x-scroll/);
  assert.match(shell, /\.gantt-timeline\{overflow:auto!important/);
  assert.match(shell, /\.gantt-x-scroll\{display:none!important\}/);
  assert.match(shell, /backdrop-filter:blur\(28px\) saturate\(1\.4\)/);
  assert.match(shell, /\.benchline-edit-group\{/);
  assert.match(shell, /border-radius:999px/);
  assert.match(build, /benchline-group w-full/);
  assert.match(build, /rounded-full/);
  assert.match(build, /<summary>Progress<\/summary>/);
  assert.doesNotMatch(build, /benchline-edit-group" open>\\n\s+<summary>Progress/);
  assert.match(build, /benchline-edit-group/);
  assert.match(build, /<summary>Details<\/summary>/);
  assert.match(build, /Floating Feedback Button/);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/sai/');
});

test('the hosted build removes the floating feedback button', () => {
  const dir = fs.mkdtempSync('/tmp/benchline-feedback-');
  const file = dir + '/App.tsx';
  try {
    fs.writeFileSync(
      file,
      'before\n{/* Floating Feedback Button */}\n<button id="feedback-trigger-btn">Feedback</button>\nafter\n',
    );
    removeFeedbackButton(file);
    const next = fs.readFileSync(file, 'utf8');
    assert.match(next, /before/);
    assert.match(next, /after/);
    assert.doesNotMatch(next, /feedback-trigger-btn/);
    assert.throws(() => removeFeedbackButton(file), /missing feedback button/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
