import { mountPDF } from './pdf-viewer.js';
import { resolveEmbed } from './embed-model.js';
import { state } from './state.js';
import { $, esc, node } from './core.js';
import { svgIcon } from './icons.js';
import { modal } from './dialogs.js';
import { commit } from './history.js';
import { centerPoint } from './viewport.js';

export function embedDialog(existing) {
  modal(
    existing ? 'Edit embed' : 'Bring your world to the board.',
    `
    <form id="embed-form" class="modal-form">
      <div class="embed-choices" role="group" aria-label="Embed type">
        ${[
          ['video', 'Video'],
          ['map', 'Map'],
          ['pdf', 'PDF'],
        ]
          .map(
            ([kind, label]) =>
              `<button type="button" data-embed-kind="${kind}" aria-pressed="${(existing?.embedKind || 'video') === kind}">${svgIcon(kind === 'video' ? 'embed' : kind)}${label}</button>`,
          )
          .join('')}
      </div>
      <label><span id="embed-input-label">Video link</span><input id="embed-url" type="text" required maxlength="2000" value="${esc(existing?.url || '')}" autofocus></label>
      <p id="embed-help" class="panel-description"></p>
      <label>Title <span class="optional">(optional)</span><input id="embed-title" maxlength="200" placeholder="Give it a name" value="${esc(existing?.text || '')}"></label>
      <p class="embed-privacy">Embeds connect to their provider when you activate them. You can move and resize them like any other item.</p>
      <p id="embed-error" role="alert"></p>
      <div class="embed-submit"><button type="button" id="upload-pdf">Upload a PDF instead</button><button class="primary" type="submit">${existing ? 'Save changes' : 'Add to board'}</button></div>
    </form>`,
    'EMBED & EXPLORE',
  );
  let kind = existing?.embedKind || 'video';
  const update = () => {
    for (const button of document.querySelectorAll('[data-embed-kind]'))
      button.setAttribute('aria-pressed', String(button.dataset.embedKind === kind));
    $('#embed-input-label').textContent = {
      video: 'Video link',
      map: 'Place or map link',
      pdf: 'PDF link',
    }[kind];
    $('#embed-url').placeholder = {
      video: 'YouTube or Vimeo URL',
      map: 'e.g. London, UK or 51.5074, -0.1278',
      pdf: 'https://example.com/document.pdf',
    }[kind];
    $('#embed-help').textContent = {
      video: 'Paste a YouTube or Vimeo link to add a playable video.',
      map: 'Enter a place, coordinates, or a full Google Maps link.',
      pdf: 'Use a direct HTTPS link ending in .pdf, or upload a file from your device.',
    }[kind];
    $('#upload-pdf').hidden = kind !== 'pdf';
    $('#embed-error').textContent = '';
  };
  document.querySelectorAll('[data-embed-kind]').forEach(
    (button) =>
      (button.onclick = () => {
        kind = button.dataset.embedKind;
        update();
      }),
  );
  $('#upload-pdf').onclick = () => {
    $('#dialog').close();
    const input = $('#media-file');
    input.accept = 'application/pdf';
    input.click();
  };
  $('#embed-form').onsubmit = (event) => {
    event.preventDefault();
    const value = $('#embed-url').value.trim();
    let resolved;
    try {
      resolved = resolveEmbed(kind, value);
    } catch {
      /* Invalid encoded URL. */
    }
    if (!resolved) {
      $('#embed-error').textContent = {
        video: 'Use a valid HTTPS YouTube or Vimeo video link.',
        map: 'Enter a place, coordinates, or a full Google Maps link (not a shortened link).',
        pdf: 'Use a direct HTTPS PDF link ending in .pdf, or upload the file.',
      }[kind];
      return;
    }
    const title = $('#embed-title').value.trim() || resolved.label;
    const p = centerPoint();
    commit(() => {
      if (existing) Object.assign(existing, { embedKind: kind, url: value, text: title });
      else {
        const item = node('embed', p.x - 240, p.y - 170, 480, 340, title, '#ffffff', {
          embedKind: kind,
          url: value,
        });
        state.board.objects.push(item);
        state.selected = new Set([item.id]);
      }
    });
    $('#dialog').close();
  };
  update();
}

export function embedContents(item) {
  const kind = item.type === 'file' ? 'pdf' : item.embedKind;
  const label = { pdf: 'PDF document', video: 'Video', map: 'Interactive map' }[kind] || 'Embed';
  return `<div class="embed-heading">${svgIcon(kind === 'video' ? 'embed' : kind)}<b>${esc(item.text || label)}</b><span>${label}</span></div><div class="embed-body"><button class="embed-activate" data-open="true" data-activate-embed="${esc(item.id)}">${svgIcon(kind === 'video' ? 'embed' : kind)}<b>${kind === 'video' ? 'Play video' : kind === 'map' ? 'Explore map' : 'View PDF'}</b><span>${kind === 'pdf' && item.type === 'file' ? 'Stored on this device' : 'Click to load embedded content'}</span></button></div>`;
}

/** Activation keeps external requests intentional and canvas dragging predictable. */
export function setupEmbeds() {
  $('#objects').addEventListener('click', (event) => {
    const button = event.target.closest('[data-activate-embed]');
    if (!button) return;
    const item = state.board.objects.find((item) => item.id === button.dataset.activateEmbed);
    if (!item) return;
    const body = button.parentElement;
    let viewer;
    if (item.type === 'file') {
      if (!/^data:application\/pdf;base64,[a-z0-9+/=]+$/i.test(item.src)) return;
      mountPDF(body, item);
      return;
    } else {
      const resolved = resolveEmbed(item.embedKind, item.url);
      if (!resolved) return;
      viewer = document.createElement('iframe');
      viewer.src = resolved.url;
      viewer.title = item.text || resolved.label;
      viewer.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
      viewer.allow = 'fullscreen; picture-in-picture';
      viewer.allowFullscreen = true;
      viewer.referrerPolicy = 'strict-origin-when-cross-origin';
    }
    viewer.setAttribute('data-open', 'true');
    body.replaceChildren(viewer);
    const done = document.createElement('button');
    done.className = 'embed-done';
    done.dataset.open = 'true';
    done.textContent = 'Done interacting';
    done.onclick = () => {
      const template = document.createElement('template');
      template.innerHTML = embedContents(item);
      body.replaceChildren(...template.content.querySelector('.embed-body').childNodes);
    };
    body.append(done);
  });
}
