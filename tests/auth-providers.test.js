import test from 'node:test';
import assert from 'node:assert/strict';
import { authProviders, oauthRequest } from '../src/auth-providers.js';
import { authSettings } from '../src/auth-settings.js';
const redirect = 'https://sparkboard.co.uk/';
test('Apple and Microsoft map to supported Supabase providers and identity scopes', () => {
  assert.equal(authProviders.azure.label, 'Continue with Microsoft');
  assert.deepEqual(oauthRequest('azure', redirect), {
    provider: 'azure',
    options: { redirectTo: redirect, scopes: 'email' },
  });
  // Apple identity scopes are supplied by Supabase, rather than overriding them with another provider's scopes.
  assert.deepEqual(oauthRequest('apple', redirect), {
    provider: 'apple',
    options: { redirectTo: redirect },
  });
  assert.deepEqual(
    authSettings({
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_example',
      providers: ['apple', 'azure', 'azure'],
    }).providers,
    ['apple', 'azure'],
  );
});
test('OAuth requests reject unknown providers and unsafe return URLs', () => {
  for (const provider of ['microsoft', 'constructor', '__proto__', 'evil'])
    assert.throws(() => oauthRequest(provider, redirect));
  for (const address of [
    'http://sparkboard.co.uk/',
    'javascript:alert(1)',
    'https://user:secret@example.com/',
    'https://sparkboard.co.uk/?next=evil',
    'https://sparkboard.co.uk/#token',
  ])
    assert.throws(() => oauthRequest('azure', address));
  assert.equal(
    oauthRequest('azure', 'http://localhost:3000/').options.redirectTo,
    'http://localhost:3000/',
  );
});
