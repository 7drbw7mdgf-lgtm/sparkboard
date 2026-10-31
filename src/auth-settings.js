import { authProviders } from './auth-providers.js';

/** Reject privileged keys before a configuration can reach the browser client. */
export function authSettings(config) {
  if (!config?.url && !config?.publishableKey) return null;
  const url = new URL(config.url);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw Error('Account server must be an HTTPS origin.');
  }
  const key = config.publishableKey;
  let publicKey = typeof key === 'string' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!publicKey && typeof key === 'string') {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      publicKey = key.split('.').length === 3 && payload.role === 'anon';
    } catch {
      /* Not a legacy anon key. */
    }
  }
  if (!publicKey)
    throw Error('Use a public Supabase publishable key, never a secret or service-role key.');
  if (Array.isArray(config.providers) && config.providers.length === 0) return null;
  const providers = [...new Set(config.providers || [])].filter((p) =>
    Object.hasOwn(authProviders, p),
  );
  if (!providers.length) throw Error('Enable at least one sign-in provider.');
  return { url: url.origin, publishableKey: key, providers };
}
