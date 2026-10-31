import { authConfig } from './auth-config.js';
import { authSettings } from './auth-settings.js';
import { authProviders, oauthRequest } from './auth-providers.js';
import { modal } from './dialogs.js';
import { flushSaves, save } from './boards.js';
import { toast } from './notifications.js';
import { $, esc } from './core.js';

export async function setupAuth() {
  const button = $('#account');
  let settings;
  try {
    settings = authSettings(authConfig);
  } catch (error) {
    console.error(error.message);
    return;
  }
  if (!settings) return;
  button.hidden = false;
  let client,
    user = null;
  const render = () => {
    button.textContent = user
      ? String(user.user_metadata?.full_name || user.email || 'Account')
          .slice(0, 1)
          .toUpperCase()
      : 'Sign in';
    button.title = user ? 'Your account' : 'Sign in to Sparkboard';
    button.setAttribute('aria-label', button.title);
  };
  const showAccount = () => {
    if (!client) {
      toast('Account services are unavailable. Please try again.');
      return;
    }
    if (user) {
      modal(
        'Your account',
        `<p class="account-name">${esc(user.user_metadata?.full_name || 'Sparkboard member')}</p><p>${esc(user.email || '')}</p><p class="account-note">Boards are saved on this browser. Signing out keeps these local boards on this device; they are not synced to your account.</p><button id="account-sign-out" class="account-provider">Sign out of this browser</button>`,
        'SPARKBOARD ACCOUNT',
      );
      $('#account-sign-out').onclick = async (event) => {
        event.currentTarget.disabled = true;
        try {
          const { error } = await client.auth.signOut({ scope: 'local' });
          if (error) throw error;
          user = null;
          render();
          $('#dialog').close();
          toast('Signed out. Local boards are still on this device.');
        } catch {
          $('#account-sign-out').disabled = false;
          toast('Could not sign out. Please try again.');
        }
      };
      return;
    }
    modal(
      'A space of your own.',
      `<p class="account-intro">Sign in to your Sparkboard account.</p><div class="account-providers">${settings.providers.map((provider) => `<button class="account-provider ${provider}" data-auth-provider="${provider}">${authProviders[provider].label}</button>`).join('')}</div><p id="account-error" role="alert"></p><p class="account-note">Your boards stay on this browser. Accounts do not sync boards across devices yet. You can also keep using Sparkboard without signing in.</p>`,
      'WELCOME TO SPARKBOARD',
    );
    for (const providerButton of document.querySelectorAll('[data-auth-provider]')) {
      providerButton.onclick = async () => {
        if (!window.isSecureContext) {
          $('#account-error').textContent = 'Please open Sparkboard over HTTPS to sign in.';
          return;
        }
        const buttons = document.querySelectorAll('[data-auth-provider]');
        buttons.forEach((item) => (item.disabled = true));
        $('#account-error').textContent = '';
        try {
          await save();
          await flushSaves();
          const redirect = new URL(location.pathname, location.origin).href;
          const { error } = await client.auth.signInWithOAuth(
            oauthRequest(providerButton.dataset.authProvider, redirect),
          );
          if (error) throw error;
        } catch {
          $('#account-error').textContent =
            'Sign-in could not start. Please try again; your board is still here.';
          buttons.forEach((item) => (item.disabled = false));
        }
      };
    }
  };
  render();
  button.onclick = showAccount;
  try {
    const { AuthClient } = await import('./vendor/supabase.js');
    client = {
      auth: new AuthClient({
        url: settings.url + '/auth/v1',
        headers: { apikey: settings.publishableKey },
        flowType: 'pkce',
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'sparkboard-auth',
      }),
    };
    client.auth.onAuthStateChange((_event, session) => {
      user = session?.user || null;
      render();
    });
    const callback = new URL(location.href);
    const code = callback.searchParams.get('code');
    const denied = callback.searchParams.has('error');
    if (code || denied) {
      for (const key of ['code', 'error', 'error_code', 'error_description'])
        callback.searchParams.delete(key);
      history.replaceState(history.state, '', callback.pathname + callback.search + callback.hash);
      if (denied) {
        toast('Sign-in was cancelled or refused. You can try again from Sign in.');
      } else {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw error;
        toast('Signed in to Sparkboard.');
      }
    }
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    user = data.session?.user || null;
    render();
  } catch {
    toast('Account sign-in is unavailable. Your local boards are still accessible.');
  }
}
