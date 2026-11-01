/**
 * Account-owned, offline-first board sync using the public Supabase REST API.
 * Writes use conditional versions: simultaneous edits become recoverable copies,
 * not silent last-writer-wins overwrites. No service-role credential is used.
 */
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const MAX_BOARD_BYTES = 7 * 1024 * 1024;
const PAGE_SIZE = 200;

export function syncDecision(local, remote, marker) {
  if (remote?.deleted)
    return local && (!marker || local.updated > marker.updated) ? 'fork-delete' : 'delete';
  if (!remote) return local ? 'insert' : 'none';
  if (!local) return 'pull';
  if (!marker) return 'fork-pull';
  if (remote.version !== marker.version)
    return local.updated > marker.updated ? 'fork-pull' : 'pull';
  return local.updated > marker.updated ? 'push' : 'none';
}

function portable(board, userId) {
  const { revision, writer, mediaIds, ...clean } = structuredClone(board);
  clean.cloudOwner = userId;
  if (!UUID.test(clean.id) || !Array.isArray(clean.objects)) throw Error('Invalid board identity.');
  const encoded = JSON.stringify(clean);
  if (new TextEncoder().encode(encoded).length > MAX_BOARD_BYTES)
    throw Error(
      'A board exceeds the 7 MB cloud-sync limit. It is still saved locally; reduce large attachments or export a backup.',
    );
  return clean;
}

export class CloudSync {
  constructor({
    url,
    key,
    auth,
    access,
    storage = globalThis.localStorage,
    request = globalThis.fetch,
    onStatus = () => {},
  }) {
    this.url = url;
    this.key = key;
    this.auth = auth;
    this.access = access;
    this.storage = storage;
    this.request = request;
    this.onStatus = onStatus;
    this.userId = null;
    this.enabled = false;
    this.busy = null;
    this.timer = null;
    this.poll = null;
    this.controller = null;
    this.epoch = 0;
    this.meta = {};
    this.status = 'Local only';
  }

  prefKey(id) {
    return 'sparkboard.cloud.enabled.' + id;
  }
  metaKey(id) {
    return 'sparkboard.cloud.meta.' + id;
  }
  setStatus(message) {
    this.status = message;
    this.onStatus(message);
  }
  persist() {
    if (this.userId) this.storage.setItem(this.metaKey(this.userId), JSON.stringify(this.meta));
  }

  configure(userId) {
    if (!UUID.test(userId)) throw Error('Invalid account identity.');
    this.stop();
    this.userId = userId;
    try {
      this.meta = JSON.parse(this.storage.getItem(this.metaKey(userId)) || '{}');
      if (!this.meta || typeof this.meta !== 'object' || Array.isArray(this.meta)) this.meta = {};
    } catch {
      this.meta = {};
    }
    this.enabled = this.storage.getItem(this.prefKey(userId)) === 'yes';
    if (this.enabled) {
      this.setStatus('Cloud sync starting…');
      this.poll = setInterval(() => this.sync().catch(() => {}), 30000);
      this.sync().catch(() => {});
    } else {
      this.setStatus('Cloud sync off · local boards only');
    }
  }

  disable() {
    if (!this.userId) return;
    const id = this.userId;
    this.storage.removeItem(this.prefKey(id));
    this.stop();
    this.userId = id;
    this.setStatus('Cloud sync paused on this browser');
  }

  stop() {
    this.epoch++;
    this.controller?.abort();
    clearTimeout(this.timer);
    clearInterval(this.poll);
    this.timer = this.poll = null;
    this.controller = null;
    this.busy = null;
    this.enabled = false;
    this.userId = null;
    this.setStatus('Local only');
  }

