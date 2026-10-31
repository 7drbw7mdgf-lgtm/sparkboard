// Supabase uses "azure" for Microsoft. Request only account identity scopes.
export const authProviders = Object.freeze({
  google: Object.freeze({ label: 'Continue with Google', scopes: 'email profile' }),
  facebook: Object.freeze({ label: 'Continue with Facebook', scopes: 'email' }),
  apple: Object.freeze({ label: 'Continue with Apple' }),
  azure: Object.freeze({ label: 'Continue with Microsoft', scopes: 'email' }),
});

export function oauthRequest(provider, redirectTo) {
  if (!Object.hasOwn(authProviders, provider)) throw Error('Unsupported sign-in provider.');
  const url = new URL(redirectTo);
  const local =
    url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (!local && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw Error('Sign-in requires a secure return URL.');
  }
  const scopes = authProviders[provider].scopes;
  return { provider, options: { redirectTo: url.href, ...(scopes ? { scopes } : {}) } };
}
