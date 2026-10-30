import { dataURLToBlob } from './storage/media-codec.js';

let library;
const viewers = new Set();

async function pdfLibrary() {
  library ??= import('../assets/pdfjs/pdf.mjs').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      '../assets/pdfjs/pdf-worker.mjs',
      import.meta.url,
    ).href;
    return pdfjs;
  });
  return library;
}

export function disposePDFViewers() {
  for (const viewer of viewers) viewer.dispose();
  viewers.clear();
}

/** Local PDF rendering avoids browser plug-ins and keeps attachment bytes on device. */
export async function mountPDF(body, item) {
  let task,
    document,
    disposed = false,
    rendering = false,
    pageNumber = 1;
  const holder = window.document.createElement('div');
  holder.className = 'pdf-viewer';
  holder.dataset.open = 'true';
  holder.innerHTML =
    '<div class="pdf-page"><p role="status">Opening PDF…</p></div><div class="pdf-pagination"><button aria-label="Previous PDF page" disabled>‹</button><span role="status">Loading…</span><button aria-label="Next PDF page" disabled>›</button><a>Download</a></div>';
  body.replaceChildren(holder);
  const pageHost = holder.querySelector('.pdf-page');
  const [previous, next] = holder.querySelectorAll('button');
  const status = holder.querySelector('.pdf-pagination span');
  const download = holder.querySelector('a');
  download.href = item.src;
  download.download = item.text || 'document.pdf';
  const viewer = {
    dispose() {
      disposed = true;
      task?.destroy();
      viewers.delete(viewer);
    },
  };
  viewers.add(viewer);
  const paint = async () => {
    if (disposed || !holder.isConnected || rendering) return;
    rendering = true;
    previous.disabled = next.disabled = true;
    try {
      const page = await document.getPage(pageNumber);
      if (disposed || !holder.isConnected) return;
      const scale = Math.min(
        2,
        Math.max(1, ((item.w - 24) / page.getViewport({ scale: 1 }).width) * 2),
      );
      const viewport = page.getViewport({ scale });
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.setAttribute('aria-label', `${item.text}, page ${pageNumber}`);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      if (!disposed && holder.isConnected) {
        pageHost.replaceChildren(canvas);
        status.textContent = `${pageNumber} / ${document.numPages}`;
      }
    } finally {
      rendering = false;
      previous.disabled = pageNumber <= 1;
      next.disabled = pageNumber >= document.numPages;
    }
  };
  previous.onclick = () => {
    pageNumber--;
    paint().catch(showError);
  };
  next.onclick = () => {
    pageNumber++;
    paint().catch(showError);
  };
  function showError(error) {
    if (disposed || !holder.isConnected) return;
    pageHost.textContent =
      error.name === 'PasswordException'
        ? 'This PDF needs a password. Download it to open it.'
        : 'This PDF could not be previewed. Download it to open it.';
    status.textContent = 'Preview unavailable';
    previous.disabled = next.disabled = true;
  }
  try {
    const pdfjs = await pdfLibrary();
    if (disposed || !holder.isConnected) return;
    const data = new Uint8Array(await dataURLToBlob(item.src).arrayBuffer());
    if (disposed || !holder.isConnected) return;
    task = pdfjs.getDocument({
      data,
      isEvalSupported: false,
      enableXfa: false,
      cMapUrl: new URL('../assets/pdfjs/cmaps/', import.meta.url).href,
      cMapPacked: true,
      standardFontDataUrl: new URL('../assets/pdfjs/standard_fonts/', import.meta.url).href,
      wasmUrl: new URL('../assets/pdfjs/wasm/', import.meta.url).href,
    });
    document = await task.promise;
    await paint();
  } catch (error) {
    showError(error);
  }
  return viewer;
}
