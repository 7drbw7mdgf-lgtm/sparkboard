'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  { Readable } = require('node:stream');
const {
  Updater,
  signPackage,
  verifyPackage,
  hash,
  repoName,
  compareVersions,
  REQUIRED,
} = require('./updater.cjs');
const { createServer } = require('./server.cjs');
function setup(t, { version = '1.1.1', fetcher } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sparkboard-update-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const keys = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(
    path.join(root, 'update-public-key.pem'),
    keys.publicKey.export({ type: 'spki', format: 'pem' }),
  );
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '1.1.0' }));
  fs.writeFileSync(path.join(root, 'update-client.js'), '/* updater */');
  fs.writeFileSync(path.join(root, 'update-client.css'), '/* updater */');
  for (const file of REQUIRED)
    fs.writeFileSync(
      path.join(root, file),
      file === 'index.html' ? '<html><head></head><body>original</body></html>' : 'original',
    );
  const manifest = {
      appId: 'sparkboard',
      version,
      minUpdaterVersion: 1,
      notes: 'A verified release.',
      files: REQUIRED.map((file) => {
        let content = Buffer.from(
          file === 'index.html'
            ? '<html><head></head><body>updated</body></html>'
            : 'updated ' + file,
        );
        return { path: file, content: content.toString('base64'), sha256: hash(content) };
      }),
    },
    bytes = signPackage(manifest, keys.privateKey),
    sandbox = path.join(root, '.sparkboard', 'sandbox');
  fs.mkdirSync(sandbox, { recursive: true });
  fs.writeFileSync(path.join(sandbox, 'sparkboard-update.json'), bytes);
  return { root, keys, manifest, bytes, updater: new Updater(root, { fetcher }) };
}
test('numeric versions and repository URLs are normalized', () => {
  assert.equal(compareVersions('1.10.0', '1.9.9'), 1);
  assert.equal(repoName('https://github.com/example/sparkboard.git'), 'example/sparkboard');
  for (const bad of [
    'https://evil.test/a/b',
    'https://github.com/a/b?token=x',
    'a/../b',
    'https://github.com/a/b/tree/main',
  ])
    assert.throws(() => repoName(bad));
});
test('a signed package verifies exact bytes and all required files', (t) => {
  let f = setup(t),
    verified = verifyPackage(f.bytes, f.keys.publicKey, '1.1.1');
  assert.equal(verified.version, '1.1.1');
  assert.equal(verified.files.length, 4);
  let envelope = JSON.parse(f.bytes);
  envelope.payload = Buffer.from(JSON.stringify({ ...f.manifest, notes: 'tampered' })).toString(
    'base64',
  );
  assert.throws(
    () => verifyPackage(Buffer.from(JSON.stringify(envelope)), f.keys.publicKey, '1.1.1'),
    /signature/,
  );
});
test('unknown signing keys, wrong applications and mismatched release versions are rejected', (t) => {
  let f = setup(t),
    other = crypto.generateKeyPairSync('ed25519');
  assert.throws(() => verifyPackage(f.bytes, other.publicKey, '1.1.1'), /signature/);
  assert.throws(
    () =>
      verifyPackage(
        signPackage({ ...f.manifest, appId: 'other' }, f.keys.privateKey),
        f.keys.publicKey,
        '1.1.1',
      ),
    /compatible/,
  );
  assert.throws(() => verifyPackage(f.bytes, f.keys.publicKey, '1.2.0'), /compatible/);
});
test('unsafe paths, missing files and file checksum changes are rejected even when signed', (t) => {
  let f = setup(t);
  for (const filePath of [
    '../server.cjs',
    'server.cjs',
    '.sparkboard/keys/private.pem',
    '/tmp/app.js',
    'assets/../../outside.png',
  ]) {
    let files = [
      ...f.manifest.files,
      { path: filePath, content: Buffer.from('x').toString('base64'), sha256: hash('x') },
    ];
    assert.throws(
      () =>
        verifyPackage(
          signPackage({ ...f.manifest, files }, f.keys.privateKey),
          f.keys.publicKey,
          '1.1.1',
        ),
      /path/,
    );
  }
  assert.throws(() =>
    verifyPackage(
      signPackage({ ...f.manifest, files: f.manifest.files.slice(0, 3) }, f.keys.privateKey),
      f.keys.publicKey,
      '1.1.1',
    ),
  );
  let files = structuredClone(f.manifest.files);
  files[0].sha256 = '0'.repeat(64);
  assert.throws(
    () =>
      verifyPackage(
        signPackage({ ...f.manifest, files }, f.keys.privateKey),
        f.keys.publicKey,
        '1.1.1',
      ),
    /checksum/,
  );
});
test('sandbox check, download, install, restart and rollback preserve the bundled app and board data', async (t) => {
  let f = setup(t),
    u = f.updater;
  fs.writeFileSync(path.join(f.root, 'user-boards.json'), 'leave my boards alone');
  assert.equal((await u.check()).phase, 'available');
  assert.equal((await u.download()).ready, true);
  assert.equal(u.install().currentVersion, '1.1.1');
  assert.notEqual(u.publicRoot(), f.root);
  assert.equal(fs.readFileSync(path.join(f.root, 'app.js'), 'utf8'), 'original');
  let restarted = new Updater(f.root);
  assert.equal(restarted.info().currentVersion, '1.1.1');
  assert.equal(restarted.rollback().currentVersion, '1.1.0');
  assert.equal(
    fs.readFileSync(path.join(f.root, 'user-boards.json'), 'utf8'),
    'leave my boards alone',
  );
  assert.equal(restarted.publicRoot(), f.root);
});
test('modified staged files cannot be installed', async (t) => {
  let f = setup(t),
    u = f.updater;
  await u.check();
  await u.download();
  fs.writeFileSync(path.join(u.releaseRoot(u.staged.id), 'app.js'), 'tampered');
  assert.throws(() => u.install(), /changed/);
  assert.equal(u.currentVersion(), '1.1.0');
});
test('an incomplete active update recovers to the bundled app on restart', async (t) => {
  let f = setup(t),
    u = f.updater;
  await u.check();
  await u.download();
  u.install();
  fs.unlinkSync(path.join(u.publicRoot(), 'app.js'));
  let recovered = new Updater(f.root);
  assert.equal(recovered.currentVersion(), '1.1.0');
  assert.match(recovered.info().error, /restored/);
});
test('sandbox reset restores the base version without removing board data', async (t) => {
  let f = setup(t),
    u = f.updater;
  await u.check();
  await u.download();
  u.install();
  let info = u.resetSandbox();
  assert.equal(info.currentVersion, '1.1.0');
  assert.equal(info.hasRollback, false);
  assert.equal(info.ready, false);
});
test('an equal or older release is up to date and cannot be downloaded', async (t) => {
  let f = setup(t, { version: '1.1.0' });
  assert.equal((await f.updater.check()).phase, 'current');
  await assert.rejects(f.updater.download(), /Check/);
});
function metadata(
  bytes,
  {
    url = 'https://github.com/example/sparkboard/releases/download/v1.1.1/sparkboard-update.json',
    digest = `sha256:${hash(bytes)}`,
  } = {},
) {
  return Buffer.from(
    JSON.stringify({
      tag_name: 'v1.1.1',
      body: 'New features',
      draft: false,
      prerelease: false,
      assets: [
        {
          name: 'sparkboard-update.json',
          state: 'uploaded',
          browser_download_url: url,
          size: bytes.length,
          digest,
        },
      ],
    }),
  );
}
test('GitHub latest-release flow validates the repository asset and pinned signing key', async (t) => {
  let f = setup(t),
    requests = [];
  f.updater.fetcher = async (url, options) => {
    requests.push(url);
    if (url.endsWith('/releases/latest')) return metadata(f.bytes);
    options.onProgress(f.bytes.length, f.bytes.length);
    return f.bytes;
  };
  f.updater.configure({ source: 'github', repository: 'example/sparkboard' });
  assert.equal((await f.updater.check()).available.version, '1.1.1');
  assert.equal((await f.updater.download()).ready, true);
  assert.equal(requests.length, 2);
  assert.equal(f.updater.install().source, 'github');
});
test('a GitHub release cannot redirect to a different repository or install a corrupt asset', async (t) => {
  let f = setup(t);
  f.updater.configure({ source: 'github', repository: 'example/sparkboard' });
  f.updater.fetcher = async () =>
    metadata(f.bytes, {
      url: 'https://github.com/attacker/other/releases/download/v1.1.1/sparkboard-update.json',
    });
  await assert.rejects(f.updater.check(), /configured repository/);
  f.updater.fetcher = async (url) =>
    url.endsWith('/releases/latest')
      ? metadata(f.bytes, { digest: 'sha256:' + '0'.repeat(64) })
      : f.bytes;
  await f.updater.check();
  await assert.rejects(f.updater.download(), /checksum/);
  assert.equal(f.updater.currentVersion(), '1.1.0');
});
test('invalid configuration leaves the existing update source unchanged', (t) => {
  let f = setup(t);
  assert.throws(() => f.updater.configure({ source: 'github', repository: 'invalid' }));
  assert.equal(f.updater.info().source, 'sandbox');
});
test('cancel aborts an active operation and a second operation cannot overlap', async (t) => {
  let f = setup(t);
  f.updater.configure({ source: 'github', repository: 'example/sparkboard' });
  f.updater.fetcher = async (url, { signal }) =>
    new Promise((resolve, reject) =>
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
        once: true,
      }),
    );
  let checking = f.updater.check();
  await assert.rejects(f.updater.check(), /already/);
  f.updater.cancel();
  await assert.rejects(checking, /cancelled/);
  assert.equal(f.updater.busy, false);
});
async function request(
  server,
  { method = 'GET', url = '/api/updates/status', headers = {}, body = {} } = {},
) {
  return new Promise((resolve, reject) => {
    let req = Readable.from(method === 'POST' ? [Buffer.from(JSON.stringify(body))] : []);
    Object.assign(req, { method, url, headers: { host: 'localhost:3000', ...headers } });
    let status, replyHeaders;
    const res = {
      writeHead(code, value) {
        status = code;
        replyHeaders = value;
        return res;
      },
      end(value) {
        const text = value?.toString() || '';
        resolve({ status, headers: replyHeaders, text, json: () => JSON.parse(text) });
      },
    };
    server.emit('request', req, res);
  });
}
test('update endpoints enforce local hosts, same origin and a per-process request token', async (t) => {
  let f = setup(t),
    { server } = createServer(f.root, { updater: f.updater });
  assert.equal((await request(server, { headers: { host: 'evil.test' } })).status, 403);
  assert.equal((await request(server, { headers: { origin: 'https://evil.test' } })).status, 403);
  let info = (await request(server)).json();
  assert.ok(info.csrfToken);
  assert.equal(
    (
      await request(server, {
        method: 'POST',
        url: '/api/updates/install',
        headers: { 'content-type': 'application/json' },
      })
    ).status,
    403,
  );
  let valid = await request(server, {
    method: 'POST',
    url: '/api/updates/check',
    headers: {
      'content-type': 'application/json',
      'x-sparkboard-token': info.csrfToken,
      origin: 'http://localhost:3000',
    },
  });
  assert.equal(valid.status, 200);
  assert.equal(valid.json().phase, 'available');
});
test('HTTP serving injects the persistent updater and never exposes runtime state or signing keys', async (t) => {
  let f = setup(t),
    { server } = createServer(f.root, { updater: f.updater });
  let page = await request(server, { url: '/' });
  assert.equal(page.status, 200);
  assert.match(page.text, /_system\/update-client.js/);
  for (const url of [
    '/.sparkboard/update-state.json',
    '/update-public-key.pem',
    '/server.cjs',
    '/../package.json',
  ])
    assert.equal((await request(server, { url })).status, 404);
  assert.equal((await request(server, { url: '/_system/update-client.js' })).status, 200);
});
test('desktop updates are written outside the immutable app resources', async (t) => {
  let f = setup(t),
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sparkboard-desktop-data-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dataDir, 'sandbox'));
  fs.writeFileSync(path.join(dataDir, 'sandbox', 'sparkboard-update.json'), f.bytes);
  let u = new Updater(f.root, { dataDir });
  await u.check();
  await u.download();
  u.install();
  assert.ok(u.publicRoot().startsWith(dataDir));
  assert.ok(fs.existsSync(path.join(dataDir, 'update-state.json')));
  assert.equal(fs.existsSync(path.join(f.root, '.sparkboard', 'update-state.json')), false);
  assert.equal(fs.readFileSync(path.join(f.root, 'app.js'), 'utf8'), 'original');
});
test('desktop readiness endpoint is bound to its launch token', async (t) => {
  let f = setup(t),
    { server } = createServer(f.root, { updater: f.updater, healthToken: 'test-launch-token' }),
    reply = await request(server, { url: '/_desktop/health' });
  assert.equal(reply.status, 200);
  assert.deepEqual(reply.json(), {
    app: 'sparkboard',
    token: 'test-launch-token',
    version: '1.1.0',
  });
});

