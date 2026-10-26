'use strict';
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { fetchBytes, repoName, permittedURL } = require('./lib/updates/github.cjs');
const { readJSON, atomicJSON } = require('./lib/updates/files.cjs');
const {
  validVersion,
  REQUIRED,
  safeFile,
  hash,
  base64,
  verifyPackage,
  MAX_PACKAGE,
  compareVersions,
  signPackage,
} = require('./lib/updates/package.cjs');
class Updater {
  constructor(root, { fetcher = fetchBytes, dataDir } = {}) {
    this.root = root;
    this.dir = dataDir || path.join(root, '.sparkboard');
    this.file = path.join(this.dir, 'update-state.json');
    this.baseVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version;
    this.fetcher = fetcher;
    this.settings = {
      source: 'sandbox',
      repository: '',
      active: null,
      previous: null,
      hasRollback: false,
      lastChecked: null,
      ...readJSON(this.file, {}),
    };
    if (!['sandbox', 'github'].includes(this.settings.source)) this.settings.source = 'sandbox';
    this.candidate = null;
    this.staged = null;
    this.phase = 'idle';
    this.error = null;
    this.progress = {
      downloaded: 0,
      total: null,
    };
    this.busy = false;
    this.controller = null;
    this.recover();
  }
  verificationKey(source) {
    const sandboxKey = path.join(this.dir, 'sandbox', 'public-key.pem');
    return fs.readFileSync(
      source === 'sandbox' && fs.existsSync(sandboxKey)
        ? sandboxKey
        : path.join(this.root, 'update-public-key.pem'),
    );
  }
  persist() {
    atomicJSON(this.file, this.settings);
  }
  releaseRoot(id) {
    if (typeof id !== 'string' || !/^release-[a-f0-9-]{36}$/.test(id))
      throw Error('Invalid installed release.');
    return path.join(this.dir, 'versions', id);
  }
  recover() {
    if (this.settings.active) {
      try {
        const installed = this.verifyInstalled(this.settings.active);
        if (compareVersions(installed.version, this.baseVersion) <= 0) {
          this.settings.active = null;
          this.settings.previous = null;
          this.settings.hasRollback = false;
          this.persist();
        }
      } catch {
        this.settings.active = null;
        this.settings.previous = null;
        this.settings.hasRollback = false;
        this.persist();
        this.error =
          'The installed update was incomplete. Sparkboard restored the bundled version.';
      }
    }
  }
  verifyInstalled(id) {
    const dir = this.releaseRoot(id),
      meta = readJSON(path.join(dir, 'release.json'), null);
    if (
      !meta ||
      !validVersion(meta.version) ||
      !Array.isArray(meta.files) ||
      !REQUIRED.every((f) => meta.files.some((x) => x.path === f))
    )
      throw Error('The installed update is incomplete.');
    for (const f of meta.files) {
      if (!safeFile(f.path) || hash(fs.readFileSync(path.join(dir, f.path))) !== f.sha256)
        throw Error('The staged files changed after verification.');
    }
    return meta;
  }
  currentVersion() {
    return this.settings.active
      ? this.verifyInstalled(this.settings.active).version
      : this.baseVersion;
  }
  publicRoot() {
    return this.settings.active ? this.releaseRoot(this.settings.active) : this.root;
  }
  info() {
    let current = this.currentVersion();
    return {
      currentVersion: current,
      baseVersion: this.baseVersion,
      source: this.settings.source,
      repository: this.settings.repository,
      phase: this.phase,
      error: this.error,
      progress: this.progress,
      busy: this.busy,
      lastChecked: this.settings.lastChecked,
      available: this.candidate
        ? {
            version: this.candidate.version,
            notes: this.candidate.notes,
            size: this.candidate.size,
            url: this.candidate.pageURL,
          }
        : null,
      ready: !!this.staged,
      hasRollback: this.settings.hasRollback,
      rollbackVersion: this.settings.hasRollback
        ? this.settings.previous
          ? this.verifyInstalled(this.settings.previous).version
          : this.baseVersion
        : null,
      sandboxReady: fs.existsSync(path.join(this.dir, 'sandbox', 'sparkboard-update.json')),
    };
  }
  configure({ source, repository }) {
    if (this.busy) throw Error('An update is already in progress.');
    if (!['sandbox', 'github'].includes(source)) throw Error('Choose Sandbox or GitHub.');
    const next = {
        ...this.settings,
        source,
        repository: source === 'github' ? repoName(repository) : this.settings.repository,
      },
      old = this.settings;
    this.settings = next;
    try {
      this.persist();
    } catch (error) {
      this.settings = old;
      throw error;
    }
    this.candidate = null;
    this.staged = null;
    this.phase = 'idle';
    this.error = null;
    return this.info();
  }
  async operation(phase, fn) {
    if (this.busy) throw Error('An update is already in progress.');
    this.busy = true;
    this.phase = phase;
    this.error = null;
    this.controller = new AbortController();
    let timeout = setTimeout(() => this.controller?.abort(), 30000);
    try {
      const result = await fn(this.controller.signal);
      return result;
    } catch (error) {
      this.phase = 'error';
      this.error =
        error.name === 'AbortError'
          ? 'Update cancelled or timed out. Please try again.'
          : error.message;
      throw Error(this.error);
    } finally {
      clearTimeout(timeout);
      this.busy = false;
      this.controller = null;
    }
  }
  async check() {
    await this.operation('checking', async (signal) => {
      this.candidate = null;
      this.staged = null;
      this.progress = {
        downloaded: 0,
        total: null,
      };
      let candidate;
      if (this.settings.source === 'sandbox') {
        const file = path.join(this.dir, 'sandbox', 'sparkboard-update.json');
        if (!fs.existsSync(file))
          throw Error('The sandbox release has not been prepared. Run npm run sandbox:prepare.');
        const bytes = fs.readFileSync(file),
          envelope = JSON.parse(bytes),
          raw = JSON.parse(base64(envelope.payload));
        if (!validVersion(raw.version)) throw Error('Invalid sandbox version.');
        const parsed = verifyPackage(
          bytes,
          this.verificationKey(this.settings.source),
          raw.version,
        );
        candidate = {
          version: parsed.version,
          notes: parsed.notes,
          size: bytes.length,
          file,
          source: 'sandbox',
        };
      } else {
        const repo = repoName(this.settings.repository);
        const bytes = await this.fetcher(`https://api.github.com/repos/${repo}/releases/latest`, {
          signal,
          max: 1024 * 1024,
        });
        let release = JSON.parse(bytes);
        const version = String(release.tag_name || '').replace(/^v/, '');
        if (!validVersion(version) || release.draft || release.prerelease)
          throw Error('No supported stable Sparkboard release was found.');
        const asset = release.assets?.find(
          (a) => a.name === 'sparkboard-update.json' && a.state === 'uploaded',
        );
        if (!asset) throw Error('This release has no sparkboard-update.json asset.');
        const url = permittedURL(asset.browser_download_url);
        if (
          url.hostname !== 'github.com' ||
          url.pathname !==
            `/${repo}/releases/download/${release.tag_name}/sparkboard-update.json` ||
          url.search ||
          url.hash
        )
          throw Error('The release asset does not belong to the configured repository.');
        if (asset.size > MAX_PACKAGE) throw Error('The release package is too large.');
        candidate = {
          version,
          notes: String(release.body || '').slice(0, 10000),
          size: asset.size,
          url: url.href,
          pageURL: `https://github.com/${repo}/releases/tag/${release.tag_name}`,
          digest: asset.digest,
          source: 'github',
        };
      }
      if (compareVersions(candidate.version, this.currentVersion()) > 0) this.candidate = candidate;
      this.settings.lastChecked = new Date().toISOString();
      this.persist();
      this.phase = this.candidate ? 'available' : 'current';
    });
    return this.info();
  }
  async download() {
    if (!this.candidate) throw Error('Check for an update first.');
    await this.operation('downloading', async (signal) => {
      const candidate = this.candidate;
      let bytes;
      const progress = (downloaded, total) => {
        this.progress = {
          downloaded,
          total,
        };
      };
      if (candidate.source === 'sandbox') {
        bytes = fs.readFileSync(candidate.file);
        progress(bytes.length, bytes.length);
      } else
        bytes = await this.fetcher(candidate.url, {
          signal,
          onProgress: progress,
        });
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (candidate.digest && candidate.digest !== `sha256:${hash(bytes)}`)
        throw Error('The release package failed GitHub’s checksum check.');
      this.phase = 'verifying';
      const verified = verifyPackage(
          bytes,
          this.verificationKey(this.settings.source),
          candidate.version,
        ),
        id = 'release-' + crypto.randomUUID(),
        dir = this.releaseRoot(id);
      fs.mkdirSync(dir, {
        recursive: true,
        mode: 0o700,
      });
      try {
        for (const file of verified.files) {
          const output = path.join(dir, file.path);
          fs.mkdirSync(path.dirname(output), {
            recursive: true,
          });
          fs.writeFileSync(output, file.content, {
            flag: 'wx',
            mode: 0o600,
          });
        }
        atomicJSON(path.join(dir, 'release.json'), {
          version: verified.version,
          files: verified.files.map((f) => ({
            path: f.path,
            sha256: f.sha256,
          })),
          verified: true,
        });
        this.verifyInstalled(id);
        this.staged = {
          id,
          version: verified.version,
        };
        this.phase = 'ready';
      } catch (error) {
        fs.rmSync(dir, {
          recursive: true,
          force: true,
        });
        throw error;
      }
    });
    return this.info();
  }
  install() {
    if (this.busy) throw Error('Wait for the current operation to finish.');
    if (!this.staged) throw Error('Download and verify an update first.');
    this.verifyInstalled(this.staged.id);
    if (compareVersions(this.staged.version, this.currentVersion()) <= 0)
      throw Error('This update is no longer newer than the installed version.');
    const previous = {
      ...this.settings,
    };
    try {
      this.settings.previous = this.settings.active;
      this.settings.active = this.staged.id;
      this.settings.hasRollback = true;
      this.persist();
    } catch (error) {
      this.settings = previous;
      throw error;
    }
    this.staged = null;
    this.candidate = null;
    this.phase = 'installed';
    this.error = null;
    return this.info();
  }
  rollback() {
    if (this.busy) throw Error('Wait for the current operation to finish.');
    if (!this.settings.hasRollback) throw Error('There is no previous version to restore.');
    if (this.settings.previous) this.verifyInstalled(this.settings.previous);
    const original = {
      ...this.settings,
    };
    try {
      [this.settings.active, this.settings.previous] = [
        this.settings.previous,
        this.settings.active,
      ];
      this.persist();
    } catch (error) {
      this.settings = original;
      throw error;
    }
    this.staged = null;
    this.candidate = null;
    this.phase = 'restored';
    this.error = null;
    return this.info();
  }
  resetSandbox() {
    if (this.settings.source !== 'sandbox' || this.busy)
      throw Error('Reset is available only in an idle sandbox.');
    const old = {
      ...this.settings,
    };
    try {
      Object.assign(this.settings, {
        active: null,
        previous: null,
        hasRollback: false,
        lastChecked: null,
      });
      this.persist();
    } catch (error) {
      this.settings = old;
      throw error;
    }
    this.staged = null;
    this.candidate = null;
    this.phase = 'idle';
    this.error = null;
    return this.info();
  }
  cancel() {
    this.controller?.abort();
    return {
      cancelled: true,
    };
  }
}
module.exports = {
  Updater,
  compareVersions,
  repoName,
  safeFile,
  signPackage,
  verifyPackage,
  hash,
  atomicJSON,
  fetchBytes,
  REQUIRED,
  MAX_PACKAGE,
};
