import { authConfig } from './auth-config.js';
import { authSettings } from './auth-settings.js';
import { oauthRequest } from './auth-providers.js';
import { modal } from './dialogs.js';
import { flushSaves, save, cloudBoardAccess, connectCloudSync } from './boards.js';
import { CloudSync } from './cloud-sync.js';
import { toast } from './notifications.js';
import { $, esc } from './core.js';

export async function setupAuth(startup) {
  const button = $('#account');
  let settings;
  try {
    settings = authSettings(authConfig);
  } catch (error) {
    console.error(error.message);
    startup.ready({ error: 'Sign-in is not configured correctly. Guest access is available.' });
    return;
  }
  if (!settings) {
    startup.ready();
    return;
  }

  button.hidden = false;
  let client;
  let user = null;
  let cloud = null;
  let previousUserId = null;
  const useSession = (session) => {
    const next = session?.user?.id || null;
    if (!cloud || next === previousUserId) return;
    cloud.stop();
    previousUserId = next;
    if (next) cloud.configure(next);
  };

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
    if (!user) {
      startup.open();
      return;
    }
    const syncActive = cloud?.enabled;
    modal(
      'Your account',
      `<p class="account-name">${esc(user.user_metadata?.full_name || 'Sparkboard member')}</p>
      <p>${esc(user.email || '')}</p>
      <div class="account-sync">
        <strong>Cross-device board sync</strong>
        <p id="cloud-sync-state" role="status">${esc(cloud?.status || 'Unavailable')}</p>
        <p class="account-note">${syncActive ?
          'Boards sync when this account is signed in and online. Offline changes are retained locally and synced later.' :
          'Enable sync to upload your existing local boards to this account and bring them to your other devices. Cloud setup must be completed first.'}
          Conflict copies are preserved instead of silently overwriting changes. Boards cached in this browser remain accessible here after sign-out.</p>
        <button id="account-sync" class="account-provider">${syncActive ? 'Sync now' : 'Enable cloud sync on this browser'}</button>
        ${syncActive ? '<button id="account-sync-off" class="account-provider">Pause cloud sync on this browser</button>' : ''}
      </div>
      <button id="account-sign-out" class="account-provider">Sign out of this browser</button>`,
      'SPARKBOARD ACCOUNT',
    );
    $('#account-sync').onclick = async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        if (!cloud) throw Error('Cloud sync is unavailable.');
        if (cloud.enabled) await cloud.sync();
        else await cloud.enable();
        $('#cloud-sync-state').textContent = cloud.status;
        button.textContent = 'Sync now';
        toast('Your cloud board sync is enabled.');
      } catch (error) {
        $('#cloud-sync-state').textContent = 'Cloud sync unavailable: ' + error.message;
        toast(error.message);
      } finally {
        button.disabled = false;
      }
    };
    if ($('#account-sync-off')) $('#account-sync-off').onclick = () => {
      cloud?.disable();
      $('#dialog').close();
      toast('Cloud sync paused. Local boards are still available.');
    };
    $('#account-sign-out').onclick = async (event) => {
      event.currentTarget.disabled = true;
      try {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) throw error;
        cloud?.stop();
        previousUserId = null;
        user = null;
        render();
        $('#dialog').close();
        startup.open();
        toast('Signed out. Local boards remain on this device.');
      } catch {
        $('#account-sign-out').disabled = false;
        toast('Could not sign out. Please try again.');
      }
    };
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
    cloud = new CloudSync({
      url: settings.url,
      key: settings.publishableKey,
      auth: client.auth,
      access: cloudBoardAccess(),
      onStatus: (message) => {
        const display = $('#cloud-sync-state');
        if (display) display.textContent = message;
      },
    });
    connectCloudSync(cloud);
    client.auth.onAuthStateChange((_event, session) => {
      user = session?.user || null;
      render();
      // Supabase recommends not awaiting Auth API calls within the auth event callback.
      queueMicrotask(() => useSession(session));
      if (user) startup.signedIn();
    });

    const callback = new URL(location.href);
    const code = callback.searchParams.get('code');
    const denied = callback.searchParams.has('error');
    let callbackError = '';
    if (code || denied) {
      for (const key of ['code', 'error', 'error_code', 'error_description'])
        callback.searchParams.delete(key);
      history.replaceState(history.state, '', callback.pathname + callback.search + callback.hash);
      if (denied) {
        callbackError = 'Sign-in was cancelled. You can try again or continue as a guest.';
      } else {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) callbackError = 'This sign-in link could not be completed. Request a new one.';
        else toast('Signed in to Sparkboard.');
      }
    }
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    user = data.session?.user || null;
    render();
    useSession(data.session);

    const redirect = new URL(location.pathname, location.origin).href;
    const saveBeforeLogin = async () => {
      if (!window.isSecureContext) throw Error('Sign-in requires HTTPS.');
      await save();
      await flushSaves();
    };

    startup.ready({
      user,
      emailEnabled: settings.emailEnabled,
      enabledProviders: settings.providers,
      error: callbackError,
      onEmail: async (email) => {
        await saveBeforeLogin();
        const { error } = await client.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirect },
        });
        if (error) throw error;
      },
      onProvider: async (provider) => {
        await saveBeforeLogin();
        const { error } = await client.auth.signInWithOAuth(oauthRequest(provider, redirect));
        if (error) throw error;
      },
    });
  } catch {
    startup.ready({
      error: 'Account sign-in could not connect. Your local boards are still available.',
    });
  }
}
