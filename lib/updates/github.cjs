'use strict';
const { MAX_PACKAGE } = require('./package.cjs');
function repoName(value) {
  const input = String(value || '').trim();
  let repo = input;
  if (input.startsWith('https://')) {
    const u = new URL(input);
    if (u.hostname !== 'github.com' || u.username || u.password || u.search || u.hash)
      throw Error('Use a github.com repository URL.');
    repo = u.pathname.replace(/^\/|\/$/g, '').replace(/\.git$/, '');
  }
  if (!/^[a-z\d](?:[a-z\d-]{0,38})\/[a-z\d_.-]{1,100}$/i.test(repo) || repo.split('/')[1] === '..')
    throw Error('Enter a GitHub repository as owner/name.');
  return repo;
}
function permittedURL(value) {
  const u = new URL(value);
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    u.port ||
    ![
      'api.github.com',
      'github.com',
      'objects.githubusercontent.com',
      'release-assets.githubusercontent.com',
    ].includes(u.hostname)
  )
    throw Error('The update download must come from GitHub.');
  return u;
}
async function fetchBytes(url, { signal, max = MAX_PACKAGE, onProgress = () => {} } = {}) {
  let current = permittedURL(url);
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await fetch(current, {
      signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'Sparkboard-Updater',
        Accept:
          current.hostname === 'api.github.com'
            ? 'application/vnd.github+json'
            : 'application/octet-stream',
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      current = permittedURL(new URL(response.headers.get('location'), current).href);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw Error(
        response.status === 404
          ? 'No public release was found at this repository.'
          : `GitHub could not provide the release (HTTP ${response.status}).`,
      );
    }
    const total = Number(response.headers.get('content-length')) || null;
    if (total && total > max) {
      await response.body?.cancel();
      throw Error('The GitHub response is too large.');
    }
    let downloaded = 0;
    const chunks = [];
    for await (const chunk of response.body) {
      downloaded += chunk.length;
      if (downloaded > max) throw Error('The GitHub response exceeded the size limit.');
      chunks.push(Buffer.from(chunk));
      onProgress(downloaded, total);
    }
    return Buffer.concat(chunks);
  }
  throw Error('GitHub returned too many redirects.');
}
module.exports = {
  repoName,
  permittedURL,
  fetchBytes,
};
