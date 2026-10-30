import { save } from './boards.js';
import { setTool } from './tools.js';
import { commit } from './history.js';
import { $, node } from './core.js';
import { toast } from './notifications.js';
import { state } from './state.js';
import { centerPoint, point } from './viewport.js';
export function readFile(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}
export async function imageData(file) {
  let src = await readFile(file);
  const image = new Image();
  image.src = src;
  await image.decode();
  const ratio = Math.min(1, 1400 / image.naturalWidth, 1400 / image.naturalHeight),
    canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    src: canvas.toDataURL('image/webp', 0.86),
    w: canvas.width,
    h: canvas.height,
  };
}
export async function insertFiles(files, p = centerPoint()) {
  const boardId = state.board.id,
    items = [];
  toast('Adding files to your board…');
  for (const [index, file] of [...files].entries()) {
    if (file.size > 12 * 1024 * 1024) {
      toast(`${file.name}: choose a file under 12 MB`);
      continue;
    }
    try {
      if (/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
        let image = await imageData(file),
          w = Math.min(360, image.w),
          h = (w * image.h) / image.w;
        items.push(
          node('image', p.x + index * 28, p.y + index * 28, w, h, file.name, '#ffffff', {
            src: image.src,
          }),
        );
      } else if (file.type === 'application/pdf') {
        let src = await readFile(file);
        items.push(
          node(
            'file',
            p.x - 210 + index * 28,
            p.y - 240 + index * 28,
            420,
            480,
            file.name,
            '#ffffff',
            {
              src,
              size: file.size,
            },
          ),
        );
      } else toast(`${file.name}: use PNG, JPEG, WebP, GIF or PDF`);
    } catch {
      toast(`Could not add ${file.name}`);
    }
  }
  if (state.board.id !== boardId) {
    toast('Board changed. Please add the files again.');
    return;
  }
  if (!items.length) return;
  commit(() => {
    state.board.objects.push(...items);
    state.selected = new Set(items.map((n) => n.id));
  });
  setTool('select');
  await save();
  toast(`${items.length} ${items.length === 1 ? 'file' : 'files'} added`);
}
export let dragDepth = 0;
export function setupMedia() {
  $('#media-file').onchange = (e) => {
    insertFiles(e.target.files);
    e.target.value = '';
  };
  $('#canvas').addEventListener('dragenter', (e) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      dragDepth++;
      $('#drop-hint').hidden = false;
    }
  });
  $('#canvas').addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  });
  $('#canvas').addEventListener('dragleave', () => {
    if (--dragDepth <= 0) {
      dragDepth = 0;
      $('#drop-hint').hidden = true;
    }
  });
  $('#canvas').addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    $('#drop-hint').hidden = true;
    insertFiles(e.dataTransfer.files, point(e));
  });
}
