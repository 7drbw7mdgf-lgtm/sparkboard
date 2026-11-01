import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PULSE_COMMIT } from '../scripts/build-pulse.cjs';

test('Pulse site tracks an immutable upstream revision and never hosts the local Python backend', () => {
  assert.match(PULSE_COMMIT, /^[a-f0-9]{40}$/);
  const source = fs.readFileSync('scripts/build-pulse.cjs', 'utf8');
  const build = fs.readFileSync('scripts/build-website.cjs', 'utf8');
  const workflow = fs.readFileSync('.github/workflows/deploy-website.yml', 'utf8');
  const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
  const verify = fs.readFileSync('scripts/verify-website.py', 'utf8');
  assert.match(source, /site\/fasthosts/);
  assert.match(source, /PUBLIC_FILES = \['index.html'\]/);
  assert.doesNotMatch(source, /pulse-backend|\.sqlite3/);
  assert.match(build, /pulse\/index.html/);
  assert.match(workflow, /npm run pulse:build/);
  assert.match(workflow, /REQUIRE_PULSE: '1'/);
  assert.match(ci, /npm run pulse:build/);
  assert.match(verify, /def verify_pulse\(/);
  assert.match(fs.readFileSync('index.html', 'utf8'), /href="\/pulse\/"/);
});
