import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudSync, syncDecision } from '../src/cloud-sync.js';

const owner = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const other = '33333333-3333-4333-8333-333333333333';
function board(boardId = id, updated = 100, cloudOwner) {
  return { id: boardId, title: 'Research', kind: 'blank', objects: [], scenes: [],
    updated, ...(cloudOwner ? { cloudOwner } : {}) };
}
function storage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) || null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
  };
}
function setup({ initial = [board()], remote = [], fail = null } = {}) {
  const local = new Map(initial.map((b) => [b.id, structuredClone(b)]));
  const cloud = new Map(remote.map((r) => [r.board_id, structuredClone(r)]));
  const requests = [];
  const actions = [];
  const access = {
    list: async () => [...local.values()].map(({ id, updated, cloudOwner, title }) => ({
      id, updated, cloudOwner, title,
    })),
    load: async (key) => structuredClone(local.get(key)),
    flush: async () => {},
    isEditing: () => false,
    import: async (b) => { actions.push('import:' + b.id); local.set(b.id, structuredClone(b)); },
    remove: async (key) => { actions.push('remove:' + key); local.delete(key); },
    fork: async (key) => {
      actions.push('fork:' + key);
      local.set(other, { ...local.get(key), id: other, cloudOwner: owner });
    },
  };
  const fakeFetch = async (url, config) => {
    requests.push({ url, ...config });
    if (fail) return { ok: false, status: fail, text: async () => '{"message":"not ready"}' };
    const u = new URL(url);
    const version = u.searchParams.get('version');
    const key = u.searchParams.get('board_id')?.slice(3);
    let results = [];
    if (config.method === 'GET') results = [...cloud.values()].sort((a,b) =>
      a.board_id.localeCompare(b.board_id));
    if (config.method === 'POST') {
      const incoming = JSON.parse(config.body);
      if (!cloud.has(incoming.board_id)) {
        cloud.set(incoming.board_id, incoming);
        results = [incoming];
      }
    }
    if (config.method === 'PATCH') {
      const row = cloud.get(key);
      if (row && row.version === Number(version?.slice(3))) {
        Object.assign(row, JSON.parse(config.body));
        results = [row];
      }
    }
    return { ok: true, status: 200, text: async () => JSON.stringify(results) };
  };
  const client = new CloudSync({ url: 'https://project.supabase.co', key: 'sb_publishable_test',
    auth: { getSession: async () => ({ data: { session: { user: { id: owner },
      access_token: 'session-access-token' } } }) }, access, storage: storage(), request: fakeFetch });
  client.configure(owner);
  return { client, local, cloud, requests, actions };
}

test('decision table protects concurrent edits and tombstones', () => {
  assert.equal(syncDecision(board(), null, null), 'insert');
  assert.equal(syncDecision(null, { version: 1 }, null), 'pull');
  assert.equal(syncDecision(board(), { version: 1 }, null), 'fork-pull');
  assert.equal(syncDecision(board(id, 200), { version: 1 }, { version: 1, updated: 100 }), 'push');
  assert.equal(syncDecision(board(id, 200), { version: 2 }, { version: 1, updated: 100 }), 'fork-pull');
  assert.equal(syncDecision(board(id, 100), { version: 2 }, { version: 1, updated: 100 }), 'pull');
  assert.equal(syncDecision(board(id, 100), { version: 2, deleted: true }, { version: 1, updated: 100 }), 'delete');
});

test('consent is required, and a missing Supabase migration does not enable uploads', async () => {
  const { client, requests } = setup({ fail: 404 });
  await assert.rejects(() => client.enable(), /migration/);
  assert.equal(client.enabled, false);
  assert.equal(client.storage.getItem(client.prefKey(owner)), null);
  assert.equal(requests.some((r) => r.method !== 'GET'), false);
  client.stop();
});

test('explicit enable uploads local boards with account JWT and no service key', async () => {
  const { client, cloud, requests } = setup();
  assert.equal(client.enabled, false);
  await client.enable();
  assert.equal(cloud.get(id).payload.title, 'Research');
  assert.equal(cloud.get(id).payload.cloudOwner, owner);
  assert.equal(cloud.get(id).version, 1);
  assert.equal(client.storage.getItem(client.prefKey(owner)), 'yes');
  assert.ok(requests.every((r) => r.headers.apikey === 'sb_publishable_test'));
  assert.ok(requests.every((r) => r.headers.Authorization === 'Bearer session-access-token'));
  assert.ok(requests.some((r) => r.method === 'POST'));
  client.stop();
});

test('other devices download boards after enabling sync', async () => {
  const remote = [{ owner_id: owner, board_id: id, payload: board(id, 999, owner),
    version: 3, deleted: false }];
  const { client, local, actions, cloud } = setup({ initial: [], remote });
  await client.enable();
  assert.equal(local.get(id).updated, 999);
  assert.deepEqual(actions, ['import:' + id]);
  assert.equal(cloud.get(id).version, 3);
  client.stop();
});

test('simultaneous edits preserve local copy and import remote version', async () => {
  const remote = [{ owner_id: owner, board_id: id, payload: board(id, 300, owner),
    version: 2, deleted: false }];
  const { client, local, actions } = setup({ initial: [board(id, 250, owner)], remote });
  client.meta[id] = { version: 1, updated: 100 };
  client.enabled = true;
  await client.sync();
  assert.deepEqual(actions.slice(0, 2), ['fork:' + id, 'import:' + id]);
  assert.equal(local.get(other).updated, 250);
  assert.equal(local.get(id).updated, 300);
  client.stop();
});

test('offline deletion creates version-checked cloud tombstone on next sync', async () => {
  const remote = [{ owner_id: owner, board_id: id, payload: board(id, 100, owner),
    version: 1, deleted: false }];
  const { client, cloud, local } = setup({ initial: [], remote });
  client.meta[id] = { version: 1, updated: 100 };
  client.enabled = true;
  client.markDeleted(id);
  await client.sync();
  assert.equal(cloud.get(id).deleted, true);
  assert.equal(cloud.get(id).version, 2);
  assert.equal(cloud.get(id).payload, null);
  assert.equal(local.size, 0);
  client.stop();
});

test('a newer remote edit defeats a stale deletion instead of being destroyed', async () => {
  const remote = [{ owner_id: owner, board_id: id, payload: board(id, 250, owner),
    version: 2, deleted: false }];
  const { client, cloud, local } = setup({ initial: [], remote });
  client.meta[id] = { version: 1, updated: 100, deleted: true };
  client.enabled = true;
  await client.sync();
  assert.equal(cloud.get(id).deleted, false);
  assert.equal(local.get(id).updated, 250);
  client.stop();
});
