/** Only generate known player URLs. Pasted HTML and arbitrary iframe URLs are never used. */
export function resolveEmbed(kind, value) {
  const input = String(value || '').trim();
  if (!input) return null;
  if (kind === 'map') {
    if (input.length > 2000 || /[<>]/.test(input)) return null;
    let place = input;
    if (/^https?:\/\//i.test(input)) {
      let shared;
      try {
        shared = new URL(input);
      } catch {
        return null;
      }
      if (
        shared.protocol !== 'https:' ||
        shared.username ||
        shared.password ||
        shared.port ||
        !['google.com', 'www.google.com', 'maps.google.com'].includes(shared.hostname)
      )
        return null;
      if (shared.pathname === '/maps/embed' && shared.searchParams.has('pb'))
        return { kind, url: shared.href, label: 'Google map' };
      if (!shared.pathname.startsWith('/maps') && shared.hostname !== 'maps.google.com')
        return null;
      place =
        shared.searchParams.get('q') ||
        shared.searchParams.get('query') ||
        /@(-?[\d.]+,-?[\d.]+)/.exec(shared.pathname)?.[1];
      if (!place) {
        const match = /\/place\/([^/]+)/.exec(shared.pathname);
        if (match) {
          try {
            place = decodeURIComponent(match[1].replace(/\+/g, ' '));
          } catch {
            return null;
          }
        }
      }
      if (!place) return null;
    }
    return {
      kind,
      url: `https://maps.google.com/maps?q=${encodeURIComponent(place)}&output=embed`,
      label: place,
    };
  }
  let url;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (kind === 'pdf') {
    if (!/\.pdf$/i.test(url.pathname)) return null;
    return {
      kind,
      url: url.href,
      label: url.pathname.split('/').pop() || 'PDF document',
    };
  }
  if (kind !== 'video') return null;
  let id;
  if (
    [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'youtube-nocookie.com',
      'www.youtube-nocookie.com',
    ].includes(host)
  ) {
    id =
      url.pathname === '/watch'
        ? url.searchParams.get('v')
        : /^\/(?:embed|shorts)\/([^/]+)/.exec(url.pathname)?.[1];
  } else if (host === 'youtu.be') id = url.pathname.slice(1);
  if (id && /^[a-zA-Z0-9_-]{11}$/.test(id))
    return { kind, url: `https://www.youtube-nocookie.com/embed/${id}`, label: 'YouTube video' };
  if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
    id = /^\/(?:video\/)?(\d+)\/?$/.exec(url.pathname)?.[1];
    if (id) return { kind, url: `https://player.vimeo.com/video/${id}`, label: 'Vimeo video' };
  }
  return null;
}
