'use strict';
/**
 * Publish the owner's pinned Pulse static homepage under /pulse/.
 * This deliberately does not copy Pulse's Python backend, databases or private files.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PULSE_REPOSITORY = 'https://github.com/7drbw7mdgf-lgtm/Pulse.git';
const PULSE_COMMIT = 'bc63afe78cae1a3bb683c72a5c1eccd6c1a9bdf1';
const PUBLIC_FILES = ['index.html'];

function buildPulse(root = path.resolve(__dirname, '..')) {
  const source = path.join(root, 'build/pulse-source');
  const destination = path.join(root, 'build/pulse-dist');
  fs.rmSync(source, { recursive: true, force: true });
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(source), { recursive: true });
  const git = (...args) => execFileSync('git', args, { stdio: 'inherit' });
  git('clone', '--quiet', '--filter=blob:none', '--no-checkout', PULSE_REPOSITORY, source);
  git('-C', source, 'sparse-checkout', 'set', 'site/fasthosts');
  git('-C', source, 'checkout', '--quiet', '--detach', PULSE_COMMIT);
  const actual = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  if (actual !== PULSE_COMMIT) throw Error('Pulse source revision mismatch.');
  fs.mkdirSync(destination, { recursive: true });
  for (const file of PUBLIC_FILES) {
    const original = path.join(source, 'site/fasthosts', file);
    const target = path.join(destination, file);
    if (!fs.statSync(original).isFile() || fs.lstatSync(original).isSymbolicLink())
      throw Error('Invalid Pulse website asset: ' + file);
    fs.copyFileSync(original, target);
  }
  const html = fs.readFileSync(path.join(destination, 'index.html'), 'utf8');
  const hasReleaseLink = html.includes('github.com/7drbw7mdgf-lgtm/Pulse/releases/latest');
  if (!html.includes('<title>Pulse') || !hasReleaseLink)
    throw Error('Pulse landing page is missing required content.');
  if (/<script\b/i.test(html) || /<base\b/i.test(html))
    throw Error('Pulse public homepage must be standalone and must not execute scripts.');
  console.log('Built public Pulse landing page for /pulse/ from pinned commit ' + PULSE_COMMIT);
}

if (require.main === module) buildPulse();
module.exports = { buildPulse, PULSE_COMMIT };
