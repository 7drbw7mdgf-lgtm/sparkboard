'use strict';
const crypto = require('node:crypto');
const MAX_PACKAGE = 24 * 1024 * 1024;
const MAX_FILES = 12 * 1024 * 1024;
const REQUIRED = ['index.html', 'app.js', 'board-model.js', 'style.css'];
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const validVersion = (v) =>
  typeof v === 'string' && /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})$/.test(v);
function compareVersions(a, b) {
  if (!validVersion(a) || !validVersion(b)) throw Error('Unsupported release version.');
  let aa = a.split('.').map(Number),
    bb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] > bb[i] ? 1 : -1;
  return 0;
}
function safeFile(name) {
  return (
    typeof name === 'string' &&
    name.length < 180 &&
    !name.includes('..') &&
    !name.includes('\\') &&
    !name.startsWith('/') &&
    (REQUIRED.includes(name) ||
      /^src\/(?:[a-z\d_-]+\/)*[a-z\d_-]+\.js$/i.test(name) ||
      /^assets\/[a-z\d_/-]+\.(?:png|jpe?g|webp|gif|svg|woff2?)$/i.test(name) ||
      /^assets\/pdfjs\/(?:[a-z\d_-]+\/)*[a-z\d_-]+\.(?:mjs|js|wasm|ttf|pfb|bcmap|txt)$/i.test(name))
  );
}
function base64(value) {
  if (
    typeof value !== 'string' ||
    !value.length ||
    value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  )
    throw Error('Invalid package encoding.');
  return Buffer.from(value, 'base64');
}
function signPackage(manifest, key) {
  const payload = Buffer.from(JSON.stringify(manifest));
  return Buffer.from(
    JSON.stringify({
      format: 'sparkboard-signed-release-v1',
      payload: payload.toString('base64'),
      signature: crypto.sign(null, payload, key).toString('base64'),
    }),
  );
}
function verifyPackage(bytes, publicKey, expectedVersion) {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  if (bytes.length > MAX_PACKAGE) throw Error('The update package is too large.');
  let envelope;
  try {
    envelope = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw Error('The release is not a valid update package.');
  }
  if (envelope.format !== 'sparkboard-signed-release-v1')
    throw Error('This is not a signed Sparkboard release.');
  const payload = base64(envelope.payload),
    signature = base64(envelope.signature);
  if (signature.length !== 64 || !crypto.verify(null, payload, publicKey, signature))
    throw Error('The publisher signature could not be verified.');
  const manifest = JSON.parse(payload.toString('utf8'));
  if (
    manifest.appId !== 'sparkboard' ||
    !validVersion(manifest.version) ||
    manifest.version !== expectedVersion ||
    ![1, 2].includes(manifest.minUpdaterVersion)
  )
    throw Error('This update is not compatible with Sparkboard.');
  if (!Array.isArray(manifest.files) || manifest.files.length < 4 || manifest.files.length > 512)
    throw Error('The update has an invalid file list.');
  let total = 0;
  const seen = new Set(),
    files = [];
  for (const file of manifest.files) {
    if (!safeFile(file.path) || seen.has(file.path))
      throw Error('The update contains an unsupported file path.');
    seen.add(file.path);
    const content = base64(file.content);
    total += content.length;
    if (total > MAX_FILES || !/^([a-f0-9]{64})$/.test(file.sha256) || hash(content) !== file.sha256)
      throw Error('An update file failed its checksum check.');
    files.push({
      path: file.path,
      content,
      sha256: file.sha256,
    });
  }
  if (!REQUIRED.every((name) => seen.has(name)))
    throw Error('The update is missing required app files.');
  return {
    version: manifest.version,
    notes: String(manifest.notes || '').slice(0, 10000),
    files,
  };
}
module.exports = {
  MAX_PACKAGE,
  MAX_FILES,
  REQUIRED,
  hash,
  validVersion,
  compareVersions,
  safeFile,
  base64,
  signPackage,
  verifyPackage,
};
