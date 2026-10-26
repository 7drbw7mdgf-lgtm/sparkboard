import { toast } from './notifications.js';
import { importBoard } from './boards.js';
import { state } from './state.js';
import { $, M, uid } from './core.js';
export function setupImporting() {
  $('#import-file').onchange = async (e) => {
    let file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 60 * 1024 * 1024) throw Error();
      const parsed = M.validateBoard(JSON.parse(await file.text()));
      await importBoard(parsed);
      $('#dialog').close();
      toast('Board imported successfully');
    } catch (error) {
      toast(error.message || 'This is not a valid Sparkboard backup.');
    }
    e.target.value = '';
  };
}
