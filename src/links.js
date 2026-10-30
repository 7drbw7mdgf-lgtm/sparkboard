import { normalizeWebAddress } from './link-model.js';
import { setTool } from './tools.js';
import { state } from './state.js';
import { commit } from './history.js';
import { centerPoint } from './viewport.js';
import { $, esc, node } from './core.js';
import { modal } from './dialogs.js';
export function linkDialog(existing) {
  if (!state.board) return;
  modal(
    existing ? 'Edit link' : 'Bring a little of the web in.',
    `<form id="link-form" class="modal-form"><label>Web address<input id="link-url" type="text" inputmode="url" autocapitalize="off" spellcheck="false" maxlength="2048" required placeholder="example.com or https://example.com" value="${esc(existing?.url || '')}" autofocus></label><label>Title<input id="link-title" type="text" maxlength="200" placeholder="A useful resource" value="${esc(existing?.text || '')}"></label><p class="panel-description">A link card opens the original website in a new tab.</p><p id="link-error" role="alert"></p><button class="primary" type="submit">${existing ? 'Save link' : 'Add to board'} ↗</button></form>`,
    'LINK CARD',
  );
  $('#link-url').oninput = () => {
    $('#link-url').removeAttribute('aria-invalid');
    $('#link-error').textContent = '';
  };
  $('#link-form').onsubmit = (e) => {
    e.preventDefault();
    const url = normalizeWebAddress($('#link-url').value);
    if (!url) {
      $('#link-error').textContent =
        'Enter a website address such as example.com or https://example.com.';
      $('#link-url').setAttribute('aria-invalid', 'true');
      $('#link-url').focus();
      return;
    }
    const text = $('#link-title').value.trim() || new URL(url).hostname,
      p = centerPoint();
    commit(() => {
      if (existing) {
        existing.url = url;
        existing.text = text;
      } else {
        let n = node('link', p.x - 145, p.y - 90, 290, 180, text, '#ffffff', {
          url,
        });
        state.board.objects.push(n);
        state.selected = new Set([n.id]);
      }
    });
    setTool('select');
    $('#dialog').close();
  };
}
