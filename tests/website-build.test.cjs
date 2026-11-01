const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildWebsite } = require('../scripts/build-website.cjs');
test('website packaging includes only public files and binds all relative assets to one release', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sparkboard-website-'));
  try {
    for (const name of ['src', 'assets', '.sparkboard/keys', 'deploy'])
      fs.mkdirSync(path.join(root, name), { recursive: true });
    const fixtures = {
      'index.html': '<html><head></head><body><script src="app.js"></script></body></html>',
      'app.js': 'import "./src/example.js";',
      'board-model.js': 'export {};',
      'style.css': 'body{}',
      'src/example.js': 'export {};',
      'assets/example.svg': '<svg/>',
      LICENSE: 'MIT',
      'server.cjs': 'PRIVATE SERVER',
      'updater.cjs': 'PRIVATE UPDATER',
      '.sparkboard/keys/release-private.pem': 'PRIVATE KEY',
      'deploy/website.htaccess': 'DirectoryIndex index.html',
    };
    for (const [name, data] of Object.entries(fixtures))
      fs.writeFileSync(path.join(root, name), data);
    const revision = 'a'.repeat(40),
      releaseId = revision + '-123-1',
      out = path.join(root, 'build/website');
    const result = buildWebsite({ root, out, revision, releaseId });
    assert.equal(result.files.length, 7);
    assert.match(
      fs.readFileSync(path.join(out, 'index.html'), 'utf8'),
      new RegExp(`<base href="/_sparkboard/releases/${releaseId}/"`),
    );
    assert.match(
      fs.readFileSync(path.join(out, 'index.html'), 'utf8'),
      new RegExp(`name="sparkboard-build" content="${revision}"`),
    );
    for (const entry of result.files)
      assert.ok(!/private|server|updater|\.sparkboard/i.test(entry.path));
    assert.equal(fs.readFileSync(path.join(out, 'release/LICENSE.txt'), 'utf8'), 'MIT');
    const direct = buildWebsite({ root, out, revision, releaseId, layout: 'direct' });
    assert.equal(direct.layout, 'direct');
    const directHtml = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    assert.doesNotMatch(directHtml, /<base\b/i);
    assert.match(directHtml, /src="app.js"/);
    assert.match(directHtml, new RegExp(`content="${revision}"`));
    assert.ok(fs.existsSync(path.join(out, 'release/src/example.js')));
    assert.throws(
      () => buildWebsite({ root, out, revision, releaseId, layout: 'unknown' }),
      /layout/,
    );
    assert.throws(
      () => buildWebsite({ root, out, revision, releaseId: '../../escape' }),
      /identifier/,
    );
    assert.ok(fs.existsSync(path.join(out, 'index.html')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
