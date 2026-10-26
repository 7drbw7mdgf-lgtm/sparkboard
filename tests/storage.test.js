import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { BoardRepository } from '../src/storage/repository.js';
import { openDatabase } from '../src/storage/schema.js';
import { readAll, readEntry, requestResult, transactionDone } from '../src/storage/requests.js';
import { SaveScheduler } from '../src/storage/save-scheduler.js';

class MemoryStorage {
  entries = new Map();
  get length() {
    return this.entries.size;
  }
  key(index) {
    return [...this.entries.keys()][index];
  }
  getItem(key) {
    return this.entries.get(key) ?? null;
  }
  setItem(key, value) {
    this.entries.set(key, String(value));
  }
  removeItem(key) {
    this.entries.delete(key);
  }
}
const image = 'data:image/png;base64,' + btoa('sample image bytes');
const pdf = 'data:application/pdf;base64,' + btoa('%PDF-1.4 test attachment');
const shape = (id = 'shape-a') => ({
  id,
  type: 'sticky',
  x: 0,
  y: 0,
  w: 190,
  h: 170,
  text: 'An idea',
  color: '#f8df87',
});
const attachment = (id = 'image-a', src = image) => ({
  ...shape(id),
  type: src === pdf ? 'file' : 'image',
  text: src === pdf ? 'brief.pdf' : 'image.png',
  src,
});
const board = (id = 'board-a', objects = [shape()], updated = 1) => ({
  id,
  title: id,
  kind: 'blank',
  objects,
  scenes: [],
  updated,
});
async function setup(t) {
  const factory = new IDBFactory(),
    storage = new MemoryStorage();
  const repository = await BoardRepository.open({ indexedDB: factory, localStorage: storage });
  t.after(() => repository.close());
  return { factory, storage, repository };
}
async function seedLegacy(factory, boards) {
  const request = factory.open('sparkboard-workspace', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('workspace');
  const db = await requestResult(request);
  const transaction = db.transaction('workspace', 'readwrite'),
    done = transactionDone(transaction);
  transaction.objectStore('workspace').put(boards, 'boards');
  await done;
  db.close();
}
function recordWrites(repository) {
  const calls = [];
  const original = repository.db.transaction.bind(repository.db);
  repository.db.transaction = (...args) => {
    const transaction = original(...args),
      objectStore = transaction.objectStore.bind(transaction),
      seen = new WeakSet();
    transaction.objectStore = (name) => {
      const store = objectStore(name);
      if (!seen.has(store)) {
        seen.add(store);
        const put = store.put.bind(store);
        store.put = (...values) => {
          calls.push({ store: name, value: values[0] });
          return put(...values);
        };
      }
      return store;
    };
    return transaction;
  };
  return calls;
}

test('boards are independent records and attachments are Blob records, never inline data URLs', async (t) => {
  const { repository: repo } = await setup(t);
  await repo.saveBoard(board('a', [attachment(), attachment('pdf-a', pdf)]));
  await repo.saveBoard(board('b'));
  const stored = await readAll(repo.db, 'boards'),
    media = await readAll(repo.db, 'media');
  assert.equal(stored.length, 2);
  assert.equal(media.length, 2);
  assert.ok(media.every((item) => item.blob instanceof Blob));
  assert.ok(stored[0].objects.every((item) => item.src === undefined));
  assert.equal(JSON.stringify(stored).includes('data:'), false);
  const hydrated = await repo.loadBoard('a');
  assert.equal(hydrated.objects[0].src, image);
  assert.equal(hydrated.objects[1].src, pdf);
  const summaries = await repo.listBoards();
  assert.equal(summaries[0].objects, undefined);
  assert.equal(summaries.find((item) => item.id === 'a').objectCount, 2);
});

test('a text edit writes only the changed board and never rewrites existing media', async (t) => {
  const { repository: repo } = await setup(t);
  await repo.saveBoard(board('a', [attachment(), shape()]));
  await repo.saveBoard(board('b'));
  const untouched = await readEntry(repo.db, 'boards', 'b');
  const active = await repo.loadBoard('a');
  const writes = recordWrites(repo);
  active.objects[1].text = 'Edited text';
  active.updated = 2;
  await repo.saveBoard(active);
  assert.deepEqual(
    writes.filter((call) => call.store === 'boards').map((call) => call.value.id),
    ['a'],
  );
  assert.equal(writes.filter((call) => call.store === 'media').length, 0);
  assert.deepEqual(await readEntry(repo.db, 'boards', 'b'), untouched);
});

test('shared media is retained until its last reference is removed, and undo can restore it', async (t) => {
  const { repository: repo } = await setup(t);
  await repo.saveBoard(board('a', [attachment()]));
  await repo.saveBoard(board('b', [attachment('image-b')]));
  assert.equal((await readAll(repo.db, 'media')).length, 1);
  await repo.deleteBoard('a');
  assert.equal((await readAll(repo.db, 'media')).length, 1);
  const saved = await repo.loadBoard('b');
  await repo.saveBoard({ ...saved, objects: [], updated: 2 });
  assert.equal((await readAll(repo.db, 'media')).length, 0);
  await repo.saveBoard({ ...saved, updated: 3 });
  assert.equal((await readAll(repo.db, 'media')).length, 1);
  assert.equal((await repo.loadBoard('b')).objects[0].src, image);
  await repo.deleteBoard('b');
  assert.equal((await readAll(repo.db, 'mediaRefs')).length, 0);
  assert.equal((await readAll(repo.db, 'summaries')).length, 0);
});

test('migration merges legacy sources per board, preserves the active board, and removes old blobs only after commit', async (t) => {
  const factory = new IDBFactory(),
    storage = new MemoryStorage();
  await seedLegacy(factory, [board('a', [attachment()], 5), board('b', [shape()], 8)]);
  storage.setItem(
    'sparkboard.boards',
    JSON.stringify([
      board('a', [attachment(), shape()], 6),
      board('b', [], 2),
      board('c', [attachment('pdf-c', pdf)], 1),
    ]),
  );
  storage.setItem('sparkboard.active', 'b');
  const repo = await BoardRepository.open({ indexedDB: factory, localStorage: storage });
  t.after(() => repo.close());
  assert.equal((await repo.loadBoard('a')).objects.length, 2);
  assert.equal((await repo.loadBoard('b')).objects.length, 1);
  assert.equal((await repo.listBoards()).length, 3);
  assert.equal(await repo.getActiveBoard(), 'b');
  assert.equal(await readEntry(repo.db, 'workspace', 'boards'), undefined);
  assert.equal(storage.getItem('sparkboard.boards'), null);
  assert.equal((await readAll(repo.db, 'media')).length, 2);
  repo.close();
  const reopened = await BoardRepository.open({ indexedDB: factory, localStorage: storage });
  assert.equal((await reopened.loadBoard('c')).objects[0].src, pdf);
  reopened.close();
});

test('an aborted migration leaves the complete legacy data available and can be retried', async (t) => {
  const factory = new IDBFactory(),
    storage = new MemoryStorage(),
    legacy = [board('a', [attachment()]), board('b')];
  await seedLegacy(factory, legacy);
  storage.setItem('sparkboard.boards', JSON.stringify(legacy));
  const repo = new BoardRepository(await openDatabase(factory), storage);
  t.after(() => repo.close());
  const write = repo.writeRecord.bind(repo);
  repo.writeRecord = (transaction, prepared) => {
    write(transaction, prepared);
    transaction.objectStore('settings').get('abort-probe').onsuccess = () => transaction.abort();
  };
  await assert.rejects(repo.migrateLegacy());
  assert.deepEqual(await readEntry(repo.db, 'workspace', 'boards'), legacy);
  assert.equal((await readAll(repo.db, 'boards')).length, 0);
  assert.equal((await readAll(repo.db, 'media')).length, 0);
  assert.ok(storage.getItem('sparkboard.boards'));
  repo.writeRecord = write;
  await repo.migrateLegacy();
  assert.equal((await repo.listBoards()).length, 2);
  assert.equal(storage.getItem('sparkboard.boards'), null);
});

test('an unreadable legacy recovery copy is retained rather than replaced by an empty workspace', async () => {
  const factory = new IDBFactory(),
    storage = new MemoryStorage();
  storage.setItem('sparkboard.boards', '{broken JSON');
  await assert.rejects(
    BoardRepository.open({ indexedDB: factory, localStorage: storage }),
    /retained/,
  );
  assert.equal(storage.getItem('sparkboard.boards'), '{broken JSON');
});

test('per-board leave journals omit media bytes and recover newer edits once', async (t) => {
  const { repository: repo, factory, storage } = await setup(t);
  await repo.saveBoard(board('a', [attachment(), shape()]));
  const active = await repo.loadBoard('a');
  active.objects[1].text = 'Recovered final keystroke';
  active.updated = 99;
  assert.equal(repo.writeDraft(active), true);
  const journal = storage.getItem('sparkboard.draft.a');
  assert.equal(journal.includes('data:'), false);
  assert.equal(storage.getItem('sparkboard.boards'), null);
  repo.close();
  const reopened = await BoardRepository.open({ indexedDB: factory, localStorage: storage });
  assert.equal((await reopened.loadBoard('a')).objects[1].text, 'Recovered final keystroke');
  assert.equal((await reopened.loadBoard('a')).objects[0].src, image);
  assert.equal(storage.getItem('sparkboard.draft.a'), null);
  reopened.close();
});

test('an old save cannot remove a newer recovery journal', async (t) => {
  const { repository: repo, storage } = await setup(t);
  const first = board('a'),
    newer = board('a', [shape()], 10);
  repo.writeDraft(newer);
  await repo.saveBoard(first);
  assert.ok(storage.getItem('sparkboard.draft.a'));
  await repo.saveBoard(newer);
  assert.equal(storage.getItem('sparkboard.draft.a'), null);
});

test('typing is debounced and the last edit is captured only when the write begins', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const writes = [],
    active = board();
  const saver = new SaveScheduler(async (snapshot) => writes.push(snapshot));
  saver.schedule(active);
  active.objects[0].text = 'Second edit';
  saver.schedule(active);
  active.objects[0].text = 'Final edit';
  saver.schedule(active);
  t.mock.timers.tick(299);
  assert.equal(writes.length, 0);
  t.mock.timers.tick(1);
  await saver.flush();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].objects[0].text, 'Final edit');
  assert.equal(saver.dirty, false);
});

