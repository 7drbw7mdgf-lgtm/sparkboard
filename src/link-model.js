/** Accept ordinary pasted website addresses while rejecting non-web schemes. */
export function normalizeWebAddress(value) {
  const input = String(value || '').trim();
  if (!input || input.length > 2048 || /\s/.test(input)) return null;
  const explicit = /^https?:\/\//i.test(input);
  const hostWithPort = /^[^/:]+:\d+(?:[/?#]|$)/.test(input);
  if (!explicit && !hostWithPort && /^[a-z][a-z\d+.-]*:/i.test(input)) return null;
  if (/^\/(?!\/)/.test(input)) return null;
  try {
    const url = new URL(
      explicit ? input : input.startsWith('//') ? 'https:' + input : 'https://' + input,
    );
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (
      !explicit &&
      !url.hostname.includes('.') &&
      url.hostname !== 'localhost' &&
      !url.hostname.startsWith('[')
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
