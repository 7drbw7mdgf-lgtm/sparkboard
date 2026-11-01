import { setupEmbeds } from './src/embeds.js';
import { init } from './src/boards.js';
import { setupTools } from './src/tools.js';
import { setupCanvas } from './src/canvas.js';
import { setupViewport } from './src/viewport.js';
import { setupMedia } from './src/media.js';
import { setupClipboard } from './src/clipboard.js';
import { setupScenes } from './src/scenes.js';
import { setupDialogs, modal } from './src/dialogs.js';
import { setupImporting } from './src/importing.js';
import { setupControls } from './src/controls.js';
import { setupAuth } from './src/auth.js';
import { setupStartupScreen } from './src/startup-screen.js';
import { setupMobileGestures } from './src/mobile-gestures.js';
import { setupMindmapWorkspace } from './src/mindmap.js';

const startup = setupStartupScreen();

setupTools();
setupCanvas();
setupViewport();
setupMobileGestures();
setupMedia();
setupEmbeds();
setupClipboard();
setupScenes();
setupDialogs();
setupImporting();
setupControls();
setupMindmapWorkspace();

init()
  .then(() => setupAuth(startup))
  .catch((error) => {
    startup.dismiss();
    document.querySelector('#saved').textContent = 'Storage could not be opened';
    document.querySelector('#canvas').removeAttribute('aria-busy');
    modal('Your saved data is safe.', `<p id="storage-error"></p>`, 'STORAGE UNAVAILABLE');
    document.querySelector('#storage-error').textContent = error.message;
  });
