/** Convert portable backup data to a binary IndexedDB value, once on insertion. */
export function dataURLToBlob(source) {
  const match =
    /^data:(image\/(?:png|jpeg|webp|gif)|application\/pdf);base64,([a-z0-9+/=]+)$/i.exec(source);
  if (!match) throw new Error('Unsupported attachment encoding.');
  const binary = atob(match[2]);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: match[1].toLowerCase() });
}

export async function blobToDataURL(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // Chunking avoids argument-count limits for larger PDFs.
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

export async function mediaID(blob) {
  const prefix = new TextEncoder().encode(`${blob.type}\0`);
  const content = new Uint8Array(await blob.arrayBuffer());
  const input = new Uint8Array(prefix.length + content.length);
  input.set(prefix);
  input.set(content, prefix.length);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
  return 'media-' + [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
