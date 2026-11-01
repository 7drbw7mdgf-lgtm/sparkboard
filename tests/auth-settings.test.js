import test from 'node:test';
import assert from 'node:assert/strict';
import { authSettings } from '../src/auth-settings.js';
const url = 'https://example.supabase.co';
test('accounts stay disabled until configured and accept only public keys', () => {
  assert.equal(authSettings({ url: '', publishableKey: '' }), null);
  assert.equal(
    authSettings({ url, publishableKey: 'sb_publishable_example', providers: [] }),
    null,
  );
  assert.deepEqual(
    authSettings({
      url,
      publishableKey: 'sb_publishable_example',
      providers: ['google', 'facebook', 'google', 'evil'],
    }),
    {
      url,
      publishableKey: 'sb_publishable_example',
      providers: ['google', 'facebook'],
      emailEnabled: false,
    },
  );
  const jwt = (role) => 'e30.' + btoa(JSON.stringify({ role })).replace(/=+$/, '') + '.signature';
  assert.ok(authSettings({ url, publishableKey: jwt('anon'), providers: ['google'] }));
  for (const key of ['sb_secret_example', jwt('service_role'), 'garbage'])
    assert.throws(
      () => authSettings({ url, publishableKey: key, providers: ['google'] }),
      /public Supabase/,
    );
});
test('auth configuration rejects unsafe server origins and unsupported providers', () => {
  for (const server of [
    'http://example.supabase.co',
    'https://user:pass@example.supabase.co',
    'https://example.supabase.co/path',
    'https://example.supabase.co/?redirect=evil',
  ])
    assert.throws(() =>
      authSettings({
        url: server,
        publishableKey: 'sb_publishable_example',
        providers: ['google'],
      }),
    );
  assert.throws(
    () => authSettings({ url, publishableKey: 'sb_publishable_example', providers: ['evil'] }),
    /provider/,
  );
});

test('email magic links can be enabled without social providers', () => {
  assert.deepEqual(
    authSettings({
      url,
      publishableKey: 'sb_publishable_example',
      providers: [],
      emailEnabled: true,
    }),
    { url, publishableKey: 'sb_publishable_example', providers: [], emailEnabled: true },
  );
  assert.equal(
    authSettings({
      url,
      publishableKey: 'sb_publishable_example',
      providers: [],
      emailEnabled: false,
    }),
    null,
  );
});
