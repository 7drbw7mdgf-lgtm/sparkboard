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
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg><span>Updates</span><i class="update-badge-dot" hidden></i>';
  const header = document.querySelector('.header-actions');
  header.append(button);

  const banner = document.createElement('aside');
  banner.id = 'update-banner';
  banner.setAttribute('aria-label', 'Update ready');
  banner.hidden = true;
  banner.innerHTML =
    '<span class="update-banner-spark">✳</span><b id="update-banner-text">Sparkboard update is ready</b><button id="update-banner-restart" class="update-primary">Restart &amp; update</button><button id="update-banner-details" class="update-secondary">Details</button>';
  document.body.append(banner);

  const overlay = document.createElement('div');
  overlay.id = 'update-restart-overlay';
  overlay.setAttribute('role', 'status');
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="update-overlay-card"><span class="update-app-icon">✳</span><b id="update-overlay-title">Saving your boards before restarting…</b><p>Your workspace and attachments stay on this device.</p></div>';
  document.body.append(overlay);

  const dialog = document.createElement('dialog');
  dialog.id = 'updates-dialog';
  dialog.setAttribute('aria-label', 'Sparkboard updates');
  document.body.append(dialog);

  let state = null,
    token = '',
    acting = false,
    savingStage = '',
    error = '',
    mode = 'github',
    repository = '7drbw7mdgf-lgtm/sparkboard',
    poller = null;

  const labels = {
    idle: 'Automatic updates enabled',
    checking: 'Checking GitHub for updates…',
    available: 'A fresh version is available',
    downloading: 'Downloading update…',
    verifying: 'Verifying publisher signature…',
    ready: 'Downloaded and verified · Ready to restart',
    installed: 'You’re on the new version',
    current: 'Sparkboard is up to date',
    restored: 'Previous version restored',
    error: 'Couldn’t finish the update',
  };

  const bytes = (n) =>
    n < 1024
      ? `${n} B`
      : n < 1024 * 1024
        ? `${Math.round(n / 1024)} KB`
        : `${(n / 1024 / 1024).toFixed(1)} MB`;

  function setFreeze(frozen, message = 'Saving your boards before restarting…') {
    const title = document.getElementById('update-overlay-title');
    if (title) title.textContent = message;
    overlay.hidden = !frozen;
    const canvas = document.getElementById('canvas');
    if (canvas) canvas.inert = frozen;
  }

  function updateIndicators() {
    const dot = button.querySelector('.update-badge-dot');
    const hasUpdate = !!(state?.available || state?.ready);
    if (dot) dot.hidden = !hasUpdate;
    button.classList.toggle('has-update', hasUpdate);
    const readyVersion = state?.available?.version || state?.availableVersion || '';
    const showBanner = !!(state?.ready && !savingStage);
    banner.hidden = !showBanner;
    if (showBanner) {
      document.getElementById('update-banner-text').textContent = readyVersion
        ? `Sparkboard ${readyVersion} is ready`
        : 'Sparkboard update is ready';
    }
  }

  function render() {
    updateIndicators();
    if (!dialog.open) return;
    if (!state) {
      dialog.innerHTML = `<div class="update-heading"><h2>App updates</h2><button data-update="close" aria-label="Close updates">×</button></div><p class="update-copy">${escape(error || 'Loading update settings…')}</p>`;
      return;
    }
    const busy = acting || state.busy || !!savingStage,
      disabled = busy ? 'disabled' : '',
      progress = state.progress || {},
      percent = progress.total
        ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
        : null,
      statusTitle =
        savingStage === 'saving'
          ? 'Saving your boards before restarting…'
          : savingStage === 'installing'
            ? 'Installing the update and restarting Sparkboard…'
            : labels[state.phase] || labels.idle;

    dialog.innerHTML = `<div class="update-heading"><div><span class="update-eyebrow">BUILT-IN APP UPDATES</span><h2>Keep Sparkboard current.</h2></div><button data-update="close" aria-label="Close updates">×</button></div><div class="update-version"><div class="update-app-icon">✳</div><div><b>Sparkboard <span>v${escape(state.currentVersion)}</span></b><small>${state.source === 'sandbox' ? 'Local sandbox · no GitHub requests' : escape(state.repository || '7drbw7mdgf-lgtm/sparkboard')}</small></div><span class="update-mode-badge">${state.source === 'sandbox' ? 'SANDBOX' : 'GITHUB'}</span></div><label class="update-auto-row"><input id="update-auto" type="checkbox" ${state.autoDownload !== false ? 'checked' : ''} ${savingStage ? 'disabled' : ''}><span>Automatically download updates in the background</span></label><div class="update-source"><label class="update-label">UPDATE SOURCE</label><div class="update-tabs"><button data-source="github" aria-pressed="${mode === 'github'}" ${disabled}>GitHub releases</button><button data-source="sandbox" aria-pressed="${mode === 'sandbox'}" ${disabled}>Local sandbox</button></div>${mode === 'github' ? `<label class="update-repository-label">Repository<input id="update-repository" type="text" value="${escape(repository)}" placeholder="7drbw7mdgf-lgtm/sparkboard" aria-label="GitHub update repository" ${disabled}></label><p class="update-copy">Checks verified releases signed by Sparkboard’s publisher key.</p>` : '<p class="update-copy">Rehearse download, verified install, and rollback locally with no network requests.</p>'}${mode !== state.source || (mode === 'github' && repository !== state.repository) ? `<button class="update-secondary" data-update="configure" ${disabled}>Save update source</button>` : ''}</div><div class="update-status"><span class="update-status-dot ${busy ? 'working' : ''}"></span><div><b role="status">${escape(statusTitle)}</b><small>${state.lastChecked ? 'Last checked ' + escape(new Date(state.lastChecked).toLocaleString()) : 'Checks GitHub automatically when opened and every 6 hours.'}</small></div></div>${state.available ? `<section class="update-release"><div class="update-release-title"><b>Version ${escape(state.available.version)}</b><span>${bytes(state.available.size || 0)}</span></div><p>${escape(state.available.notes || 'A new Sparkboard release is ready.')}</p>${state.ready ? '<div class="update-verified">✓ Publisher signature verified<br>✓ Every file passed its SHA-256 check<br>✓ Boards are saved before restart &amp; previous version stays available</div>' : ''}${state.available.url ? `<a href="${escape(state.available.url)}" target="_blank" rel="noopener noreferrer">View release on GitHub ↗</a>` : ''}</section>` : ''}${state.busy && ['downloading', 'verifying'].includes(state.phase) ? `<div class="update-progress"><progress ${percent !== null ? `value="${percent}"` : ''} max="100"></progress><span>${percent !== null ? percent + '%' : bytes(progress.downloaded || 0)}</span></div>` : ''}${error || state.error ? `<p class="update-error" role="alert">${escape(error || state.error)}</p>` : ''}<div class="update-actions">${state.ready ? `<button class="update-primary" data-update="install" ${disabled}>Restart &amp; update ↗</button>` : state.available ? `<button class="update-primary" data-update="download" ${disabled}>↓ Download update</button>` : `<button class="update-primary" data-update="check" ${disabled}>${state.phase === 'current' ? 'Check again' : 'Check for updates'}</button>`}${state.busy ? '<button class="update-secondary" data-update="cancel">Cancel</button>' : ''}${state.hasRollback ? `<button class="update-secondary" data-update="rollback" ${disabled}>Restore v${escape(state.rollbackVersion)}</button>` : ''}</div><div class="update-footer"><span>Your boards and attachments stay in place.</span>${state.source === 'sandbox' && (state.currentVersion !== state.baseVersion || state.hasRollback || state.ready) ? `<button data-update="reset" ${disabled}>Reset sandbox</button>` : ''}</div>`;
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
      if (state.busy && !poller) poller = setInterval(refresh, 600);
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
    mode = state?.source || 'github';
    repository = state?.repository || '7drbw7mdgf-lgtm/sparkboard';
    render();
  }

  async function run(action, { silent = false } = {}) {
    if (action === 'close') {
      dialog.close();
      return;
    }
    if ((acting || savingStage) && action !== 'cancel') return;
    if (!silent) error = '';
    acting = true;
    render();
    try {
      if (action === 'cancel') {
        await api('cancel');
        await refresh();
        return;
      }
      if (['install', 'rollback', 'reset'].includes(action)) {
        savingStage = 'saving';
        setFreeze(true, 'Saving your boards before restarting…');
        render();
        if (typeof window.sparkboardBeforeUpdate === 'function') {
          await window.sparkboardBeforeUpdate();
        }
        savingStage = 'installing';
        setFreeze(
          true,
          action === 'install'
            ? 'Installing the update and restarting Sparkboard…'
            : 'Restoring previous version and restarting…',
        );
        render();
        state = await api(action);
        window.location.reload();
        return;
      }
      const operation = api(action, action === 'configure' ? { source: mode, repository } : {});
      if (['download', 'check'].includes(action)) {
        if (poller) clearInterval(poller);
        poller = setInterval(refresh, 600);
      }
      state = await operation;
      if (action === 'configure') {
        mode = state.source;
        repository = state.repository;
      }
      if (action === 'check' && state.available && !state.ready && state.autoDownload !== false) {
        acting = false;
        await run('download', { silent });
        return;
      }
    } catch (e) {
      savingStage = '';
      setFreeze(false);
      if (!silent) error = e.message;
      await refresh();
    } finally {
      acting = false;
      savingStage = '';
      if (poller && !state?.busy) {
        clearInterval(poller);
        poller = null;
      }
      render();
    }
  }

  async function setAutoDownload(autoDownload) {
    try {
      state = await api('preferences', { autoDownload });
      error = '';
      render();
      if (autoDownload && !acting && !state.busy && state.available && !state.ready) {
        await run('download', { silent: true });
      }
    } catch (e) {
      error = e.message;
      render();
    }
  }

  async function backgroundCheck() {
    if (acting || savingStage || state?.busy) return;
    await run('check', { silent: true });
  }

  button.onclick = open;
  document.getElementById('update-banner-restart').onclick = () => run('install');
  document.getElementById('update-banner-details').onclick = open;

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close();
      return;
    }
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.source) {
      mode = btn.dataset.source;
      render();
    }
    if (btn.dataset.update) run(btn.dataset.update);
  });

  dialog.addEventListener('change', (e) => {
    if (e.target.id === 'update-auto') {
      setAutoDownload(e.target.checked);
    }
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

  (async () => {
    try {
      await refresh();
      mode = state?.source || 'github';
      repository = state?.repository || '7drbw7mdgf-lgtm/sparkboard';
      setTimeout(() => backgroundCheck(), 2000);
      setInterval(
        () => {
          if (document.visibilityState !== 'hidden') backgroundCheck();
        },
        6 * 60 * 60 * 1000,
      );
    } catch {
      /* Initial status check is best-effort. */
    }
  })();
})();
