(() => {
  'use strict';
  const escape = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
    );
  const button = document.createElement('button');
  button.className = 'quiet';
  button.id = 'updates';
  button.title = 'App updates';
  button.setAttribute('aria-label', 'App updates');
  button.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg><span>Updates</span>';
  const header = document.querySelector('.header-actions');
  header.append(button);
  const dialog = document.createElement('dialog');
  dialog.id = 'updates-dialog';
  dialog.setAttribute('aria-label', 'Sparkboard updates');
  document.body.append(dialog);
  let state = null,
    token = '',
    acting = false,
    error = '',
    mode = 'sandbox',
    repository = '',
    poller = null;
  const labels = {
    idle: 'Ready when you are',
    checking: 'Checking for updates…',
    available: 'A fresh version is available',
    downloading: 'Downloading update…',
    verifying: 'Verifying your download…',
    ready: 'Verified and ready to install',
    installed: 'You’re on the new version',
    current: 'You’re up to date',
    restored: 'Previous version restored',
    error: 'Couldn’t finish the update',
  };
  const bytes = (n) =>
    n < 1024
      ? `${n} B`
      : n < 1024 * 1024
        ? `${Math.round(n / 1024)} KB`
        : `${(n / 1024 / 1024).toFixed(1)} MB`;
  function render() {
    if (!dialog.open) return;
    if (!state) {
      dialog.innerHTML = `<div class="update-heading"><h2>App updates</h2><button data-update="close" aria-label="Close updates">×</button></div><p class="update-copy">${escape(error || 'Loading update settings…')}</p>`;
      return;
    }
    const busy = acting || state.busy,
      disabled = busy ? 'disabled' : '',
      progress = state.progress || {},
      percent = progress.total
        ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
        : null;
    dialog.innerHTML = `<div class="update-heading"><div><span class="update-eyebrow">KEEP THE IDEAS FLOWING</span><h2>A little more Sparkboard.</h2></div><button data-update="close" aria-label="Close updates">×</button></div><div class="update-version"><div class="update-app-icon">✳</div><div><b>Sparkboard <span>v${escape(state.currentVersion)}</span></b><small>${state.source === 'sandbox' ? 'Local sandbox · no GitHub requests' : escape(state.repository || 'GitHub releases')}</small></div><span class="update-mode-badge">${state.source === 'sandbox' ? 'SANDBOX' : 'GITHUB'}</span></div><div class="update-source"><label class="update-label">UPDATE SOURCE</label><div class="update-tabs"><button data-source="sandbox" aria-pressed="${mode === 'sandbox'}" ${disabled}>Local sandbox</button><button data-source="github" aria-pressed="${mode === 'github'}" ${disabled}>GitHub releases</button></div>${mode === 'github' ? `<label class="update-repository-label">Repository<input id="update-repository" type="text" value="${escape(repository)}" placeholder="https://github.com/you/sparkboard" aria-label="GitHub update repository" ${disabled}></label><p class="update-copy">Use public Sparkboard releases signed by this app’s publisher.</p>` : '<p class="update-copy">Try the complete update flow with a local test release. Your boards stay on this device.</p>'}${mode !== state.source || (mode === 'github' && repository !== state.repository) ? `<button class="update-secondary" data-update="configure" ${disabled}>Save update source</button>` : ''}</div><div class="update-status"><span class="update-status-dot ${busy ? 'working' : ''}"></span><div><b role="status">${escape(labels[state.phase] || labels.idle)}</b><small>${state.lastChecked ? 'Last checked ' + escape(new Date(state.lastChecked).toLocaleString()) : 'Check when you’re ready. Nothing installs automatically.'}</small></div></div>${state.available ? `<section class="update-release"><div class="update-release-title"><b>Version ${escape(state.available.version)}</b><span>${bytes(state.available.size || 0)}</span></div><p>${escape(state.available.notes || 'A new Sparkboard release is ready.')}</p>${state.ready ? '<div class="update-verified">✓ Publisher signature verified<br>✓ Every file passed its integrity check<br>✓ Previous version will remain available</div>' : ''}${state.available.url ? `<a href="${escape(state.available.url)}" target="_blank" rel="noopener noreferrer">View release on GitHub ↗</a>` : ''}</section>` : ''}${state.busy && ['downloading', 'verifying'].includes(state.phase) ? `<div class="update-progress"><progress ${percent !== null ? `value="${percent}"` : ''} max="100"></progress><span>${percent !== null ? percent + '%' : bytes(progress.downloaded || 0)}</span></div>` : ''}${error || state.error ? `<p class="update-error" role="alert">${escape(error || state.error)}</p>` : ''}<div class="update-actions">${state.ready ? `<button class="update-primary" data-update="install" ${disabled}>Install & reload ↗</button>` : state.available ? `<button class="update-primary" data-update="download" ${disabled}>↓ Download update</button>` : `<button class="update-primary" data-update="check" ${disabled}>${state.phase === 'current' ? 'Check again' : 'Check for updates'}</button>`}${state.busy ? '<button class="update-secondary" data-update="cancel">Cancel</button>' : ''}${state.hasRollback ? `<button class="update-secondary" data-update="rollback" ${disabled}>Restore v${escape(state.rollbackVersion)}</button>` : ''}</div><div class="update-footer"><span>Your boards and attachments stay in place.</span>${state.source === 'sandbox' && (state.currentVersion !== state.baseVersion || state.hasRollback || state.ready) ? `<button data-update="reset" ${disabled}>Reset sandbox</button>` : ''}</div>`;
  }
  async function api(action, body = {}) {
    const response = await fetch(
      '/api/updates/' + action,
      action === 'status'
        ? { cache: 'no-store' }
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Sparkboard-Token': token },
            body: JSON.stringify(body),
          },
    );
    const value = await response.json();
    if (value.csrfToken) token = value.csrfToken;
    if (!response.ok) throw Error(value.error || 'The updater could not complete this request.');
    return value;
  }
  async function refresh() {
    try {
      state = await api('status');
      render();
      if (state.busy && !poller) poller = setInterval(refresh, 750);
      if (!state.busy && poller) {
        clearInterval(poller);
        poller = null;
      }
    } catch (e) {
      error = e.message;
      render();
      if (poller) {
        clearInterval(poller);
        poller = null;
      }
    }
  }
  async function open() {
    dialog.showModal();
    render();
    await refresh();
    mode = state?.source || 'sandbox';
    repository = state?.repository || '';
    render();
  }
  async function run(action) {
    if (action === 'close') {
      dialog.close();
      return;
    }
    if (acting && action !== 'cancel') return;
    error = '';
    acting = true;
    render();
    try {
      if (
        ['install', 'rollback', 'reset'].includes(action) &&
        typeof window.sparkboardBeforeUpdate === 'function'
      )
        await window.sparkboardBeforeUpdate();
      if (action === 'cancel') {
        await api('cancel');
        await refresh();
        return;
      }
      const operation = api(action, action === 'configure' ? { source: mode, repository } : {});
      if (['download', 'check'].includes(action)) {
        if (poller) clearInterval(poller);
        poller = setInterval(refresh, 750);
      }
      state = await operation;
      if (action === 'configure') {
        mode = state.source;
        repository = state.repository;
      }
      if (['install', 'rollback', 'reset'].includes(action)) {
        window.location.reload();
        return;
      }
    } catch (e) {
      error = e.message;
      await refresh();
    } finally {
      acting = false;
      if (poller && !state?.busy) {
        clearInterval(poller);
        poller = null;
      }
      render();
    }
  }
  button.onclick = open;
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close();
      return;
    }
    const button = e.target.closest('button');
    if (!button) return;
    if (button.dataset.source) {
      mode = button.dataset.source;
      render();
    }
    if (button.dataset.update) run(button.dataset.update);
  });
  dialog.addEventListener('input', (e) => {
    if (e.target.id === 'update-repository') {
      repository = e.target.value;
      const section = dialog.querySelector('.update-source');
      if (!section.querySelector('[data-update="configure"]'))
        section.insertAdjacentHTML(
          'beforeend',
          '<button class="update-secondary" data-update="configure">Save update source</button>',
        );
    }
  });
  dialog.addEventListener('keydown', (e) => e.stopPropagation());
  dialog.addEventListener('close', () => {
    if (poller) {
      clearInterval(poller);
      poller = null;
    }
  });
})();
