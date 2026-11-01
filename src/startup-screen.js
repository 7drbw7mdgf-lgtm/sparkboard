import { authProviders } from './auth-providers.js';
import { $ } from './core.js';

const guestKey = 'sparkboard.guest-session';

function rememberedGuest() {
  try {
    return sessionStorage.getItem(guestKey) === 'yes';
  } catch {
    return false;
  }
}

function rememberGuest() {
  try {
    sessionStorage.setItem(guestKey, 'yes');
  } catch {
    // Private browsing can disable session storage. Guest access still works.
  }
}

export function shouldShowStartup(signedIn, guestChoice) {
  return !signedIn && !guestChoice;
}

export function setupStartupScreen() {
  const screen = $('#start-screen');
  const form = $('#start-email-form');
  const email = $('#start-email');
  const submit = $('#start-email-submit');
  const guest = $('#start-guest');
  const providers = $('#start-providers');
  const unavailable = $('#start-unavailable');
  const feedback = $('#start-feedback');
  let signInEmail = null;
  let signInProvider = null;
  let pending = false;
  let ready = false;

  const setBackgroundInert = (blocked) => {
    for (const element of document.body.children) {
      if (element !== screen && element.tagName !== 'SCRIPT') element.inert = blocked;
    }
  };

  function message(text, error = false) {
    feedback.textContent = text;
    feedback.classList.toggle('is-error', error);
  }

  function toggleBusy(busy) {
    pending = busy;
    submit.disabled = busy;
    email.disabled = busy;
    for (const button of providers.querySelectorAll('button')) button.disabled = busy;
  }

  function dismiss({ remember = false } = {}) {
    if (remember) rememberGuest();
    screen.hidden = true;
    screen.setAttribute('aria-busy', 'false');
    setBackgroundInert(false);
  }

  function open() {
    if (!ready) return;
    screen.hidden = false;
    screen.setAttribute('aria-busy', 'false');
    setBackgroundInert(true);
    guest.focus({ preventScroll: true });
  }

  // A real modal barrier: keyboard navigation cannot reach an unseen canvas.
  screen.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || screen.hidden) return;
    const controls = [
      ...screen.querySelectorAll('button:not(:disabled):not([hidden]), input:not(:disabled):not([hidden])'),
    ].filter((control) => control.getClientRects().length);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  guest.onclick = () => dismiss({ remember: true });

  form.onsubmit = async (event) => {
    event.preventDefault();
    if (pending || !signInEmail) return;
    if (!email.reportValidity()) return;
    toggleBusy(true);
    message('');
    try {
      await signInEmail(email.value.trim());
      message('Check your inbox for a sign-in link. Return to Sparkboard using that link.');
    } catch {
      message('Could not send the sign-in link. Check your email or try again.', true);
    } finally {
      toggleBusy(false);
    }
  };

  providers.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-start-provider]');
    if (!button || pending || !signInProvider) return;
    toggleBusy(true);
    message('');
    try {
      await signInProvider(button.dataset.startProvider);
    } catch {
      message('This sign-in provider is unavailable. Try another option.', true);
      toggleBusy(false);
    }
  });

  setBackgroundInert(true);

  return {
    dismiss,
    open,
    signedIn: () => dismiss(),
    ready({ user = null, emailEnabled = false, enabledProviders = [], onEmail, onProvider, error = '' } = {}) {
      ready = true;
      signInEmail = emailEnabled ? onEmail : null;
      signInProvider = onProvider || null;
      form.hidden = !emailEnabled;
      providers.replaceChildren();
      for (const key of enabledProviders) {
        if (!Object.hasOwn(authProviders, key)) continue;
        const button = document.createElement('button');
        button.className = 'start-provider';
        button.type = 'button';
        button.dataset.startProvider = key;
        button.textContent = authProviders[key].label;
        providers.append(button);
      }
      providers.hidden = !providers.children.length;
      unavailable.hidden = emailEnabled || enabledProviders.length > 0;
      guest.disabled = false;
      screen.setAttribute('aria-busy', 'false');
      message(error);
      if (!shouldShowStartup(Boolean(user), rememberedGuest())) dismiss();
      else open();
    },
  };
}
