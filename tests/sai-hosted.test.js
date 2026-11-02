import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SAI_COMMIT, replaceRequired } from '../scripts/build-sai.cjs';

test('Sai source revision is pinned and build has no credential injection', () => {
  assert.match(SAI_COMMIT, /^[a-f0-9]{40}$/);
  const build = fs.readFileSync('scripts/build-sai.cjs', 'utf8');
  assert.match(build, /HostedAIPanel/);
  assert.match(build, /GEMINI_API_KEY: ''/);
  assert.match(build, /API_KEY: ''/);
  assert.match(build, /--base', '\/sai\//);
  assert.match(build, /HostedPersistence/);
});

test('Sai sources are served as an isolated subpath without duplicating authentication', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /href="\/sai\/"/);
  assert.match(html, /id="sai-link"|class="sai-workspace-link"/);
  assert.match(html, /class="sai-mobile-link"/);
  assert.match(html, /Benchline projects are stored locally/);
  assert.match(html, />Benchline<\/a>/);
  assert.match(html, /Meet Benchline/);
  assert.match(html, /Open Benchline project planner/);
  assert.doesNotMatch(html, />Sai planner/);
  // Keep the hosted route intact until a separate Benchline destination is supplied.
  assert.match(html, /href="\/sai\/"/);
  const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
  const deploy = fs.readFileSync('.github/workflows/deploy-website.yml', 'utf8');
  assert.match(ci, /npm run sai:build/);
  assert.match(deploy, /npm run sai:build/);
  assert.match(deploy, /REQUIRE_SAI: '1'/);
});

test('staging patches fail closed if upstream Sai layout changes', () => {
  const dir = fs.mkdtempSync('/tmp/sai-build-patch-');
  const file = dir + '/App.tsx';
  try {
    fs.writeFileSync(file, 'import App from "./App";');
    assert.throws(() => replaceRequired(file, 'import AIAssistantPanel', ''), /source changed/);
    assert.equal(fs.readFileSync(file, 'utf8'), 'import App from "./App";');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
