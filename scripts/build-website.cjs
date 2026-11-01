'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { collectPublicFiles } = require('../lib/public-files.cjs');

function buildWebsite({ root, out, revision, releaseId, layout = 'versioned' }) {
  if (!['direct', 'versioned'].includes(layout)) throw Error('Invalid website layout.');
  if (!/^[a-f0-9]{40}$/.test(revision || '')) throw Error('A full Git commit SHA is required.');
  if (!new RegExp(`^${revision}-(?:[0-9]+|local)-[0-9]+$`).test(releaseId || ''))
    throw Error('Invalid website release identifier.');
  const files = [...collectPublicFiles(root), 'LICENSE.txt'];
  const saiDist = path.join(root, 'build/sai-dist');
  if (process.env.REQUIRE_SAI === '1' && !fs.existsSync(path.join(saiDist, 'index.html')))
    throw Error('Sai build is required for this website release.');
  const saiFiles = [];
  function collectSai(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = path.posix.join(prefix, entry.name);
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) collectSai(absolute, relative);
      else if (entry.isFile() && !fs.lstatSync(absolute).isSymbolicLink() &&
        /^[a-zA-Z0-9_./-]+$/.test(relative) && !relative.split('/').includes('..')) {
        saiFiles.push({ name: 'sai/' + relative, bytes: fs.readFileSync(absolute) });
      } else throw Error('Unsafe file in Sai build: ' + relative);
    }
  }
  if (fs.existsSync(path.join(saiDist, 'index.html'))) collectSai(saiDist);
  // Read everything before replacing the build directory. Never copy the repository wholesale.
  const entries = files.map((name) => ({
    name,
    bytes: fs.readFileSync(path.join(root, name === 'LICENSE.txt' ? 'LICENSE' : name)),
  }));
  entries.push(...saiFiles);
  const prefix = `/_sparkboard/releases/${releaseId}/`;
  const html = entries.find((entry) => entry.name === 'index.html');
  const source = html.bytes.toString('utf8');
  if (/<base\b/i.test(source) || !source.includes('<head>'))
    throw Error('Unexpected website document structure.');
  html.bytes = Buffer.from(
    source.replace(
      '<head>',
      `<head>\n${layout === 'versioned' ? `    <base href="${prefix}" />\n` : ''}    <meta name="sparkboard-build" content="${revision}" />`,
    ),
  );
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'release'), { recursive: true });
  const manifest = { revision, releaseId, layout, files: [] };
  for (const { name, bytes } of entries) {
    const destination = path.join(out, 'release', name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
    manifest.files.push({
      path: name,
      size: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    });
  }
  fs.writeFileSync(path.join(out, 'index.html'), html.bytes);
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.copyFileSync(path.join(root, 'deploy/website.htaccess'), path.join(out, '.htaccess'));
  return manifest;
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const revision =
    process.env.WEBSITE_REVISION ||
    require('node:child_process')
      .execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' })
      .trim();
  const releaseId = `${revision}-${process.env.GITHUB_RUN_ID || 'local'}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`;
  const manifest = buildWebsite({
    root,
    out: path.join(root, 'build/website'),
    revision,
    releaseId,
    layout: process.env.WEBSITE_LAYOUT || 'versioned',
  });
  console.log(
    `Website built: ${manifest.files.length} public files; layout ${manifest.layout}; revision ${revision}.`,
  );
}
module.exports = { buildWebsite };
