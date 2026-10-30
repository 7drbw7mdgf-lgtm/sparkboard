'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { verifyPackage } = require('../lib/updates/package.cjs');
const { safeFile } = require('../updater.cjs');
const root = path.resolve(__dirname, '..');

function cleanCopy(t) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sparkboard-fresh-clone-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const checkout = path.join(temporary, 'checkout');
  fs.cpSync(root, checkout, {
    recursive: true,
    filter: (filename) => {
      const parts = path.relative(root, filename).split(path.sep);
      return !parts.some((part) =>
        ['.git', '.sparkboard', 'node_modules', 'build', '__pycache__'].includes(part),
      );
    },
  });
  return checkout;
}

function run(checkout, script, ...args) {
  return spawnSync(process.execPath, [path.join(checkout, script), ...args], {
    cwd: checkout,
    encoding: 'utf8',
  });
}

test('a clean checkout builds a complete sandbox without publisher secrets or ignored artifacts', (t) => {
  const checkout = cleanCopy(t),
    originalKey = fs.readFileSync(path.join(checkout, 'update-public-key.pem'));
  assert.equal(fs.existsSync(path.join(checkout, '.sparkboard')), false);
  const result = run(checkout, 'scripts/build.cjs');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readFileSync(path.join(checkout, 'update-public-key.pem')), originalKey);
  assert.equal(fs.existsSync(path.join(checkout, '.sparkboard/keys/release-private.pem')), false);
  const pkg = JSON.parse(fs.readFileSync(path.join(checkout, 'package.json'))),
    version = pkg.version.split('.').map(Number);
  const next = `${version[0]}.${version[1]}.${version[2] + 1}`;
  const bundle = fs.readFileSync(path.join(checkout, '.sparkboard/sandbox/sparkboard-update.json'));
  const sandboxKey = fs.readFileSync(path.join(checkout, '.sparkboard/sandbox/public-key.pem'));
  const verified = verifyPackage(bundle, sandboxKey, next);
  const files = new Set(verified.files.map((file) => file.path));
  assert.ok(files.has('src/storage/repository.js'));
  assert.ok(files.has('src/editor.js'));
  assert.ok(files.has('assets/moodboard-study.png'));
  for (const filename of [
    'assets/pdfjs/pdf.mjs',
    'assets/pdfjs/pdf-worker.mjs',
    'assets/pdfjs/LICENSE.txt',
    'assets/pdfjs/cmaps/Adobe-Japan1-UCS2.bcmap',
    'assets/pdfjs/standard_fonts/LiberationSans-Regular.ttf',
    'assets/pdfjs/wasm/openjpeg.wasm',
  ])
    assert.ok(files.has(filename), filename);
  assert.throws(() => verifyPackage(bundle, originalKey, next), /signature/);
  assert.equal(
    run(checkout, 'scripts/build.cjs').status,
    0,
    'Repeated local builds should reuse their sandbox key',
  );
});

test('publisher signing on a fresh clone fails clearly without changing the trusted public key', (t) => {
  const checkout = cleanCopy(t),
    originalKey = fs.readFileSync(path.join(checkout, 'update-public-key.pem'));
  const result = run(checkout, 'scripts/release.cjs', '--version', '1.2.1');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Publisher signing requires the matching private key/);
  assert.deepEqual(fs.readFileSync(path.join(checkout, 'update-public-key.pem')), originalKey);
});

test('the build catches an omitted module before creating a release', (t) => {
  const checkout = cleanCopy(t);
  fs.rmSync(path.join(checkout, 'src/editor.js'));
  const result = run(checkout, 'scripts/build.cjs');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unpackaged import/);
});

test('static serving permits frontend modules but never exposes backend code or private state', () => {
  assert.equal(safeFile('src/storage/repository.js'), true);
  assert.equal(safeFile('assets/moodboard-study.png'), true);
  assert.equal(safeFile('assets/pdfjs/pdf-worker.mjs'), true);
  assert.equal(safeFile('assets/pdfjs/wasm/openjpeg.wasm'), true);
  assert.equal(safeFile('assets/unrelated.mjs'), false);
  assert.equal(safeFile('assets/pdfjs/../../server.cjs'), false);
  for (const name of [
    'src/../../updater.cjs',
    'lib/updates/files.cjs',
    'src/.secret.js',
    'src/test.cjs',
    '.sparkboard/keys/sandbox-private.pem',
  ])
    assert.equal(safeFile(name), false);
});