test('flush persists pending edits before the debounce deadline', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const writes = [],
    saver = new SaveScheduler(async (snapshot) => writes.push(snapshot));
  saver.schedule(board('a'));
  saver.schedule(board('b'));
  await saver.flush();
  assert.deepEqual(
    writes.map((item) => item.id),
    ['a', 'b'],
  );
  t.mock.timers.tick(3000);
  assert.equal(writes.length, 2);
});

test('edits made during an in-flight save are drained without replacing newer text', async () => {
  let unblock, started;
  const gate = new Promise((resolve) => {
    unblock = resolve;
  });
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const writes = [],
    active = board();
  const saver = new SaveScheduler(async (snapshot) => {
    writes.push(snapshot);
    if (writes.length === 1) {
      started();
      await gate;
    }
  });
  saver.schedule(active);
  const flushing = saver.flush();
  await ready;
  active.objects[0].text = 'Edited while saving';
  saver.schedule(active);
  unblock();
  await flushing;
  assert.equal(writes.length, 2);
  assert.equal(writes[0].objects[0].text, 'An idea');
  assert.equal(writes[1].objects[0].text, 'Edited while saving');
});

test('failed saves remain dirty, reject an explicit flush, and retry the latest state', async () => {
  let fail = true;
  const writes = [],
    active = board();
  const saver = new SaveScheduler(async (snapshot) => {
    if (fail) throw Error('Quota exceeded');
    writes.push(snapshot);
  });
  saver.schedule(active);
  await assert.rejects(saver.flush(), /Quota/);
  assert.equal(saver.dirty, true);
  active.objects[0].text = 'Latest edit after failure';
  saver.schedule(active);
  fail = false;
  await saver.flush();
  assert.equal(writes[0].objects[0].text, 'Latest edit after failure');
  assert.equal(saver.dirty, false);
});

test('continuous typing still reaches disk at the maximum wait deadline', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const writes = [],
    active = board();
  const saver = new SaveScheduler(async (snapshot) => writes.push(snapshot));
  for (let index = 0; index < 20; index++) {
    active.objects[0].text = `Edit ${index}`;
    saver.schedule(active);
    t.mock.timers.tick(100);
  }
  await saver.flush();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].objects[0].text, 'Edit 19');
});
