'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { hash, signPackage, validVersion } = require('../lib/updates/package.cjs');
const { collectPublicFiles } = require('../lib/public-files.cjs');
const DEFAULT_ROOT = path.resolve(__dirname, '..');

function generateKeys(privateFile, publicFile) {
  fs.mkdirSync(path.dirname(privateFile), { recursive: true, mode: 0o700 });
  fs.mkdirSync(path.dirname(publicFile), { recursive: true, mode: 0o700 });
  const keys = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(privateFile, keys.privateKey.export({ type: 'pkcs8', format: 'pem' }), {
    flag: 'wx',
    mode: 0o600,
  });
  fs.writeFileSync(publicFile, keys.publicKey.export({ type: 'spki', format: 'pem' }), {
    flag: 'wx',
    mode: 0o644,
  });
}

/** A disposable local sandbox never changes the tracked publisher trust anchor. */
function sandboxKeys(root) {
  const privateFile = path.join(root, '.sparkboard/keys/sandbox-private.pem');
  const publicFile = path.join(root, '.sparkboard/sandbox/public-key.pem');
  if (!fs.existsSync(privateFile)) {
    // A fresh clone has no local sandbox key. Its publisher public key is irrelevant here.
    fs.rmSync(publicFile, { force: true });
    generateKeys(privateFile, publicFile);
  } else if (!fs.existsSync(publicFile)) {
    fs.mkdirSync(path.dirname(publicFile), { recursive: true });
    fs.writeFileSync(
      publicFile,
      crypto.createPublicKey(fs.readFileSync(privateFile)).export({ type: 'spki', format: 'pem' }),
    );
  }
  return { privateFile, publicFile };
}

function publisherKeys(root, suppliedPrivateFile) {
  const privateFile =
    suppliedPrivateFile || path.join(root, '.sparkboard/keys/release-private.pem');
  const publicFile = path.join(root, 'update-public-key.pem');
  if (!fs.existsSync(privateFile)) {
    throw new Error(
      'Publisher signing requires the matching private key. Use --key /path/to/key.pem. Local builds only need npm run build.',
    );
  }
  const derived = crypto
    .createPublicKey(fs.readFileSync(privateFile))
    .export({ type: 'spki', format: 'pem' })
    .toString();
  if (!fs.existsSync(publicFile) || fs.readFileSync(publicFile, 'utf8') !== derived) {
    throw new Error(
      'The publisher private key does not match update-public-key.pem. The tracked public key was not changed.',
    );
  }
  return { privateFile, publicFile };
}

function ensureKeys(root = DEFAULT_ROOT) {
  return sandboxKeys(root);
}

function build({
  version,
  notes = 'Sparkboard app update.',
  sandbox = false,
  root = DEFAULT_ROOT,
  key,
}) {
  if (!validVersion(version)) throw new Error('Use a numeric version such as 1.2.1.');
  const keys = sandbox ? sandboxKeys(root) : publisherKeys(root, key);
  const files = collectPublicFiles(root).map((filename) => {
    let content = fs.readFileSync(path.join(root, filename));
    if (sandbox && filename === 'index.html') {
      content = Buffer.from(
        content
          .toString()
          .replace('</head>', `<meta name="sparkboard-build" content="sandbox-${version}"></head>`),
      );
    }
    return { path: filename, sha256: hash(content), content: content.toString('base64') };
  });
  const bytes = signPackage(
    { appId: 'sparkboard', version, minUpdaterVersion: 2, notes, files },
    fs.readFileSync(keys.privateFile),
  );
  const directory = path.join(root, '.sparkboard', sandbox ? 'sandbox' : `releases/${version}`);
  fs.mkdirSync(directory, { recursive: true });
  const output = path.join(directory, 'sparkboard-update.json');
  fs.writeFileSync(output, bytes, { mode: 0o600 });
  return output;
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
    if (args.includes('--keygen')) {
      sandboxKeys(DEFAULT_ROOT);
      console.log('Local sandbox keys are ready. Publisher signing keys were not changed.');
    } else {
      const sandbox = args.includes('--sandbox');
      const base = require('../package.json').version.split('.').map(Number);
      const version = option('--version') || `${base[0]}.${base[1]}.${base[2] + 1}`;
      const notes = option('--notes')
        ? fs.readFileSync(option('--notes'), 'utf8')
        : sandbox
          ? 'A local rehearsal of download, verified install and rollback.\nYour boards stay on this device. No GitHub requests are made.'
          : undefined;
      const output = build({ version, notes, sandbox, key: option('--key') });
      console.log(`${sandbox ? 'Sandbox' : 'Publisher'} release ${version} prepared.`);
      console.log(output);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { build, ensureKeys, sandboxKeys, publisherKeys };
