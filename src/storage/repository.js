import { blobToDataURL, dataURLToBlob, mediaID } from './media-codec.js';
import { readAll, readEntry, requestResult, transactionDone } from './requests.js';
import { openDatabase, WRITE_STORES } from './schema.js';

function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

const isMedia = (item) => item.type === 'image' || item.type === 'file';
export const boardSummary = (board) => ({
  id: board.id,
  title: board.title,
  kind: board.kind,
  updated: board.updated,
  objectCount: board.objects.length,
  sceneCount: board.scenes?.length || 0,
});

/** All persistent writes stay here; canvas modules never open IDB transactions. */
export class BoardRepository {
  constructor(db, localStorage) {
    this.db = db;
    this.localStorage = localStorage;
    this.mediaCache = new Map();
    this.sources = new Map();
  }

  static async open({ indexedDB, name, localStorage = browserStorage() } = {}) {
    const db = await openDatabase(indexedDB, name);
    const repository = new BoardRepository(db, localStorage);
    try {
      await repository.migrateLegacy();
      await repository.recoverDrafts();
      return repository;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  close() {
    this.db.close();
  }

  async prepareBoard(board) {
    // Only clone this board's metadata. Attachment strings never enter the record.
    const { mediaIds: ignored, ...metadata } = board;
    const record = { ...metadata, objects: [], mediaIds: [] };
    const assets = new Map();
    for (const item of board.objects) {
      if (!isMedia(item)) {
        record.objects.push(structuredClone(item));
        continue;
      }
      let cached = this.sources.get(item.src);
      if (!cached && item.mediaId) {
        const candidate = this.mediaCache.get(item.mediaId);
        if (candidate && (!item.src || candidate.source === item.src)) cached = candidate;
      }
      if (!cached) {
        const blob = dataURLToBlob(item.src);
        cached = { id: await mediaID(blob), blob, source: item.src };
        this.mediaCache.set(cached.id, cached);
        this.sources.set(cached.source, cached);
      }
      assets.set(cached.id, cached);
      const { src, mediaId: untrustedID, ...fields } = item;
      record.objects.push({ ...structuredClone(fields), mediaId: cached.id });
    }
    record.mediaIds = [...assets.keys()];
    record.scenes = structuredClone(board.scenes || []);
    return { record, assets };
  }

  /** Queue requests synchronously; awaiting inside an IDB transaction closes it. */
  writeRecord(transaction, prepared) {
    const { record, assets } = prepared;
    const boards = transaction.objectStore('boards');
    const media = transaction.objectStore('media');
    const refs = transaction.objectStore('mediaRefs');
    const previousRequest = boards.get(record.id);
    previousRequest.onsuccess = () => {
      const previous = new Set(previousRequest.result?.mediaIds || []);
      for (const id of record.mediaIds) {
        if (previous.has(id)) continue; // Typing never rewrites existing attachments.
        const asset = assets.get(id);
        const lookup = media.get(id);
        lookup.onsuccess = () => {
          if (!lookup.result) media.put({ id, blob: asset.blob });
        };
        refs.put({ boardId: record.id, mediaId: id });
      }
      for (const id of previous) {
        if (record.mediaIds.includes(id)) continue;
        refs.delete([record.id, id]);
        const count = refs.index('byMedia').count(id);
        count.onsuccess = () => {
          if (count.result === 0) media.delete(id);
        };
      }
      boards.put(record);
      transaction.objectStore('summaries').put(boardSummary(record));
    };
  }

  async saveBoard(board) {
    const prepared = await this.prepareBoard(structuredClone(board));
    const transaction = this.db.transaction(WRITE_STORES, 'readwrite');
    const done = transactionDone(transaction);
    this.writeRecord(transaction, prepared);
    await done;
    this.clearDraft(board.id, board.updated);
    return prepared.record;
  }

  async listBoards() {
    const summaries = await readAll(this.db, 'summaries');
    return summaries.sort((a, b) => b.updated - a.updated);
  }

  async loadBoard(id) {
    const record = await readEntry(this.db, 'boards', id);
    if (!record) throw new Error('This board no longer exists.');
    const { mediaIds, ...board } = record;
    for (const item of board.objects.filter(isMedia)) {
      let cached = this.mediaCache.get(item.mediaId);
      if (!cached) {
        const asset = await readEntry(this.db, 'media', item.mediaId);
        if (!asset)
          throw new Error(
            `The attachment “${item.text}” is missing. Export a backup before changing this board.`,
          );
        cached = { ...asset, source: await blobToDataURL(asset.blob) };
        this.mediaCache.set(cached.id, cached);
        this.sources.set(cached.source, cached);
      }
      item.src = cached.source;
    }
    return board;
  }

  retainMediaFor(board) {
    const keep = new Set(board.objects.filter(isMedia).map((item) => item.mediaId));
    for (const [id, cached] of this.mediaCache) {
      if (!keep.has(id)) {
        this.sources.delete(cached.source);
        this.mediaCache.delete(id);
      }
    }
  }

  async deleteBoard(id) {
    const transaction = this.db.transaction(WRITE_STORES, 'readwrite');
    const done = transactionDone(transaction);
    const refs = transaction.objectStore('mediaRefs');
    const cursor = refs.index('byBoard').openCursor(id);
    cursor.onsuccess = () => {
      const entry = cursor.result;
      if (!entry) return;
      const mediaId = entry.value.mediaId;
      entry.delete();
      const count = refs.index('byMedia').count(mediaId);
      count.onsuccess = () => {
        if (count.result === 0) transaction.objectStore('media').delete(mediaId);
      };
      entry.continue();
    };
    transaction.objectStore('boards').delete(id);
    transaction.objectStore('summaries').delete(id);
    await done;
    this.clearDraft(id, Infinity);
  }

  getActiveBoard() {
    return readEntry(this.db, 'settings', 'activeBoard');
  }
  async setActiveBoard(id) {
    const transaction = this.db.transaction('settings', 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore('settings').put(id, 'activeBoard');
    await done;
  }

  async migrateLegacy() {
    if ((await readEntry(this.db, 'settings', 'storageMigration')) === 2) return;
    const legacy = this.db.objectStoreNames.contains('workspace')
      ? await readEntry(this.db, 'workspace', 'boards')
      : [];
    let backup = [];
    try {
      backup = JSON.parse(this.localStorage?.getItem('sparkboard.boards') || '[]');
    } catch (error) {
      if (error instanceof SyntaxError)
        throw new Error(
          'An older recovery copy could not be read. Its original data has been retained.',
        );
    }
    const candidates = new Map();
    for (const board of [
      ...(Array.isArray(legacy) ? legacy : []),
      ...(Array.isArray(backup) ? backup : []),
    ]) {
      if (!board?.id || !Array.isArray(board.objects))
        throw new Error(
          'An older board could not be migrated. The original data has been retained.',
        );
      if (
        !candidates.has(board.id) ||
        (board.updated || 0) > (candidates.get(board.id).updated || 0)
      )
        candidates.set(board.id, board);
    }
    const prepared = [];
    for (const board of candidates.values()) {
      const existing = await readEntry(this.db, 'boards', board.id);
      if (!existing || (board.updated || 0) > (existing.updated || 0))
        prepared.push(await this.prepareBoard(board));
    }
    const stores = [...WRITE_STORES, 'settings'];
    if (this.db.objectStoreNames.contains('workspace')) stores.push('workspace');
    const transaction = this.db.transaction(stores, 'readwrite');
    const done = transactionDone(transaction);
    // All new blobs/references are queued first, before any obsolete reference cleanup.
    for (const { record, assets } of prepared) {
      for (const asset of assets.values())
        transaction.objectStore('media').put({ id: asset.id, blob: asset.blob });
      for (const mediaId of record.mediaIds)
        transaction.objectStore('mediaRefs').put({ boardId: record.id, mediaId });
    }
    for (const item of prepared) this.writeRecord(transaction, item);
    transaction.objectStore('settings').put(2, 'storageMigration');
    let active;
    try {
      active = this.localStorage?.getItem('sparkboard.active');
    } catch {
      /* Optional legacy preference. */
    }
    if (active) transaction.objectStore('settings').put(active, 'activeBoard');
    if (stores.includes('workspace')) transaction.objectStore('workspace').delete('boards');
    await done; // Only now is it safe to remove the old monolithic localStorage copy.
    try {
      this.localStorage?.removeItem('sparkboard.boards');
      this.localStorage?.removeItem('sparkboard.active');
    } catch {
      /* IDB already holds the committed data. */
    }
  }

  /** A small per-board crash journal is written only when the page is leaving. */
  writeDraft(board) {
    try {
      const { mediaIds: ignored, ...record } = board;
      record.objects = board.objects.map((item) => {
        if (!isMedia(item)) return item;
        const cached = this.sources.get(item.src);
        const id = item.mediaId || cached?.id;
        if (!id) throw new Error('Attachment is still being saved.');
        const { src, mediaId, ...fields } = item;
        return { ...fields, mediaId: id };
      });
      this.localStorage.setItem(`sparkboard.draft.${board.id}`, JSON.stringify(record));
      return true;
    } catch {
      return false;
    }
  }

  clearDraft(id, savedAt) {
    try {
      const key = `sparkboard.draft.${id}`,
        draft = JSON.parse(this.localStorage?.getItem(key) || 'null');
      if (draft && (draft.updated || 0) <= savedAt) this.localStorage.removeItem(key);
    } catch {
      /* A failed optional journal cleanup must not turn a committed save into an error. */
    }
  }

  async recoverDrafts() {
    const keys = [];
    try {
      for (let i = 0; i < (this.localStorage?.length || 0); i++) {
        const key = this.localStorage.key(i);
        if (key?.startsWith('sparkboard.draft.')) keys.push(key);
      }
    } catch {
      return;
    }
    for (const key of keys) {
      const raw = this.localStorage.getItem(key);
      if (raw === null) continue; // Another window may have already committed this journal.
      const draft = JSON.parse(raw);
      if (!draft?.id || !Array.isArray(draft.objects))
        throw new Error('A recovery draft needs attention. Its original data has been retained.');
      const existing = await readEntry(this.db, 'boards', draft.id);
      if (existing && existing.updated >= draft.updated) {
        this.clearDraft(draft.id, existing.updated);
        continue;
      }
      for (const item of draft.objects.filter(isMedia)) {
        const asset = await readEntry(this.db, 'media', item.mediaId);
        if (!asset)
          throw new Error(
            'A recovery draft has an incomplete attachment. Its original data has been retained.',
          );
        item.src = await blobToDataURL(asset.blob);
      }
      await this.saveBoard(draft);
    }
  }
}