  async enable() {
    if (!this.userId) throw Error('Sign in before enabling sync.');
    const account = this.userId, epoch = this.epoch;
    const assertAccount = () => {
      if (this.userId !== account || this.epoch !== epoch)
        throw Error('Account changed during sync setup; try again after signing in.');
    };
    // Fail closed if the SQL migration has not been installed.
    await this.rows();
    assertAccount();
    await this.access.flush();
    assertAccount();
    for (const board of await this.access.list()) {
      assertAccount();
      if (!board.cloudOwner) {
        // Persist ownership locally before the first upload; otherwise switching
        // accounts in this browser could accidentally re-upload another user's boards.
        await this.access.claim(board.id, account);
        assertAccount();
        this.meta[board.id] ??= { adopt: true, updated: 0, version: 0 };
      }
    }
    assertAccount();
    this.storage.setItem(this.prefKey(account), 'yes');
    this.persist();
    this.enabled = true;
    this.poll = setInterval(() => this.sync().catch(() => {}), 30000);
    return this.sync();
  }

  async requestJSON(method, query, body, preference = '') {
    const account = this.userId, epoch = this.epoch;
    const { data, error } = await this.auth.getSession();
    const session = data?.session;
    if (error || !session?.access_token || !account || session.user.id !== account ||
      account !== this.userId || epoch !== this.epoch)
      throw Error('Sign-in expired. Sign in again to resume cloud sync.');
    this.controller ??= new AbortController();
    const response = await this.request(this.url + '/rest/v1/sparkboard_boards' + query, {
      method,
      signal: this.controller.signal,
      headers: {
        apikey: this.key,
        Authorization: 'Bearer ' + session.access_token,
        ...(preference ? { Prefer: preference } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      if (response.status === 404 || response.status === 401 || response.status === 403)
        throw Error(
          'Cloud sync is not configured or this account cannot access it. Install the Supabase sync migration and check RLS.',
        );
      if (response.status === 413)
        throw Error('Board is too large for cloud storage. It remains saved on this device.');
      throw Error(
        'Cloud sync request failed (HTTP ' + response.status + '). Local copies are unchanged.',
      );
    }
    const text = await response.text();
    return text ? JSON.parse(text) : [];
  }

  async rows() {
    const results = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await this.requestJSON(
        'GET',
        '?select=board_id,payload,version,deleted&owner_id=eq.' +
          encodeURIComponent(this.userId) +
          '&order=board_id.asc&limit=' +
          PAGE_SIZE +
          '&offset=' +
          offset,
      );
      if (!Array.isArray(page)) throw Error('Unexpected cloud response.');
      results.push(...page);
      if (page.length < PAGE_SIZE) return results;
      if (offset >= 20000) throw Error('Cloud board list exceeds supported pagination size.');
    }
  }

  async write(local, remote, epoch = this.epoch) {
    const account = this.userId;
    const board = await this.access.load(local.id);
    if (!account || account !== this.userId || epoch !== this.epoch)
      throw Error('Account changed during upload; no cloud changes were made.');
    const payload = portable(board, account);
    const id = encodeURIComponent(local.id),
      owner = encodeURIComponent(account);
    let rows;
    if (!remote) {
      rows = await this.requestJSON(
        'POST',
        '?on_conflict=owner_id,board_id',
        { owner_id: account, board_id: local.id, payload, version: 1, deleted: false },
        'resolution=ignore-duplicates,return=representation',
      );
    } else {
      rows = await this.requestJSON(
        'PATCH',
        '?owner_id=eq.' + owner + '&board_id=eq.' + id + '&version=eq.' + remote.version,
        { payload, version: remote.version + 1, deleted: false },
        'return=representation',
      );
    }
    if (rows.length !== 1)
      throw Error('Cloud version changed during upload. Your local edits remain safe; sync again.');
    this.meta[local.id] = { version: rows[0].version, updated: local.updated };
    this.persist();
  }

  async tombstone(id, remote, marker) {
    if (!remote) {
      delete this.meta[id];
      this.persist();
      return;
    }
    if (!marker?.version || remote.version !== marker.version)
      throw Error(
        'This board changed on another device while deletion was pending. The remote copy is preserved.',
      );
    const owner = encodeURIComponent(this.userId);
    const rows = await this.requestJSON(
      'PATCH',
      '?owner_id=eq.' +
        owner +
        '&board_id=eq.' +
        encodeURIComponent(id) +
        '&version=eq.' +
        remote.version,
      { payload: null, deleted: true, version: remote.version + 1 },
      'return=representation',
    );
    if (rows.length !== 1)
      throw Error('Board changed during deletion. Remote data was not deleted.');
    this.meta[id] = { version: rows[0].version, deleted: true, updated: Date.now() };
    this.persist();
  }

  markDeleted(id) {
    if (!this.userId) return;
    const mark = this.meta[id] || { version: 0 };
    this.meta[id] = { ...mark, deleted: true, updated: Date.now() };
    this.persist();
    this.schedule();
  }

  schedule() {
    if (!this.enabled) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync().catch(() => {}), 1600);
  }

  async sync() {
    if (!this.enabled || !this.userId) return;
    if (this.busy) return this.busy;
    if (this.access.isEditing()) return;
    const epoch = this.epoch;
    this.busy = this.reconcile(epoch)
      .catch((error) => {
        if (epoch === this.epoch) this.setStatus('Cloud sync paused: ' + error.message);
        throw error;
      })
      .finally(() => {
        if (epoch === this.epoch) {
          this.busy = null;
          this.controller = null;
        }
      });
    return this.busy;
  }

  async reconcile(epoch) {
    this.setStatus('Syncing boards…');
    await this.access.flush();
    const remoteRows = await this.rows();
    const remoteMap = new Map(remoteRows.map((row) => [row.board_id, row]));
    let localMap = new Map((await this.access.list()).map((board) => [board.id, board]));
    for (const remote of remoteRows) {
      if (epoch !== this.epoch) return;
      const id = remote.board_id;
      const local = localMap.get(id);
      const marker = this.meta[id];
      if (marker?.deleted) {
        if (remote.deleted) {
          this.meta[id] = { version: remote.version, updated: Date.now(), deleted: true };
          this.persist();
        } else if (marker.version && marker.version === remote.version) {
          await this.tombstone(id, remote, marker);
        } else {
          // A newer remote edit wins over a stale deletion intent.
          // Restore it instead of deleting another device's work.
          await this.access.import({ ...remote.payload, cloudOwner: this.userId });
          this.meta[id] = { version: remote.version, updated: remote.payload.updated };
          this.persist();
          this.setStatus('Deletion conflicted with newer cloud edits; remote board restored');
        }
        continue;
      }
      if (local?.cloudOwner && local.cloudOwner !== this.userId) continue;
      if (this.access.isEditing()) {
        this.setStatus('Local edits are still saving; cloud sync will retry');
        return;
      }
      const decision = syncDecision(local, remote, marker);
      if (decision === 'push') await this.write(local, remote, epoch);
      if (decision === 'fork-pull' || decision === 'fork-delete') {
        if (local) await this.access.fork(id);
      }
      if (decision === 'pull' || decision === 'fork-pull') {
        if (!remote.payload || !UUID.test(remote.payload.id) || remote.payload.id !== id)
          throw Error('Invalid remote board; refusing to replace the local copy.');
        await this.access.import({ ...remote.payload, cloudOwner: this.userId });
        this.meta[id] = { version: remote.version, updated: remote.payload.updated };
        this.persist();
      }
      if (decision === 'delete' || decision === 'fork-delete') {
        if (local) await this.access.remove(id);
        this.meta[id] = { version: remote.version, updated: Date.now(), deleted: true };
        this.persist();
      }
    }
    localMap = new Map((await this.access.list()).map((board) => [board.id, board]));
    for (const [id, mark] of Object.entries(this.meta)) {
      if (epoch !== this.epoch) return;
      if (mark.deleted && !remoteMap.has(id)) {
        delete this.meta[id];
        this.persist();
      }
    }
    for (const board of localMap.values()) {
      if (epoch !== this.epoch) return;
      if (this.access.isEditing()) {
        this.setStatus('Local edits are still saving; cloud sync will retry');
        return;
      }
      if (board.cloudOwner && board.cloudOwner !== this.userId) continue;
      const mark = this.meta[board.id];
      if (!board.cloudOwner && !mark?.adopt) continue; // Never upload unrelated guest boards.
      const remote = remoteMap.get(board.id);
      if (!remote && !mark?.deleted) await this.write(board, null, epoch);
    }
    if (epoch === this.epoch) this.setStatus('✓ Synced across devices');
  }
}