test('a newer bundled app takes precedence over an older installed web release', async (t) => {
  const fixture = setup(t),
    updater = fixture.updater;
  await updater.check();
  await updater.download();
  updater.install();
  fs.writeFileSync(path.join(fixture.root, 'package.json'), JSON.stringify({ version: '1.2.0' }));
  const restarted = new Updater(fixture.root);
  assert.equal(restarted.currentVersion(), '1.2.0');
  assert.equal(restarted.publicRoot(), fixture.root);
  assert.equal(restarted.info().hasRollback, false);
});

test('desktop updater defaults to GitHub releases for 7drbw7mdgf-lgtm/sparkboard with auto-download preferences', async (t) => {
  const fixture = setup(t),
    updater = new Updater(fixture.root, { defaultSource: 'github' }),
    { server } = createServer(fixture.root, { updater });
  let info = (await request(server)).json();
  assert.equal(info.source, 'github');
  assert.equal(info.repository, '7drbw7mdgf-lgtm/sparkboard');
  assert.equal(info.autoDownload, true);
  let pref = await request(server, {
    method: 'POST',
    url: '/api/updates/preferences',
    headers: {
      'content-type': 'application/json',
      'x-sparkboard-token': info.csrfToken,
      origin: 'http://localhost:3000',
    },
    body: { autoDownload: false },
  });
  assert.equal(pref.status, 200);
  assert.equal(pref.json().autoDownload, false);
});
